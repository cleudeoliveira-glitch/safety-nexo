import { NOME_SITUACAO_EXPOSICAO, nivelDeAcao } from './nivel-acao';
import { textoNivel } from './nivel-risco';
import * as tokens from '@safety-nexo/design-tokens';
import { NOME_HIERARQUIA } from '../prevencao/hierarquia';
import { documentoHtml, escape, Moldura } from './layout';
import { CSS_CRONOGRAMA, ItemCronograma, TODO_MES, TRIMESTRAL, cronogramaHtml, mesDoCronograma } from './secoes';
import { Controle, CSS_SECOES, blocoAssinaturas, controleDocumento, dataBr, lista, p, referenciasPelosRiscos, secoesNumeradas, tabelaDuasColunas, tabelaReferencias } from './secoes';
import { FuncaoGhe } from '../empresas/ghe-ambiente';
import { DECISAO_NIVEL, EXPLICA_SEVERIDADE, GRAUS, NOME_NIVEL, NOME_PROBABILIDADE, NOME_SEVERIDADE, Nivel, medidasPartes, nivelRisco, nomeProbabilidade, nomeSeveridade } from './nivel-risco';

const NOME_PRIORIDADE: Record<string, string> = { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta' };

// PGR conforme a NR-01 (1.5.7): inventário de riscos + plano de ação, datado e assinado.

export type RiscoPdf = {
  tipo: string; agente: string; fonteGeradora: string; medidasControle: string | null; medidasEpc?: string | null; medidasEpi?: string | null; severidade: string; probabilidade: string;
  possiveisLesoes: string | null; tipoAvaliacao?: string | null; intensidade?: string | null; limiteTolerancia?: string | null; tecnicaMedicao?: string | null;
};
export type GhePdf = {
  nome: string; descricao: string | null; riscos: RiscoPdf[]; colaboradores: number;
  setor?: string | null; funcoes?: FuncaoGhe[]; ambiente?: string;
};
export type AcaoPdf = { descricao: string; local: string | null; responsavel: string | null; prazo: Date | null; prioridade: string; status: string; origemTexto: string | null; feitaEm?: Date | null; hierarquia?: string | null; nivelAntes?: string | null; nivelDepois?: string | null; eficaz?: boolean | null };
export type ExtrasPgr = {
  processos: string | null;
  acoes: AcaoPdf[];
  pontoEncontro: string | null;
  responsavel: { nome: string | null; registro: string | null };
  representanteLegal: string | null;
  emitidoEm: Date;
  controle: Controle;
  empresa: { razaoSocial: string; cnae: string | null; endereco: string | null; numFuncionarios: number };
  funcoes: { funcao: string; ghe: string; quantidade: number }[]; // colaboradores ativos por função
  terceiros: { razaoSocial: string; servico: string }[];
  medicoPcmso: string | null;
  local: string | null;
};

const TIPO: Record<string, string> = { FISICO: 'Físico', QUIMICO: 'Químico', BIOLOGICO: 'Biológico', ERGONOMICO: 'Ergonômico', ACIDENTE: 'Acidente' };
const COR_NIVEL: Record<Nivel, string> = { BAIXO: tokens.colors.success, MODERADO: tokens.colors.warning, ALTO: tokens.colors.danger, CRITICO: '#7F1D1D' };
const STATUS: Record<string, string> = { ABERTA: 'A fazer', ANDAMENTO: 'Em andamento', FEITA: 'Feita' };
const data = (d: Date | null) => (d ? d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const selo = (nivel: Nivel) => `<span class="badge" style="background:${COR_NIVEL[nivel]}">${NOME_NIVEL[nivel]}</span>`;

// Psicossocial entra pelo módulo próprio com o agente "Fatores psicossociais: ...": no PDF aparece com o nome certo.
const tipoDoRisco = (r: RiscoPdf) => (/^fatores psicossociais/i.test(r.agente) ? 'Psicossocial' : TIPO[r.tipo] ?? escape(r.tipo));

function avaliacao(r: RiscoPdf) {
  if (r.tipoAvaliacao === 'QUANTITATIVA') {
    const na = nivelDeAcao(r);
    const aviso = na && na.situacao !== 'ABAIXO' ? `. <strong>${NOME_SITUACAO_EXPOSICAO[na.situacao]}</strong> (nível de ação ${String(na.nivelAcao).replace('.', ',')} ${escape(na.unidade)})` : '';
    return `Quantitativa${r.intensidade ? `: ${escape(r.intensidade)}` : ''}${r.limiteTolerancia ? ` (limite ${escape(r.limiteTolerancia)})` : ''}${aviso}`;
  }
  if (r.tipoAvaliacao === 'QUALITATIVA') return 'Qualitativa';
  return 'Qualitativa (preliminar)';
}

// Matriz 5x5: probabilidade de cima (5, quase certa) para baixo; severidade da esquerda (1) para a direita (5).
function matriz() {
  const linhas = [...GRAUS].reverse()
    .map((p) => `<tr><th>${p} · ${NOME_PROBABILIDADE[p]}</th>${GRAUS.map((s) => `<td class="c">${selo(nivelRisco(s, p))}<br/><span class="pts">${Number(s) * Number(p)}</span></td>`).join('')}</tr>`)
    .join('');
  return `
    <table class="matriz">
      <thead><tr><th>Probabilidade ↓ / Severidade →</th>${GRAUS.map((s) => `<th class="c">${s} · ${NOME_SEVERIDADE[s]}</th>`).join('')}</tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <table>
      <thead><tr><th>Severidade</th><th>Quer dizer</th></tr></thead>
      <tbody>${GRAUS.map((s) => `<tr><td>${s} · ${NOME_SEVERIDADE[s]}</td><td>${EXPLICA_SEVERIDADE[s]}</td></tr>`).join('')}</tbody>
    </table>
    <table>
      <thead><tr><th>Nível</th><th>Decisão</th></tr></thead>
      <tbody>${(Object.keys(DECISAO_NIVEL) as Nivel[]).map((n) => `<tr><td>${selo(n)}</td><td>${DECISAO_NIVEL[n]}</td></tr>`).join('')}</tbody>
    </table>`;
}

// Funções do GHE e o que cada uma faz (NR-01, 1.5.7.3.2, b).
function funcoesHtml(ghe: GhePdf): string {
  const funcoes = ghe.funcoes ?? [];
  if (!funcoes.length) {
    return `<p class="descricao"><strong>Atividades:</strong> ${ghe.descricao ? escape(ghe.descricao) : '<span class="falta">não descritas</span>'}</p>`;
  }
  return `<p class="descricao"><strong>Funções:</strong> ${funcoes.map((f) => `${escape(f.nome)}${f.cbo ? ` (CBO ${escape(f.cbo)})` : ''}`).join(', ')}</p>
    ${funcoes.map((f) => `<p class="descricao"><strong>${escape(f.nome)}:</strong> ${f.atividades ? escape(f.atividades) : '<span class="falta">atividades a descrever</span>'}</p>`).join('')}
    ${ghe.descricao ? `<p class="descricao">${escape(ghe.descricao)}</p>` : ''}`;
}

// Cada GHE com o seu ambiente: o administrativo não é descrito igual à solda.
function ambientesHtml(ghes: GhePdf[]): string {
  if (!ghes.length) return '';
  return ghes
    .map((g) => `<p><strong>${escape(g.nome)}</strong>${g.setor && !g.nome.includes(g.setor) ? ` (setor ${escape(g.setor)})` : ''}: ${g.ambiente ? escape(g.ambiente) : '<span class="falta">falta descrever o ambiente deste GHE (edificação, piso, iluminação, ventilação, máquinas).</span>'}</p>`)
    .join('');
}

const ehPsicossocial = (r: RiscoPdf) => /^fatores psicossociais/i.test(r.agente);

// Mês do cronograma em que cai um mês do calendário (0 = janeiro).
const noMes = (inicio: Date, mesCalendario: number) => (mesCalendario - inicio.getMonth() + 12) % 12;

// Cronograma do PGR: ações de rotina do programa + as ações do plano que vencem nos próximos 12 meses.
function cronogramaPgr(inicio: Date, acoes: AcaoPdf[], nrs: string[]): ItemCronograma[] {
  const itens: ItemCronograma[] = [
    { acao: 'Apresentar o PGR aos trabalhadores e à CIPA ou ao representante da NR-05', responsavel: 'Empresa e responsável técnico', meses: [0] },
    { acao: 'Elaborar ou atualizar o PCMSO com base nos riscos deste PGR', responsavel: 'Médico do PCMSO', meses: [0] },
    { acao: 'Integração de segurança dos trabalhadores admitidos (sempre que houver admissão)', responsavel: 'Empresa', meses: TODO_MES },
    { acao: 'Fornecer os EPIs, exigir o uso e manter as fichas de entrega atualizadas', responsavel: 'Empresa', meses: TODO_MES },
    { acao: 'Treinamento de uso, guarda e conservação dos EPIs (NR-06)', responsavel: 'Responsável técnico', meses: [1, 7] },
    ...(nrs.length ? [{ acao: `Treinamentos obrigatórios das normas aplicáveis (${nrs.join(', ')}), com reciclagem no prazo de cada norma`, responsavel: 'Empresa', meses: [2] }] : []),
    { acao: 'Diálogos diários de segurança (DDS) com temas ligados aos riscos do inventário', responsavel: 'Encarregados', meses: TODO_MES },
    { acao: 'Inspeções de segurança nos setores, com registro e fotos', responsavel: 'Responsável técnico e CIPA', meses: TRIMESTRAL },
    { acao: 'Acompanhamento do plano de ação e da eficácia das medidas', responsavel: 'Responsável técnico', meses: [2, 5, 8, 11] },
    { acao: 'Palestra de prevenção de acidentes (Abril Verde)', responsavel: 'Responsável técnico', meses: [noMes(inicio, 3)] },
    { acao: 'SIPAT: semana interna de prevenção, quando houver CIPA ou representante', responsavel: 'CIPA e empresa', meses: [8] },
    { acao: 'Simulado de abandono e de emergência', responsavel: 'Brigada e responsável técnico', meses: [5] },
    { acao: 'Análise global do PGR: avaliar o ano e atualizar o inventário e o plano', responsavel: 'Responsável técnico', meses: [11] },
  ];
  for (const a of acoes.slice(0, 30)) {
    const previsto = mesDoCronograma(inicio, a.prazo);
    const feito = a.status === 'FEITA' ? mesDoCronograma(inicio, a.feitaEm ?? null) : null;
    if (previsto === null && feito === null) continue;
    itens.push({ acao: `Plano de ação: ${a.descricao}${a.local ? ` (${a.local})` : ''}`, responsavel: a.responsavel ?? 'a definir', meses: previsto !== null ? [previsto] : [], realizados: feito !== null ? [feito] : [] });
  }
  return itens;
}

export function renderPgrHtml(moldura: Moldura, ghes: GhePdf[], extras: ExtrasPgr): string {
  const todos = ghes.flatMap((g) => g.riscos.map((r) => ({ ghe: g.nome, r, nivel: nivelRisco(r.severidade, r.probabilidade) })));
  const prioritarios = todos.filter((x) => x.nivel === 'ALTO' || x.nivel === 'CRITICO');
  const psicossociais = todos.filter((x) => ehPsicossocial(x.r));
  const e = extras.empresa;
  const totalTrabalhadores = ghes.reduce((t, g) => t + g.colaboradores, 0) || e.numFuncionarios;
  const nomeEmpresa = escape(e.razaoSocial);

  const inventario = ghes
    .map(
      (ghe) => `
      <section class="ghe">
        <h3>${escape(ghe.nome)} <span class="meta">${ghe.colaboradores} colaborador(es)</span></h3>
        ${funcoesHtml(ghe)}
        ${
          ghe.riscos.length
            ? `<table>
          <thead>
            <tr><th>Tipo</th><th>Perigo ou fator de risco</th><th>Fonte ou circunstância</th><th>Possíveis lesões ou agravos</th><th>Avaliação</th><th class="c">Sev.</th><th class="c">Prob.</th><th class="c">Nível</th><th>Medidas de prevenção</th></tr>
          </thead>
          <tbody>
            ${ghe.riscos
              .map(
                (r) => `<tr>
                  <td>${tipoDoRisco(r)}</td>
                  <td>${escape(r.agente)}</td>
                  <td>${escape(r.fonteGeradora)}</td>
                  <td>${r.possiveisLesoes ? escape(r.possiveisLesoes) : '<span class="falta">a informar</span>'}</td>
                  <td>${avaliacao(r)}</td>
                  <td class="c">${nomeSeveridade(r.severidade)}</td>
                  <td class="c">${nomeProbabilidade(r.probabilidade)}</td>
                  <td class="c">${selo(nivelRisco(r.severidade, r.probabilidade))}</td>
                  <td>${medidasPartes(r).length ? medidasPartes(r).map(([k, v]) => `<strong>${k}:</strong> ${escape(v)}`).join('<br/>') : '<span class="falta">a definir</span>'}</td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>`
            : '<p class="falta">Nenhum risco cadastrado neste GHE.</p>'
        }
      </section>`,
    )
    .join('');

  const acoes = extras.acoes.length
    ? `<table>
        <thead><tr><th>O que fazer</th><th>Tipo de medida</th><th>Onde</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th><th>Situação</th><th>Origem</th></tr></thead>
        <tbody>${extras.acoes
          .map(
            (a) => `<tr><td>${escape(a.descricao)}</td><td>${a.hierarquia ? escape(NOME_HIERARQUIA[a.hierarquia] ?? a.hierarquia) : '<span class="falta">a definir</span>'}</td><td>${escape(a.local)}</td><td>${a.responsavel ? escape(a.responsavel) : '<span class="falta">a definir</span>'}</td>
              <td>${a.prazo ? data(a.prazo) : '<span class="falta">a definir</span>'}</td><td>${NOME_PRIORIDADE[a.prioridade] ?? escape(a.prioridade)}</td>
              <td>${STATUS[a.status] ?? escape(a.status)}${a.nivelDepois ? `<br/><span class="meta">Risco antes: ${textoNivel(a.nivelAntes)}; depois: ${textoNivel(a.nivelDepois)}. ${a.eficaz ? 'A medida funcionou.' : 'Não baixou: rever a medida.'}</span>` : ''}</td><td>${escape(a.origemTexto ?? 'Manual')}</td></tr>`,
          )
          .join('')}</tbody>
      </table>`
    : '<p class="falta">Ainda não há ações cadastradas.</p>';

  const prioritariosHtml = prioritarios.length
    ? `<p>Estes são os riscos que pedem atenção primeiro:</p>
       <ul>${prioritarios.map((x) => `<li>${selo(x.nivel)} <strong>${escape(x.ghe)}</strong>: ${escape(x.r.agente)} (${escape(x.r.fonteGeradora)})</li>`).join('')}</ul>`
    : '<p>Nenhum risco ficou em nível alto ou crítico. Mesmo assim, as ações abaixo ajudam a manter os riscos sob controle.</p>';

  const funcoesTabela = extras.funcoes.length
    ? `<table><thead><tr><th>Função</th><th>GHE</th><th class="c">Trabalhadores</th></tr></thead>
        <tbody>${extras.funcoes.map((f) => `<tr><td>${escape(f.funcao)}</td><td>${escape(f.ghe)}</td><td class="c">${f.quantidade}</td></tr>`).join('')}
        <tr><td colspan="2"><strong>Total</strong></td><td class="c"><strong>${extras.funcoes.reduce((t, f) => t + f.quantidade, 0)}</strong></td></tr></tbody></table>`
    : `<p class="falta">Os colaboradores ainda não foram cadastrados no sistema. A empresa informou ${e.numFuncionarios} trabalhador(es).</p>`;

  const referencias = tabelaReferencias([
    ['NR-01', 'Disposições gerais e gerenciamento de riscos ocupacionais (base deste programa)'],
    ['NR-05', 'Comissão Interna de Prevenção de Acidentes e de Assédio (CIPA)'],
    ['NR-06', 'Equipamentos de proteção individual (EPI)'],
    ['NR-07', 'Programa de Controle Médico de Saúde Ocupacional (PCMSO)'],
    ...referenciasPelosRiscos(todos.map((x) => x.r), e.cnae),
    ['Lei 6.514/1977 e Portaria 3.214/1978', 'Capítulo V da CLT e aprovação das Normas Regulamentadoras'],
  ]);

  const secoes = secoesNumeradas([
    { titulo: 'Controle do documento', html: controleDocumento(extras.controle) },
    {
      titulo: 'Identificação',
      html: `${tabelaDuasColunas(['Dado', 'Informação'], [
        ['Empresa', nomeEmpresa],
        ['Endereço', e.endereco ? escape(e.endereco) : '<span class="falta">não informado</span>'],
        ['Representante legal', extras.representanteLegal ? escape(extras.representanteLegal) : '<span class="falta">não informado</span>'],
        ['Responsável pela elaboração', extras.responsavel.nome ? `${escape(extras.responsavel.nome)}${extras.responsavel.registro ? ` · ${escape(extras.responsavel.registro)}` : ''}` : '<span class="falta">não informado</span>'],
        ['Médico do PCMSO', extras.medicoPcmso ? escape(extras.medicoPcmso) : '<span class="falta">não informado</span>'],
      ])}
      <h3>Trabalhadores por função</h3>
      ${funcoesTabela}`,
    },
    {
      titulo: 'Introdução',
      html: p(
        `Todo trabalho tem riscos. Alguns são fáceis de ver, como uma máquina sem proteção ou um piso escorregadio. Outros aparecem
        devagar, como o ruído que vai tirando a audição ao longo dos anos ou a postura que, aos poucos, vira dor nas costas. O Programa
        de Gerenciamento de Riscos (PGR) existe para que a ${nomeEmpresa} conheça esses riscos, saiba o tamanho de cada um e tenha um
        plano para controlá-los.`,
        `Este documento é a parte escrita desse gerenciamento. Ele reúne o inventário de riscos, que mostra o que foi encontrado em cada
        setor, e o plano de ação, que diz o que vai ser feito, por quem e até quando. Os dois juntos atendem ao que a NR-01 pede no item 1.5.7.`,
        `O PGR não é um papel para guardar na gaveta. Ele só funciona se as ações saírem do papel, se as pessoas souberem dos riscos do seu
        trabalho e se o documento for revisto sempre que alguma coisa mudar na empresa.`,
      ),
    },
    {
      titulo: 'Objetivo',
      html: `${p(`O objetivo deste programa é proteger a saúde e a integridade física de quem trabalha na ${nomeEmpresa}. Para isso, ele busca:`)}
        ${lista([
          'identificar os perigos presentes nos ambientes e nas atividades de trabalho;',
          'avaliar cada risco, considerando a gravidade do dano e a chance de ele acontecer;',
          'definir as medidas de prevenção, dando preferência às que eliminam o perigo ou protegem todos ao mesmo tempo;',
          'organizar essas medidas em um plano de ação com responsável, prazo e acompanhamento;',
          'servir de base para o PCMSO, para os treinamentos e para as informações enviadas ao eSocial.',
        ])}`,
    },
    {
      titulo: 'Campo de aplicação',
      html: `${p(
        `Este PGR vale para todos os setores, funções e atividades da ${nomeEmpresa}${e.endereco ? `, no endereço ${escape(e.endereco)}` : ''}.
        Ele abrange ${totalTrabalhadores} trabalhador(es), organizados em ${ghes.length} grupo(s) de exposição (GHE), que são os grupos de pessoas
        expostas aos mesmos riscos de forma parecida.`,
        ghes.length ? `Os grupos avaliados foram: ${ghes.map((g) => `<strong>${escape(g.nome)}</strong>`).join(', ')}.` : '',
        `Atividades fora da rotina, como manutenção, limpeza pesada ou trabalho em horário diferente, também entram no gerenciamento e devem
        ser tratadas antes de começar, com análise de risco ou permissão de trabalho quando for o caso.`,
      )}
      ${
        extras.terceiros.length
          ? `<p>Empresas terceirizadas que trabalham aqui: ${extras.terceiros.map((t) => `${escape(t.razaoSocial)} (${escape(t.servico)})`).join('; ')}.
             Elas têm o próprio PGR, mas recebem desta empresa as informações sobre os riscos do local, como pede a NR-01 (item 1.5.8).</p>`
          : ''
      }`,
    },
    {
      titulo: 'Referências normativas',
      html: `${p('Este programa foi feito com base nas normas abaixo. Além da NR-01, entram as que têm relação com os riscos encontrados nesta empresa.')}${referencias}`,
    },
    {
      titulo: 'Definições',
      html: tabelaDuasColunas(['Termo', 'O que quer dizer neste documento'], [
        ['Perigo', 'Aquilo que pode causar lesão ou doença: uma máquina, um produto químico, o ruído, uma postura, uma situação.'],
        ['Risco', 'A combinação da gravidade do dano que o perigo pode causar com a chance de isso acontecer.'],
        ['Fonte ou circunstância', 'Onde o perigo está ou em que situação ele aparece.'],
        ['GHE (grupo de exposição)', 'Grupo de trabalhadores que fica exposto aos mesmos riscos, de forma parecida.'],
        ['Severidade', 'O tamanho do dano que pode acontecer, de insignificante (1) a gravíssimo (5).'],
        ['Probabilidade', 'A chance de o dano acontecer com as proteções que existem hoje, de rara (1) a quase certa (5).'],
        ['Nível de risco', 'Resultado da severidade vezes a probabilidade. Define o que resolver primeiro.'],
        ['Avaliação qualitativa', 'Feita pela observação do trabalho, sem medição com aparelho.'],
        ['Avaliação quantitativa', 'Feita com medição (ruído, calor, poeira, vapores etc.), comparada com o limite da norma.'],
        ['EPC', 'Equipamento de proteção coletiva, que protege todos de uma vez (proteção de máquina, exaustor, guarda-corpo).'],
        ['EPI', 'Equipamento de proteção individual, usado pela pessoa (luva, protetor auricular, óculos, máscara).'],
        ['Plano de ação', 'Lista do que vai ser feito para controlar os riscos, com responsável, prazo e situação.'],
      ]),
    },
    {
      titulo: 'Responsabilidades',
      html: tabelaDuasColunas(['Quem', 'O que faz'], [
        ['Empresa (empregador)', 'Implantar o PGR, garantir os recursos para as ações, nomear responsáveis, informar os trabalhadores sobre os riscos e manter o documento à disposição da fiscalização.'],
        ['Responsável pela elaboração', 'Levantar e avaliar os riscos, propor as medidas, orientar a empresa na execução do plano e revisar o programa quando necessário.'],
        ['Gestores e encarregados', 'Fazer as ações que estão sob sua responsabilidade, cobrar o uso das proteções e avisar quando algo mudar no setor.'],
        ['Trabalhadores', 'Seguir as orientações de segurança, usar e cuidar dos EPIs, participar dos treinamentos e avisar sobre situações de risco. Quem vê risco grave e iminente pode interromper a atividade e comunicar o superior (NR-01, item 1.4.3).'],
        ['CIPA ou representante da NR-05', 'Acompanhar o PGR, participar das inspeções, sugerir melhorias e ajudar a divulgar os riscos.'],
        ['Médico do PCMSO', 'Usar os riscos deste PGR para planejar os exames e avisar a empresa quando os exames mostrarem relação entre trabalho e adoecimento.'],
      ]),
    },
    {
      titulo: 'Metodologia',
      html: `${p(
        `O levantamento começou pela conversa com a empresa e pelos documentos disponíveis. Depois, os setores foram percorridos e as
        atividades acompanhadas, conversando com quem faz o trabalho. Para cada grupo de exposição foram registrados os perigos, onde eles
        aparecem, que lesões ou doenças podem causar e as proteções que já existem.`,
        `Cada risco recebeu duas notas, de 1 a 5: a severidade (o tamanho do dano) e a probabilidade (a chance de acontecer, considerando as
        proteções atuais). Multiplicando as duas, chega-se a uma pontuação de 1 a 25, que leva ao nível de risco na matriz abaixo. Quando a
        norma pede ou quando a observação não basta, o agente é medido com aparelho e o resultado é comparado com o limite de tolerância.`,
      )}
      ${matriz()}`,
    },
    {
      titulo: 'Ordem de prioridade das medidas',
      html: `${p('As medidas de prevenção seguem a ordem da NR-01 (item 1.5.5.1.2). Só se passa para o próximo degrau quando o anterior não resolve sozinho:')}
        <ol>
          <li><strong>Eliminar o perigo</strong> ou trocá-lo por algo menos perigoso.</li>
          <li><strong>Proteção coletiva (EPC)</strong>: isolar a fonte, enclausurar, ventilar, proteger a máquina.</li>
          <li><strong>Organização do trabalho</strong>: procedimentos, pausas, rodízio, sinalização, treinamento.</li>
          <li><strong>Proteção individual (EPI)</strong>: último recurso, ou complemento das medidas acima.</li>
        </ol>
        ${p('Por isso, no inventário, as medidas de cada risco aparecem separadas em EPC, EPI e outras medidas.')}`,
    },
    {
      titulo: 'Processos e ambientes de trabalho',
      html: `${extras.processos ? `<p>${escape(extras.processos).replace(/\n/g, '<br>')}</p>` : ''}
        ${ghes.length ? `<p>Cada grupo de exposição trabalha em um ambiente com características próprias:</p>${ambientesHtml(ghes)}` : '<p class="falta">Falta cadastrar os GHEs e descrever o ambiente de cada um.</p>'}`,
    },
    {
      titulo: 'Inventário de riscos',
      html: `${p('A seguir estão os riscos encontrados em cada grupo de exposição, com as funções, as atividades, a avaliação e as medidas de prevenção.')}
        ${inventario || '<p class="falta">Nenhum GHE cadastrado.</p>'}`,
    },
    psicossociais.length > 0 && {
      titulo: 'Fatores psicossociais',
      html: `${p(
        `A NR-01 pede que o gerenciamento de riscos inclua também os fatores ligados à organização do trabalho, como excesso de demanda,
        pouca autonomia, falta de apoio e conflitos. Esses fatores foram levantados com um questionário aplicado aos trabalhadores, de forma
        anônima, e o resultado de cada grupo entrou no inventário.`,
      )}
      <ul>${psicossociais.map((x) => `<li>${selo(x.nivel)} <strong>${escape(x.ghe)}</strong>: ${escape(x.r.agente.replace(/^fatores psicossociais:\s*/i, ''))}</li>`).join('')}</ul>
      ${p('As medidas para esses fatores entram no plano de ação, como as dos demais riscos, e devem ser conversadas com os trabalhadores antes de serem colocadas em prática.')}`,
    },
    {
      titulo: 'Plano de ação',
      html: `${prioritariosHtml}${acoes}
        ${p('Cada ação concluída ganha data e foto de comprovação. Depois de concluída, o risco é avaliado de novo para confirmar que a medida funcionou. A coluna "Tipo de medida" segue a ordem da NR-01: primeiro eliminar o perigo, depois trocar por algo menos perigoso, proteção coletiva, organização do trabalho e, por último, EPI.')}`,
    },
    {
      titulo: 'Cronograma anual de ações',
      html: `${p('O quadro abaixo distribui ao longo dos próximos 12 meses as ações de rotina do programa (treinamentos, palestras, inspeções, simulados e a revisão do PGR) e as ações do plano que têm prazo nesse período.')}
        ${cronogramaHtml(extras.emitidoEm, cronogramaPgr(extras.emitidoEm, extras.acoes, referenciasPelosRiscos(todos.map((x) => x.r), e.cnae).map((r) => r[0]).filter((n) => ['NR-10', 'NR-11', 'NR-12', 'NR-20', 'NR-33', 'NR-35'].includes(n))))}`,
    },
    {
      titulo: 'Acompanhamento',
      html: `${p('Ter o plano não basta: é preciso conferir se ele está andando e se as medidas estão funcionando. O acompanhamento é feito assim:')}
        ${lista([
          'inspeções periódicas nos setores, com registro de fotos e do que foi encontrado;',
          'conferência do plano de ação: o que foi feito, o que atrasou e por quê;',
          'análise dos acidentes, quase acidentes e relatos dos trabalhadores, que podem mostrar riscos que ninguém tinha visto;',
          'resultados dos exames do PCMSO, que podem indicar que alguma proteção não está funcionando;',
          'controle da entrega e da troca dos EPIs, com atenção à validade do CA.',
        ])}`,
    },
    {
      titulo: 'Preparação para emergências',
      html: p(
        `A NR-01 pede que a empresa esteja preparada para responder a emergências, como incêndio, vazamento, choque elétrico ou acidente grave.
        O que fazer em cada caso, quem faz e para onde ir estão no Plano de Emergência da empresa${extras.pontoEncontro ? `. O ponto de encontro é: <strong>${escape(extras.pontoEncontro)}</strong>` : ''}.`,
        'Todos os trabalhadores devem conhecer as saídas, os extintores e o ponto de encontro. A brigada, quando exigida, deve estar treinada e os simulados, em dia.',
      ),
    },
    {
      titulo: 'Ligação com outros programas',
      html: lista([
        '<strong>PCMSO:</strong> os exames de cada função são definidos a partir dos riscos deste inventário.',
        '<strong>Treinamentos:</strong> as normas ligadas aos riscos encontrados indicam quais treinamentos cada função precisa.',
        '<strong>EPI:</strong> os equipamentos indicados aqui são os que entram na ficha de cada trabalhador.',
        '<strong>LTCAT e laudos:</strong> as avaliações dos agentes físicos, químicos e biológicos servem de base para a aposentadoria especial, a insalubridade e a periculosidade.',
        '<strong>eSocial:</strong> os agentes deste inventário são informados no evento S-2240.',
      ]),
    },
    {
      titulo: 'Revisão e vigência',
      html: `${p(`Este PGR passa a valer na data de emissão${extras.controle.proximaRevisao ? ` e deve ser revisto até ${dataBr(extras.controle.proximaRevisao)}` : ''}. Ele precisa ser revisto antes disso sempre que:`)}
        ${lista([
          'uma medida de prevenção for implantada, para avaliar o risco que sobrou;',
          'mudar algum processo, máquina, produto, setor ou a forma de organizar o trabalho;',
          'alguma medida se mostrar insuficiente ou não estiver funcionando;',
          'acontecer um acidente ou adoecimento relacionado ao trabalho;',
          'mudar alguma norma que se aplique à empresa;',
          'os trabalhadores ou a CIPA pedirem, com motivo.',
        ])}
        ${p('O histórico das versões fica guardado no sistema. A NR-01 pede que esse histórico seja mantido por, no mínimo, 20 anos.')}`,
    },
    {
      titulo: 'Considerações finais',
      html: p(
        `Este programa retrata a empresa no momento em que foi elaborado, com base no que foi visto e nas informações passadas pela
        ${nomeEmpresa}. Ele deve ficar disponível para os trabalhadores, para a CIPA e para a fiscalização.`,
        'O resultado depende de todos: da empresa, que garante os recursos; dos gestores, que fazem as ações acontecer; e de cada trabalhador, que conhece o próprio trabalho melhor do que ninguém e deve ser ouvido.',
      ),
    },
  ]);

  const corpo = `${secoes}
    ${blocoAssinaturas(extras.local, extras.emitidoEm, [
      { nome: extras.responsavel.nome, papel: 'Responsável pela elaboração', registro: extras.responsavel.registro },
      { nome: extras.representanteLegal, papel: 'Representante da organização' },
    ])}`;

  return documentoHtml(
    moldura,
    corpo,
    `${CSS_SECOES}${CSS_CRONOGRAMA}
     .ghe table { font-size: 10px; } .c { text-align: center; }
     .matriz { width: 100%; margin-bottom: 8px; } .matriz td, .matriz th { min-width: 70px; font-size: 10px; } .matriz .pts { font-size: 9px; color: #64748b; }`,
  );
}
