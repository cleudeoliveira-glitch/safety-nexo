import { cabecalhoHtml, documentoHtml, escape, folhaHtml, Moldura, rodapeHtml } from '../documentos/layout';
import { ANEXOS_NR15, ANEXOS_NR16, GRAUS, Grau, ehGrau } from './conteudo';

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
    <h3>Insalubridade (NR-15)</h3>
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
    <h3>Periculosidade (NR-16)</h3>
    ${g.periculosidadeJustificativa ? `<p><strong>Fundamentação:</strong> ${escape(g.periculosidadeJustificativa)}</p>` : ''}
    ${conclusao}`;
}

export function laudoHtml(moldura: Moldura, ghes: GheLaudo[], partes: { insalubridade: boolean; periculosidade: boolean }, responsavel: Responsavel): string {
  const objetivo = [
    partes.insalubridade && 'dizer se há ou não insalubridade (CLT, arts. 189 a 192, e NR-15)',
    partes.periculosidade && 'dizer se há ou não periculosidade (CLT, art. 193, e NR-16)',
  ]
    .filter(Boolean)
    .join(' e ');
  const blocos = ghes
    .map(
      (g) => `
      <section class="ghe">
        <h2>${escape(g.nome)} <span class="meta">${g.colaboradores} colaborador(es)</span></h2>
        ${g.descricao ? `<p>${escape(g.descricao)}</p>` : ''}
        <p><strong>Cargos:</strong> ${g.cargos.length ? g.cargos.map(escape).join(', ') : 'nenhum colaborador vinculado'}</p>
        ${partes.insalubridade ? blocoInsalubridade(g) : ''}
        ${partes.periculosidade ? blocoPericulosidade(g) : ''}
      </section>`,
    )
    .join('');

  return documentoHtml(
    moldura,
    `
    <section>
      <h2>Objetivo</h2>
      <p>Este laudo foi feito para ${objetivo}. Para isso, visitamos os locais de trabalho e acompanhamos as atividades de cada grupo de trabalhadores com exposição parecida (GHE).</p>
      <h2>Como avaliamos</h2>
      ${partes.insalubridade ? `<p><strong>Insalubridade:</strong> cada agente foi comparado com o anexo correspondente da NR-15. O grau mínimo dá direito a 10% de adicional, o médio a 20% e o máximo a 40%.
      Se houver mais de um agente, vale só o de grau mais alto, porque os adicionais não se somam (NR-15, 15.3). Também levamos em conta se as proteções coletivas e os EPIs funcionam de fato (NR-15, 15.4.1).</p>` : ''}
      ${partes.periculosidade ? `<p><strong>Periculosidade:</strong> comparamos as atividades com os anexos da NR-16. Quando há periculosidade, o adicional é de 30% sobre o salário-base, sem contar gratificações e prêmios.
      Se a pessoa também tiver direito à insalubridade, ela escolhe um dos dois, porque eles não se acumulam (NR-16, 16.2.1).</p>` : ''}
    </section>
    ${blocos || '<p>Nenhum GHE cadastrado.</p>'}
    <section>
      <h2>Revisão</h2>
      <p>Sempre que mudar o ambiente, o processo, as atividades ou as proteções, este laudo precisa ser refeito.</p>
    </section>
    <div class="assinaturas"><div class="assinatura">${escape(responsavel.nome ?? '')}<span>Responsável técnico${responsavel.registro ? ` · ${escape(responsavel.registro)}` : ''}</span></div></div>`,
    `.ghe table { font-size: 10px; } h3 { font-size: 13px; margin: 14px 0 6px; } .alerta { color: #EF4444; }
     .conclusao { padding: 8px 10px; border-radius: 8px; margin-top: 8px; } .conclusao.sim { background: #FEF2F2; } .conclusao.nao { background: #ECFDF5; } .conclusao.pendente { background: #FFFBEB; }`,
  );
}

// PGRTR: o mesmo inventário do PGR, com a base da NR-31 e os temas próprios do trabalho rural.
export type RiscoPgrtr = { tipo: string; agente: string; fonteGeradora: string; medidasControle: string | null; severidade: string };
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

export function pgrtrHtml(moldura: Moldura, ghes: { nome: string; descricao: string | null; colaboradores: number; riscos: RiscoPgrtr[] }[]): string {
  const sev: Record<string, string> = { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta' };
  const inventario = ghes
    .map(
      (g) => `
      <section class="ghe">
        <h2>${escape(g.nome)} <span class="meta">${g.colaboradores} trabalhador(es)</span></h2>
        ${g.descricao ? `<p>${escape(g.descricao)}</p>` : ''}
        <table>
          <thead><tr><th>Tipo</th><th>Agente / perigo</th><th>Fonte geradora</th><th>Medidas de prevenção</th><th>Severidade</th></tr></thead>
          <tbody>${g.riscos
            .map((r) => `<tr><td>${TIPO[r.tipo] ?? r.tipo}</td><td>${escape(r.agente)}</td><td>${escape(r.fonteGeradora)}</td><td>${escape(r.medidasControle)}</td><td>${sev[r.severidade] ?? r.severidade}</td></tr>`)
            .join('')}</tbody>
        </table>
      </section>`,
    )
    .join('');
  return documentoHtml(
    moldura,
    `
    <section>
      <h2>Objetivo</h2>
      <p>Este programa reúne os perigos do trabalho no campo, o tamanho de cada risco e o que será feito para prevenir acidentes e doenças, seguindo a NR-31 (31.3) e a NR-01.</p>
      <h2>O que olhamos no trabalho rural</h2>
      <ul>${TEMAS_RURAIS.map((t) => `<li>${escape(t)}</li>`).join('')}</ul>
    </section>
    <h2>Riscos de cada grupo</h2>
    ${inventario || '<p>Nenhum GHE cadastrado.</p>'}
    <section>
      <h2>Revisão</h2>
      <p>O programa precisa ser revisto se mudarem as atividades, as culturas, as máquinas ou os produtos usados, depois de um acidente e, de qualquer forma, no prazo da revisão periódica.</p>
    </section>`,
  );
}

// Ordem de Serviço de SST (NR-01, item 1.4.1, alínea c).
export type DadosOs = {
  colaborador: { nome: string; cpf: string | null; cargo: string; cbo: string | null };
  ghe: { nome: string; descricao: string | null } | null;
  riscos: RiscoPgrtr[];
  epis: string[];
};

const DEVERES = [
  'Seguir as regras de segurança e as instruções desta ordem de serviço',
  'Usar os EPIs só para o que eles servem, guardar e cuidar bem deles',
  'Avisar o superior quando o EPI estragar ou deixar de proteger',
  'Fazer os exames médicos previstos no PCMSO',
  'Participar dos treinamentos e diálogos de segurança',
  'Comunicar imediatamente qualquer acidente, quase acidente ou condição insegura',
  'Respeitar a sinalização e as áreas de acesso restrito',
];
const PROIBICOES = [
  'Operar máquinas, equipamentos ou veículos sem treinamento e autorização',
  'Retirar ou desativar proteções e dispositivos de segurança',
  'Fazer manutenção ou limpeza em máquinas energizadas ou em movimento',
  'Trabalhar sob efeito de álcool ou outras substâncias',
  'Fumar ou fazer fogo fora dos locais permitidos',
];

function paginaOs(d: DadosOs): string {
  return `
    <section>
      <h2>Identificação</h2>
      <table><tbody>
        <tr><th>Trabalhador</th><td>${escape(d.colaborador.nome)}</td></tr>
        <tr><th>CPF</th><td>${escape(d.colaborador.cpf)}</td></tr>
        <tr><th>Cargo</th><td>${escape(d.colaborador.cargo)}${d.colaborador.cbo ? ` (CBO ${escape(d.colaborador.cbo)})` : ''}</td></tr>
        <tr><th>Setor / GHE</th><td>${escape(d.ghe?.nome)}</td></tr>
      </tbody></table>
      ${d.ghe?.descricao ? `<h2>Atividades</h2><p>${escape(d.ghe.descricao)}</p>` : ''}
      <h2>Riscos da atividade e medidas de prevenção</h2>
      ${
        d.riscos.length
          ? `<table><thead><tr><th>Tipo</th><th>Risco</th><th>Fonte</th><th>Como se proteger</th></tr></thead><tbody>${d.riscos
              .map((r) => `<tr><td>${TIPO[r.tipo] ?? r.tipo}</td><td>${escape(r.agente)}</td><td>${escape(r.fonteGeradora)}</td><td>${escape(r.medidasControle)}</td></tr>`)
              .join('')}</tbody></table>`
          : '<p>Nenhum risco cadastrado para o GHE deste trabalhador.</p>'
      }
      <h2>EPIs de uso obrigatório</h2>
      <p>${d.epis.length ? d.epis.map(escape).join(', ') : 'Conforme a ficha de EPI e as medidas acima.'}</p>
      <h2>Deveres do trabalhador</h2>
      <ul>${DEVERES.map((x) => `<li>${x}</li>`).join('')}</ul>
      <h2>É proibido</h2>
      <ul>${PROIBICOES.map((x) => `<li>${x}</li>`).join('')}</ul>
      <h2>Em caso de acidente</h2>
      <p>Pare o que está fazendo, peça socorro e avise na hora o seu superior ou o responsável pela segurança. Não mexa no local, a não ser para socorrer alguém.</p>
      <p class="legal">Recusar sem motivo estas instruções ou o uso dos EPIs fornecidos é falta do empregado (CLT, art. 158, parágrafo único).</p>
      <p>Recebi esta ordem de serviço, ela me foi explicada e entendi o que está escrito.</p>
    </section>
    <div class="assinaturas">
      <div class="assinatura">${escape(d.colaborador.nome)}<span>Trabalhador · data ____/____/______</span></div>
      <div class="assinatura">&nbsp;<span>Empresa</span></div>
    </div>`;
}

const CSS_OS = `body { font-size: 11px; } h2 { font-size: 13px; margin: 10px 0 4px; } td, th { padding: 3px 6px; } .assinaturas { margin-top: 28px; } table { width: 100%; } tbody th { text-align: left; width: 28%; } ul { margin: 4px 0 8px; padding-left: 18px; } .legal { font-weight: 600; }`;

export function osHtml(moldura: Moldura, lista: DadosOs[]): string {
  if (lista.length === 1) return documentoHtml(moldura, paginaOs(lista[0]), CSS_OS);
  // Uma ordem por trabalhador, cada uma em sua página com as duas logos.
  const paginas = lista
    .map((d, i) => `<div class="${i < lista.length - 1 ? 'quebra' : ''}">${cabecalhoHtml({ ...moldura, infos: [...moldura.infos, ['Trabalhador', d.colaborador.nome]] })}${paginaOs(d)}${rodapeHtml(moldura)}</div>`)
    .join('');
  return folhaHtml(paginas, CSS_OS);
}
