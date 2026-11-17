import { NOME_NIVEL, medidasPartes, nivelRisco, nomeSeveridade } from '../documentos/nivel-risco';
import { cabecalhoHtml, documentoHtml, escape, folhaHtml, Moldura, rodapeHtml } from '../documentos/layout';
import { ANEXOS_NR15, ANEXOS_NR16, GRAUS, Grau, ehGrau } from './conteudo';
import { CSS_SECOES, ExtrasDoc, blocoAssinaturas, controleDocumento, dataBr, identificacaoBasica, lista, p, secoesNumeradas, tabelaDuasColunas, tabelaReferencias } from '../documentos/secoes';

const TIPO: Record<string, string> = { FISICO: 'Físico', QUIMICO: 'Químico', BIOLOGICO: 'Biológico', ERGONOMICO: 'Ergonômico', ACIDENTE: 'Acidente' };
const simNao = (v: boolean | null) => (v === null ? '—' : v ? 'Sim' : 'Não');

export type AgenteLaudo = {
  tipo: string; agente: string; fonteGeradora: string; tipoAvaliacao: string | null; intensidade: string | null; limiteTolerancia: string | null;
  epcEficaz: boolean | null; epiEficaz: boolean | null; epiCa: string | null; anexoNr15: string | null; grauInsalubridade: string | null;
};
export type GheLaudo = {
  nome: string; descricao: string | null; cargos: string[]; colaboradores: number; agentes: AgenteLaudo[];
  periculosidadeAnexo: string | null; periculosidadeJustificativa: string | null;
};
export type Responsavel = { nome: string | null; registro: string | null };

const ORDEM: Grau[] = ['NAO', 'MINIMO', 'MEDIO', 'MAXIMO'];
const nomeAnexo15 = (a: string | null) => (a ? `Anexo ${a}${ANEXOS_NR15.find((x) => x.anexo === a) ? ` · ${ANEXOS_NR15.find((x) => x.anexo === a)!.nome}` : ''}` : '—');

// Grau que vale para o GHE: o mais alto, porque os adicionais não se somam (NR-15, item 15.3).
export function grauDoGhe(agentes: AgenteLaudo[]): Grau | null {
  const graus = agentes.map((a) => a.grauInsalubridade).filter((g): g is Grau => !!g && ehGrau(g));
  if (!graus.length) return null;
  return graus.reduce((maior, g) => (ORDEM.indexOf(g) > ORDEM.indexOf(maior) ? g : maior), 'NAO' as Grau);
}

function blocoInsalubridade(g: GheLaudo): string {
  const pendentes = g.agentes.filter((a) => !a.grauInsalubridade).length;
  const grau = grauDoGhe(g.agentes);
  const conclusao =
    grau && grau !== 'NAO'
      ? `<p class="conclusao sim"><strong>Insalubridade:</strong> caracterizada em ${GRAUS[grau].nome.toLowerCase()}, com adicional de ${GRAUS[grau].percentual}% (CLT, art. 192).</p>`
      : grau === 'NAO' && !pendentes
        ? '<p class="conclusao nao"><strong>Insalubridade:</strong> não caracterizada.</p>'
        : '<p class="conclusao pendente"><strong>Insalubridade:</strong> a avaliação ainda não foi concluída.</p>';
  return `
    <h4>Insalubridade (NR-15)</h4>
    ${
      g.agentes.length
        ? `<table>
      <thead><tr><th>Tipo</th><th>Agente</th><th>Fonte</th><th>Anexo NR-15</th><th>Resultado</th><th>Limite</th><th>EPC eficaz</th><th>EPI eficaz (CA)</th><th>Grau</th></tr></thead>
      <tbody>${g.agentes
        .map(
          (a) => `<tr><td>${TIPO[a.tipo] ?? a.tipo}</td><td>${escape(a.agente)}</td><td>${escape(a.fonteGeradora)}</td><td>${escape(nomeAnexo15(a.anexoNr15))}</td>
          <td>${escape(a.tipoAvaliacao === 'QUALITATIVA' ? 'Qualitativa' : a.intensidade)}</td><td>${escape(a.limiteTolerancia)}</td>
          <td>${simNao(a.epcEficaz)}</td><td>${simNao(a.epiEficaz)}${a.epiCa ? ` (${escape(a.epiCa)})` : ''}</td>
          <td>${a.grauInsalubridade && ehGrau(a.grauInsalubridade) ? GRAUS[a.grauInsalubridade].nome : 'Não avaliado'}</td></tr>`,
        )
        .join('')}</tbody>
    </table>`
        : '<p>Não encontramos agente físico, químico ou biológico neste GHE.</p>'
    }
    ${pendentes ? `<p class="alerta">${pendentes} agente(s) ainda sem o grau de insalubridade definido.</p>` : ''}
    ${conclusao}`;
}

function blocoPericulosidade(g: GheLaudo): string {
  const anexo = ANEXOS_NR16.find((a) => a.codigo === g.periculosidadeAnexo);
  const conclusao = anexo
    ? `<p class="conclusao sim"><strong>Periculosidade:</strong> caracterizada (NR-16, ${anexo.anexo}: ${escape(anexo.nome)}), com adicional de 30% sobre o salário (CLT, art. 193).</p>`
    : g.periculosidadeAnexo === 'NENHUM'
      ? '<p class="conclusao nao"><strong>Periculosidade:</strong> não caracterizada. Nenhuma atividade se encaixa nos anexos da NR-16.</p>'
      : '<p class="conclusao pendente"><strong>Periculosidade:</strong> a avaliação ainda não foi concluída.</p>';
  return `
    <h4>Periculosidade (NR-16)</h4>
    ${g.periculosidadeJustificativa ? `<p><strong>Fundamentação:</strong> ${escape(g.periculosidadeJustificativa)}</p>` : ''}
    ${conclusao}`;
}

export function laudoHtml(moldura: Moldura, ghes: GheLaudo[], partes: { insalubridade: boolean; periculosidade: boolean }, responsavel: Responsavel, extras: ExtrasDoc): string {
  const nomeEmpresa = escape(extras.empresa.razaoSocial);
  const total = ghes.reduce((t, g) => t + g.colaboradores, 0) || extras.empresa.numFuncionarios;
  const doQue = [partes.insalubridade && 'insalubridade', partes.periculosidade && 'periculosidade'].filter(Boolean).join(' e ');
  const blocos = ghes
    .map(
      (g) => `
      <section class="ghe">
        <h3 class="ghe-nome">${escape(g.nome)} <span class="meta">${g.colaboradores} colaborador(es)</span></h3>
        ${g.descricao ? `<p>${escape(g.descricao).replace(/\n/g, '<br>')}</p>` : ''}
        <p><strong>Cargos:</strong> ${g.cargos.length ? g.cargos.map(escape).join(', ') : 'nenhum colaborador vinculado'}</p>
        ${partes.insalubridade ? blocoInsalubridade(g) : ''}
        ${partes.periculosidade ? blocoPericulosidade(g) : ''}
      </section>`,
    )
    .join('');

  const conclusao = ghes
    .map((g) => {
      const grau = grauDoGhe(g.agentes);
      const anexo = ANEXOS_NR16.find((a) => a.codigo === g.periculosidadeAnexo);
      const insal = grau && grau !== 'NAO' ? `${GRAUS[grau].nome} (${GRAUS[grau].percentual}%)` : grau === 'NAO' ? 'Não' : 'Em avaliação';
      const peri = anexo ? `Sim, ${anexo.anexo} (30%)` : g.periculosidadeAnexo === 'NENHUM' ? 'Não' : 'Em avaliação';
      return `<tr><td>${escape(g.nome)}</td><td>${g.cargos.length ? g.cargos.map(escape).join(', ') : '—'}</td>${partes.insalubridade ? `<td>${insal}</td>` : ''}<td>${peri}</td></tr>`;
    })
    .join('');

  const secoes = secoesNumeradas([
    { titulo: 'Controle do documento', html: controleDocumento(extras.controle) },
    { titulo: 'Identificação', html: identificacaoBasica(extras, total, responsavel) },
    {
      titulo: 'Introdução',
      html: p(
        `Alguns trabalhos dão direito a um adicional no salário porque expõem a pessoa a agentes que fazem mal à saúde (insalubridade) ou
        a situações com risco de morte, como eletricidade e inflamáveis (periculosidade). A CLT diz que só um laudo feito por engenheiro de
        segurança ou médico do trabalho pode dizer se esses adicionais são devidos (art. 195).`,
        `Este laudo avalia as atividades da ${nomeEmpresa} quanto à ${doQue}, grupo por grupo, e traz a conclusão para cada função.`,
      ),
    },
    {
      titulo: 'Objetivo',
      html: lista([
        partes.insalubridade && 'verificar, pelos anexos da NR-15, se há exposição a agentes insalubres acima dos limites e em qual grau;',
        partes.periculosidade && 'verificar, pelos anexos da NR-16, se alguma atividade ou área é considerada perigosa;',
        'avaliar se as proteções coletivas e os EPIs eliminam ou neutralizam o agente;',
        'concluir, para cada grupo e função, se o adicional é devido ou não.',
      ]),
    },
    {
      titulo: 'Referências legais',
      html: tabelaReferencias([
        ['CLT, art. 189 a 197', 'Atividades insalubres e perigosas, adicionais e perícia'],
        ...(partes.insalubridade ? ([['NR-15 e seus anexos', 'Atividades e operações insalubres, limites de tolerância e graus']] as [string, string][]) : []),
        ...(partes.periculosidade ? ([['NR-16 e seus anexos', 'Atividades e operações perigosas']] as [string, string][]) : []),
        ['NR-06', 'Equipamentos de proteção individual'],
        ['NHOs da Fundacentro', 'Métodos de medição dos agentes ambientais'],
      ]),
    },
    {
      titulo: 'Definições',
      html: tabelaDuasColunas(['Termo', 'O que quer dizer neste documento'], [
        ...(partes.insalubridade
          ? ([
              ['Insalubridade', 'Exposição a agente físico, químico ou biológico acima do limite de tolerância ou nas situações descritas nos anexos da NR-15.'],
              ['Limite de tolerância', 'Concentração ou intensidade máxima do agente que, em tese, não causa dano à saúde durante a vida de trabalho.'],
              ['Graus', 'Mínimo (10%), médio (20%) e máximo (40%), conforme o anexo da NR-15 que enquadra o agente (CLT, art. 192).'],
            ] as [string, string][])
          : []),
        ['Periculosidade', 'Atividade que, por sua natureza, expõe o trabalhador a risco acentuado, como inflamáveis, explosivos, eletricidade, violência na segurança patrimonial e uso de motocicleta. Dá direito a 30% sobre o salário-base (CLT, art. 193).'],
        ['Neutralização', 'Quando uma proteção coletiva ou um EPI eficaz reduz o agente abaixo do limite. Nesse caso, o adicional de insalubridade deixa de ser devido (CLT, art. 191).'],
      ]),
    },
    {
      titulo: 'Metodologia',
      html: `${p('Os locais de trabalho foram visitados e as atividades de cada grupo de exposição foram acompanhadas, conversando com os trabalhadores sobre a rotina, a jornada e as proteções usadas.')}
        ${partes.insalubridade ? p(`<strong>Insalubridade:</strong> cada agente foi comparado com o anexo correspondente da NR-15, com medição quando o anexo pede. Se houver mais de um agente, vale só o de grau mais alto, porque os adicionais não se somam (NR-15, item 15.3). Também foi conferido se as proteções coletivas e os EPIs funcionam de fato (NR-15, item 15.4.1).`) : ''}
        ${partes.periculosidade ? p(`<strong>Periculosidade:</strong> as atividades foram comparadas com os anexos da NR-16. Se a pessoa também tiver direito à insalubridade, ela escolhe um dos dois, porque eles não se acumulam (CLT, art. 193, § 2º).`) : ''}`,
    },
    { titulo: 'Avaliação por grupo de exposição', html: blocos || '<p class="falta">Nenhum GHE cadastrado.</p>' },
    {
      titulo: 'Conclusão',
      html: `<table><thead><tr><th>GHE</th><th>Cargos</th>${partes.insalubridade ? '<th>Insalubridade</th>' : ''}<th>Periculosidade</th></tr></thead>
        <tbody>${conclusao || '<tr><td colspan="4">Nenhum GHE cadastrado.</td></tr>'}</tbody></table>
        ${p('A conclusão vale para as condições encontradas na data da avaliação. Se o ambiente, as atividades ou as proteções mudarem, o laudo deve ser refeito.')}`,
    },
    {
      titulo: 'Revisão e vigência',
      html: p(`A lei não fixa validade para este laudo, mas ele precisa ser revisto sempre que algo mudar no ambiente, no processo ou nas proteções. Recomendamos conferir as condições até ${dataBr(extras.controle.proximaRevisao)}.`),
    },
  ]);

  return documentoHtml(
    moldura,
    `${secoes}${blocoAssinaturas(extras.local, extras.controle.emitidoEm, [
      { nome: responsavel.nome, papel: extras.formacao ?? 'Responsável técnico', registro: responsavel.registro },
      { nome: extras.representanteLegal, papel: 'Representante da organização' },
    ])}`,
    `${CSS_SECOES} .ghe table { font-size: 10px; } h3 { font-size: 13px; margin: 14px 0 6px; } .alerta { color: #EF4444; }
     .conclusao { padding: 8px 10px; border-radius: 8px; margin-top: 8px; } .conclusao.sim { background: #FEF2F2; } .conclusao.nao { background: #ECFDF5; } .conclusao.pendente { background: #FFFBEB; }`,
  );
}

// PGRTR: o mesmo inventário do PGR, com a base da NR-31 e os temas próprios do trabalho rural.
export type RiscoPgrtr = { tipo: string; agente: string; fonteGeradora: string; medidasControle: string | null; medidasEpc?: string | null; medidasEpi?: string | null; severidade: string };
export const TEMAS_RURAIS = [
  'Agrotóxicos, adjuvantes e produtos afins: armazenamento, preparo, aplicação e descarte de embalagens',
  'Máquinas, equipamentos e implementos agrícolas',
  'Ferramentas manuais',
  'Ergonomia: levantamento de cargas, posturas e ritmo de trabalho',
  'Exposição ao sol, calor, chuva e frio',
  'Animais peçonhentos e contato com animais',
  'Transporte de trabalhadores',
  'Áreas de vivência: instalações sanitárias, refeições, alojamento e água potável',
  'Primeiros socorros e atendimento de emergência no campo',
];

export type AcaoPgrtr = { descricao: string; local: string | null; responsavel: string | null; prazo: Date | null; status: string };
const STATUS_ACAO: Record<string, string> = { ABERTA: 'A fazer', ANDAMENTO: 'Em andamento', FEITA: 'Feita' };

export function pgrtrHtml(
  moldura: Moldura,
  ghes: { nome: string; descricao: string | null; colaboradores: number; riscos: (RiscoPgrtr & { probabilidade?: string })[] }[],
  extras: ExtrasDoc & { responsavel: Responsavel; acoes: AcaoPgrtr[] },
): string {
  const nomeEmpresa = escape(extras.empresa.razaoSocial);
  const total = ghes.reduce((t, g) => t + g.colaboradores, 0) || extras.empresa.numFuncionarios;
  const inventario = ghes
    .map(
      (g) => `
      <section class="ghe">
        <h3>${escape(g.nome)} <span class="meta">${g.colaboradores} trabalhador(es)</span></h3>
        ${g.descricao ? `<p>${escape(g.descricao).replace(/\n/g, '<br>')}</p>` : ''}
        ${
          g.riscos.length
            ? `<table>
          <thead><tr><th>Tipo</th><th>Perigo</th><th>Fonte ou circunstância</th><th>Severidade</th><th>Nível</th><th>Medidas de prevenção</th></tr></thead>
          <tbody>${g.riscos
            .map((r) => `<tr><td>${TIPO[r.tipo] ?? r.tipo}</td><td>${escape(r.agente)}</td><td>${escape(r.fonteGeradora)}</td><td>${nomeSeveridade(r.severidade)}</td>
              <td>${NOME_NIVEL[nivelRisco(r.severidade, r.probabilidade ?? '3')]}</td><td>${medidasPartes(r).map(([k, v]) => `<strong>${k}:</strong> ${escape(v)}`).join('<br/>') || '<span class="falta">a definir</span>'}</td></tr>`)
            .join('')}</tbody>
        </table>`
            : '<p class="falta">Nenhum risco cadastrado neste grupo.</p>'
        }
      </section>`,
    )
    .join('');
  const acoes = extras.acoes.length
    ? `<table><thead><tr><th>O que fazer</th><th>Onde</th><th>Responsável</th><th>Prazo</th><th>Situação</th></tr></thead>
        <tbody>${extras.acoes.map((a) => `<tr><td>${escape(a.descricao)}</td><td>${escape(a.local)}</td><td>${escape(a.responsavel ?? 'a definir')}</td><td>${dataBr(a.prazo)}</td><td>${STATUS_ACAO[a.status] ?? escape(a.status)}</td></tr>`).join('')}</tbody></table>`
    : '<p class="falta">Ainda não há ações cadastradas.</p>';

  const secoes = secoesNumeradas([
    { titulo: 'Controle do documento', html: controleDocumento(extras.controle) },
    { titulo: 'Identificação', html: identificacaoBasica(extras, total, extras.responsavel) },
    {
      titulo: 'Introdução',
      html: p(
        `O trabalho no campo tem riscos próprios: máquinas agrícolas, agrotóxicos, sol forte, animais peçonhentos, longas distâncias até
        um socorro. A NR-31 pede que o empregador rural tenha um Programa de Gerenciamento de Riscos no Trabalho Rural (PGRTR) que mostre
        esses riscos e o que vai ser feito para controlá-los.`,
        `Este documento reúne o levantamento feito nas atividades da ${nomeEmpresa}, o tamanho de cada risco e o plano de ação.`,
      ),
    },
    {
      titulo: 'Objetivo',
      html: lista([
        'identificar os perigos de cada atividade rural e avaliar os riscos;',
        'definir as medidas de prevenção, dando preferência às que eliminam o perigo ou protegem todos ao mesmo tempo;',
        'organizar as ações com responsável e prazo;',
        'garantir a participação dos trabalhadores e a informação sobre os riscos.',
      ]),
    },
    {
      titulo: 'Campo de aplicação',
      html: p(`Este programa vale para todas as frentes de trabalho, áreas de vivência e atividades da ${nomeEmpresa}, com ${total} trabalhador(es) em ${ghes.length} grupo(s). Inclui as atividades sazonais, como plantio e colheita, e as feitas por terceiros dentro da propriedade.`),
    },
    {
      titulo: 'Referências normativas',
      html: tabelaReferencias([
        ['NR-31', 'Segurança e saúde no trabalho na agricultura, pecuária, silvicultura, exploração florestal e aquicultura'],
        ['NR-01', 'Disposições gerais, no que se aplica ao trabalho rural'],
        ['Lei 5.889/1973', 'Normas do trabalho rural'],
        ['Lei 14.785/2023', 'Agrotóxicos: produção, uso, armazenamento e descarte de embalagens'],
        ['NR-07', 'Exames médicos ocupacionais'],
      ]),
    },
    {
      titulo: 'Responsabilidades',
      html: tabelaDuasColunas(['Quem', 'O que faz'], [
        ['Empregador rural', 'Implantar o programa, fornecer EPIs, ferramentas e máquinas seguras, garantir áreas de vivência, água potável, primeiros socorros e treinamento.'],
        ['Responsável pela elaboração', 'Levantar e avaliar os riscos, propor as medidas e orientar a execução do plano.'],
        ['Encarregados e gerentes', 'Fazer as medidas acontecerem nas frentes de trabalho e avisar quando algo mudar.'],
        ['Trabalhadores', 'Seguir as orientações, usar os EPIs, participar dos treinamentos e avisar sobre situações de risco.'],
        ['CIPATR, quando houver', 'Acompanhar o programa e levar as sugestões dos trabalhadores.'],
      ]),
    },
    {
      titulo: 'Metodologia',
      html: `${p('As atividades foram acompanhadas no campo, conversando com os trabalhadores. Cada perigo recebeu uma nota de severidade e de probabilidade, de 1 a 5, e o produto das duas define o nível de risco e a prioridade de ação. Os temas abaixo foram olhados em todas as frentes:')}
        <ul>${TEMAS_RURAIS.map((t) => `<li>${escape(t)}</li>`).join('')}</ul>`,
    },
    { titulo: 'Inventário de riscos', html: inventario || '<p class="falta">Nenhum GHE cadastrado.</p>' },
    { titulo: 'Plano de ação', html: `${acoes}${p('Cada ação concluída ganha data e comprovação. O andamento é conferido nas visitas e o risco é avaliado de novo depois da medida.')}` },
    {
      titulo: 'Revisão e vigência',
      html: `${p(`Este programa vale a partir da emissão${extras.controle.proximaRevisao ? ` e deve ser revisto até ${dataBr(extras.controle.proximaRevisao)}` : ''}. Antes disso, ele precisa ser revisto quando:`)}
        ${lista(['mudarem as atividades, as culturas, as máquinas ou os produtos usados;', 'acontecer acidente ou adoecimento ligado ao trabalho;', 'alguma medida não estiver funcionando;', 'os trabalhadores ou a CIPATR pedirem.'])}`,
    },
  ]);
  return documentoHtml(
    moldura,
    `${secoes}${blocoAssinaturas(extras.local, extras.controle.emitidoEm, [
      { nome: extras.responsavel.nome, papel: 'Responsável pela elaboração', registro: extras.responsavel.registro },
      { nome: extras.representanteLegal, papel: 'Empregador rural ou representante' },
    ])}`,
    `${CSS_SECOES} .ghe table { font-size: 10px; }`,
  );
}

// Ordem de Serviço de SST por função (NR-01, item 1.4.1, alínea c), no formato que o Rodrigo usa:
// descrição e atividades da função, obrigações, riscos por tipo, medidas, EPIs, treinamentos,
// acidente, proibições, punições, medicina do trabalho, deveres das duas partes e termo de recebimento.
export type RiscoOs = RiscoPgrtr & { possiveisLesoes?: string | null };
export type DadosOs = {
  colaborador: { nome: string; cpf: string | null; cargo: string; cbo: string | null; matricula?: string | null; dataAdmissao?: Date | null };
  ghe: { nome: string; descricao: string | null; atividadesFuncao?: string | null } | null;
  riscos: RiscoOs[];
  epis: string[];
};
export type CabecalhoOs = {
  empresa: string;
  pgr: { versao: number; data: Date } | null;
  emitidoEm: Date;
  local: string | null;
  telefones: string | null; // contatos de emergência da empresa
  medicoPcmso: string | null;
};

const OBRIGACOES = [
  'Cumprir as normas e os procedimentos de segurança e saúde no trabalho da empresa, inclusive esta ordem de serviço;',
  'Usar o EPI fornecido de forma correta durante toda a atividade, só para o fim a que se destina (NR-06);',
  'Guardar, conservar e higienizar os EPIs recebidos, e pedir a troca quando estragarem ou deixarem de proteger;',
  'Comunicar ao superior ou ao responsável pela segurança qualquer condição insegura, quase acidente ou acidente;',
  'Participar dos treinamentos, diálogos de segurança (DDS) e campanhas para os quais for convocado;',
  'Não remover nem desativar proteções de máquinas, equipamentos e instalações;',
  'Comunicar defeitos em equipamentos e ferramentas antes de usá-los.',
];
const PROIBICOES = [
  'Entrar em áreas onde o EPI é obrigatório sem estar usando o EPI;',
  'Operar máquinas, equipamentos ou veículos sem treinamento e autorização;',
  'Fazer serviço em eletricidade sem ser qualificado e autorizado (NR-10);',
  'Trabalhar acima de 2 metros de altura sem treinamento e sem cinto de segurança ancorado (NR-35);',
  'Retirar ou desativar proteções e dispositivos de segurança;',
  'Fazer manutenção ou limpeza em máquinas energizadas ou em movimento;',
  'Usar ferramentas ou equipamentos com defeito;',
  'Ficar ou passar embaixo de cargas suspensas;',
  'Trabalhar sob efeito de álcool ou outras drogas, ou consumi-los durante a jornada;',
  'Fumar ou fazer fogo fora dos locais permitidos;',
  'Correr, brincar ou fazer qualquer coisa que distraia a atenção no local de trabalho;',
  'Portar arma de qualquer tipo durante a jornada, salvo quando a função exigir e houver autorização legal.',
];
const TIPOS_OS: [string, string][] = [['FISICO', 'Físico'], ['QUIMICO', 'Químico'], ['BIOLOGICO', 'Biológico'], ['ERGONOMICO', 'Ergonômico'], ['ACIDENTE', 'Acidente']];

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const unicos = (itens: string[]) => {
  const vistos = new Set<string>();
  return itens.map((i) => i.trim().replace(/[.;]+$/, '')).filter((i) => i && !vistos.has(semAcento(i)) && vistos.add(semAcento(i)));
};
// Medidas e EPIs vêm como texto livre no risco: separa por vírgula, ponto e vírgula ou linha.
const partes = (t: string | null | undefined) => (t ?? '').split(/[;\n]|,(?![^(]*\))/).map((x) => x.trim()).filter(Boolean);

// Treinamentos que a função precisa, a partir dos riscos (os mesmos critérios das referências do PGR).
function treinamentosOs(riscos: RiscoOs[]): string[] {
  const t = semAcento(riscos.map((r) => `${r.agente} ${r.fonteGeradora}`).join(' '));
  const lista = ['Integração de segurança (na admissão)', 'NR-01: riscos da função e PGR', 'NR-06: uso, guarda e conservação dos EPIs'];
  if (/eletric|choque/.test(t)) lista.push('NR-10: segurança em eletricidade (quando fizer serviço em instalações)');
  if (/empilhadeir|ponte rolante|munck|guindaste|icamento|movimentacao de carga/.test(t)) lista.push('NR-11: operação de equipamentos de movimentação de cargas');
  if (/maquin|prensa|serra|cilindr|esmeril|torno|betoneira|equipamento/.test(t)) lista.push('NR-12: segurança em máquinas e equipamentos');
  if (/inflamav|combustiv|glp|solvente|thinner/.test(t)) lista.push('NR-20: inflamáveis e combustíveis');
  if (/confinad|tanque|silo|cisterna/.test(t)) lista.push('NR-33: trabalhador autorizado em espaço confinado');
  if (/altura|escada|andaime|telhado/.test(t)) lista.push('NR-35: trabalho em altura');
  if (/incendio|solda|maçarico|macarico/.test(t)) lista.push('Prevenção e combate a princípio de incêndio');
  lista.push('DDS: diálogo diário de segurança');
  return lista;
}

function paginaOs(d: DadosOs, c: CabecalhoOs): string {
  // O que a função faz vem do cadastro do GHE (funções e atividades). Texto com quebras de linha ou ";" vira lista.
  const atividades = d.ghe?.atividadesFuncao ? d.ghe.atividadesFuncao.split(/\n|;\s*/).map((x) => x.trim()).filter(Boolean) : [];
  const riscosPorTipo = TIPOS_OS.map(([tipo, nome]) => {
    const rs = d.riscos.filter((r) => r.tipo === tipo);
    return `<tr><th>${nome}</th><td>${
      rs.length
        ? rs.map((r) => `${escape(r.agente)} (${escape(r.fonteGeradora)})${r.possiveisLesoes ? `: pode causar ${escape(r.possiveisLesoes.charAt(0).toLowerCase() + r.possiveisLesoes.slice(1))}` : ''}`).join('<br>')
        : `Sem exposição a risco ${nome.toLowerCase()} identificada no PGR.`
    }</td></tr>`;
  }).join('');
  const medidas = unicos(d.riscos.flatMap((r) => [...partes(r.medidasEpc), ...partes(r.medidasControle)]));
  const epis = unicos([...d.riscos.flatMap((r) => partes(r.medidasEpi)), ...d.epis]);
  const col = d.colaborador;
  return `
    <table class="ident"><tbody>
      <tr><th>Empresa</th><td colspan="3">${escape(c.empresa)}</td></tr>
      <tr><th>Colaborador</th><td>${escape(col.nome)}</td><th>Matrícula</th><td>${escape(col.matricula ?? '') || '________'}</td></tr>
      <tr><th>Função</th><td>${escape(col.cargo)}</td><th>CBO</th><td>${escape(col.cbo ?? '') || '________'}</td></tr>
      <tr><th>Setor / GHE</th><td>${escape(d.ghe?.nome ?? '') || '________'}</td><th>Início na função</th><td>${col.dataAdmissao ? col.dataAdmissao.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '___/___/______'}</td></tr>
      <tr><th>Base</th><td colspan="3">${c.pgr ? `PGR versão ${c.pgr.versao}, de ${dataBr(c.pgr.data)}` : 'PGR da empresa'} · OS emitida em ${dataBr(c.emitidoEm)} · revisão em 12 meses ou quando a função ou os riscos mudarem</td></tr>
    </tbody></table>
    <p class="objetivo">Esta ordem de serviço informa ao trabalhador os riscos da sua função, como se proteger, o que é obrigatório e o que é
    proibido, e o que fazer em caso de acidente. Ela atende à CLT (art. 157, II) e à NR-01 (item 1.4.1, alínea c) e deve ser explicada
    antes de o trabalhador começar a atividade e sempre que a função ou os riscos mudarem.</p>

    <h2>1. Descrição da função</h2>
    <p>${atividades.length ? escape(atividades[0]) : '<span class="falta">Descreva o que esta função faz no cadastro do GHE (funções e atividades).</span>'}</p>
    ${!atividades.length && d.ghe?.descricao ? `<p>${escape(d.ghe.descricao).replace(/\n/g, '<br>')}</p>` : ''}
    ${atividades.length > 1 ? `<h2>2. Atividades da função</h2><ul>${atividades.slice(1).map((x) => `<li>${escape(x)}</li>`).join('')}</ul>` : '<h2>2. Atividades da função</h2><p>Conforme a descrição acima e as orientações do superior imediato.</p>'}

    <h2>3. Obrigações do empregado</h2>
    <ul>${OBRIGACOES.map((x) => `<li>${x}</li>`).join('')}</ul>

    <h2>4. Riscos das atividades</h2>
    <table class="riscos"><tbody>${riscosPorTipo}</tbody></table>

    <h2>5. Medidas de prevenção</h2>
    ${medidas.length ? `<ul>${medidas.map((x) => `<li>${escape(x)}</li>`).join('')}</ul>` : '<p>Seguir os procedimentos da empresa e as orientações do superior e do responsável pela segurança.</p>'}

    <h2>6. EPIs de uso obrigatório</h2>
    ${epis.length ? `<ul class="duas-col">${epis.map((x) => `<li>${escape(x)} (com CA válido)</li>`).join('')}</ul>` : '<p>Conforme a ficha de EPI do trabalhador.</p>'}

    <h2>7. Treinamentos obrigatórios</h2>
    <ul class="duas-col">${treinamentosOs(d.riscos).map((x) => `<li>${escape(x)}</li>`).join('')}</ul>

    <h2>8. Em caso de acidente</h2>
    <p>Pare o que está fazendo, peça socorro e avise na hora o superior imediato ou o responsável pela segurança. Na falta deles, avise um
    membro da CIPA ou o setor pessoal. Não mexa no local, a não ser para socorrer alguém. Todo acidente, mesmo pequeno, deve ser comunicado
    para que a empresa emita a CAT até o primeiro dia útil seguinte (no caso de morte, imediatamente), como pede a Lei 8.213/91 (art. 22).</p>
    <p class="destaque">Telefones de emergência: SAMU 192 · Bombeiros 193${c.telefones ? ` · ${escape(c.telefones)}` : ''}</p>

    <h2>9. É proibido</h2>
    <ul>${PROIBICOES.map((x) => `<li>${x}</li>`).join('')}</ul>

    <h2>10. Punições</h2>
    <p>A recusa sem motivo justo em cumprir esta ordem de serviço ou em usar os EPIs fornecidos é falta do empregado (CLT, art. 158, parágrafo
    único, e NR-01, item 1.4.2.1). Conforme a gravidade e a repetição, a empresa pode aplicar:</p>
    <ul>
      <li>advertência verbal ou por escrito;</li>
      <li>suspensão;</li>
      <li>dispensa por justa causa (CLT, art. 482), quando as medidas anteriores não tiverem resolvido;</li>
      <li>desconto no salário em caso de dano proposital ou extravio de EPI, conforme a CLT (art. 462, § 1º).</li>
    </ul>

    <h2>11. Medicina do trabalho</h2>
    <p>O empregado deve fazer os exames médicos previstos no PCMSO (admissional, periódico, retorno ao trabalho, mudança de risco e demissional).
    O médico${c.medicoPcmso ? ` responsável (${escape(c.medicoPcmso)})` : ' responsável'} informa ao trabalhador o resultado dos seus exames.</p>

    <h2>12. Cabe à empresa (NR-01, item 1.4.1)</h2>
    <ul>
      <li>cumprir e fazer cumprir as normas de segurança e saúde no trabalho;</li>
      <li>informar aos trabalhadores os riscos do trabalho, as medidas de prevenção, os resultados dos seus exames e das avaliações ambientais;</li>
      <li>elaborar ordens de serviço de segurança e saúde e dar ciência delas aos empregados;</li>
      <li>permitir que representantes dos trabalhadores acompanhem a fiscalização;</li>
      <li>determinar o que fazer em caso de acidente ou doença relacionada ao trabalho, incluindo a análise das causas;</li>
      <li>implementar as medidas de prevenção ouvindo os trabalhadores, na ordem de prioridade da norma.</li>
    </ul>

    <h2>13. Cabe ao empregado (NR-01, item 1.4.2)</h2>
    <ul>
      <li>cumprir as normas de segurança e saúde, inclusive as ordens de serviço da empresa;</li>
      <li>fazer os exames médicos previstos;</li>
      <li>colaborar com a empresa na aplicação das normas;</li>
      <li>usar o EPI fornecido.</li>
    </ul>
    <p>O trabalhador pode interromper a atividade quando perceber risco grave e iminente para a sua vida ou saúde, avisando o superior na hora (NR-01, item 1.4.3).</p>

    <div class="termo">
    <h2>Termo de recebimento e compromisso</h2>
    <p>Recebi da ${escape(c.empresa)} as orientações desta ordem de serviço e uma cópia dela. Ela me foi explicada, entendi o que está escrito
    e me comprometo a seguir as orientações, que reconheço serem necessárias para a minha segurança e a dos meus colegas. Declaro também que
    recebi os EPIs obrigatórios da minha função e me comprometo a usá-los durante toda a jornada, pedindo a troca sempre que precisar.</p>
    <p class="local-data">${c.local ? `${escape(c.local)}, ` : ''}${c.emitidoEm.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })}.</p>
    <div class="assinaturas tres">
      <div class="assinatura">${escape(col.nome)}<span>Colaborador${col.cpf ? ` · CPF ${escape(col.cpf)}` : ''}</span></div>
      <div class="assinatura">&nbsp;<span>Segurança do trabalho</span></div>
      <div class="assinatura">&nbsp;<span>Recursos humanos</span></div>
    </div>
    </div>`;
}

const CSS_OS = `body { font-size: 11px; } h2 { font-size: 12.5px; margin: 12px 0 4px; } td, th { padding: 3px 6px; } table { width: 100%; }
  .ident th { width: 16%; text-align: left; } .riscos th { width: 16%; text-align: left; vertical-align: top; }
  ul { margin: 4px 0 8px; padding-left: 18px; } li { margin-bottom: 2px; line-height: 1.4; } p { line-height: 1.5; text-align: justify; }
  .duas-col { columns: 2; column-gap: 24px; } .objetivo { background: #F1F5F9; border-radius: 6px; padding: 6px 8px; margin-top: 8px; }
  .destaque { font-weight: 600; } .falta { color: #b45309; font-style: italic; } .local-data { margin-top: 18px; }
  .termo { page-break-inside: avoid; }
  .assinaturas.tres { grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 36px; }`;

export function osHtml(moldura: Moldura, lista: DadosOs[], cab: CabecalhoOs): string {
  if (lista.length === 1) return documentoHtml(moldura, paginaOs(lista[0], cab), CSS_OS);
  // Uma ordem por trabalhador, cada uma começando em página nova, com as duas logos.
  const paginas = lista
    .map((d, i) => `<div class="${i < lista.length - 1 ? 'quebra' : ''}">${cabecalhoHtml({ ...moldura, infos: [] })}${paginaOs(d, cab)}${rodapeHtml(moldura)}</div>`)
    .join('');
  return folhaHtml(paginas, CSS_OS);
}
