import { documentoHtml, escape, Moldura } from './layout';
import { Controle, CSS_SECOES, blocoAssinaturas, controleDocumento, dataBr, lista, p, secoesNumeradas, tabelaDuasColunas, tabelaReferencias } from './secoes';

export type AgenteLtcat = {
  tipo: string; agente: string; fonteGeradora: string; tipoAvaliacao: string | null; intensidade: string | null; limiteTolerancia: string | null;
  tecnicaMedicao: string | null; epcEficaz: boolean | null; epiEficaz: boolean | null; epiCa: string | null; codigoAnexoIv: string | null; aposentadoriaEspecial: boolean;
};
export type GheLtcat = { nome: string; descricao: string | null; cargos: string[]; colaboradores: number; agentes: AgenteLtcat[]; ambiente?: string | null };
export type ExtrasLtcat = {
  controle: Controle;
  empresa: { razaoSocial: string; cnae: string | null; endereco: string | null; numFuncionarios: number };
  formacao: string | null;
  representanteLegal: string | null;
  local: string | null;
};
export type Responsavel = { nome: string | null; registro: string | null };

const TIPO: Record<string, string> = { FISICO: 'Físico', QUIMICO: 'Químico', BIOLOGICO: 'Biológico' };
const simNao = (v: boolean | null) => (v === null ? '—' : v ? 'Sim' : 'Não');
const avaliacao = (a: AgenteLtcat) => (a.tipoAvaliacao === 'QUANTITATIVA' ? 'Quantitativa' : a.tipoAvaliacao === 'QUALITATIVA' ? 'Qualitativa' : 'Não avaliado');

// Só agentes físicos, químicos e biológicos entram no LTCAT (são os que podem ser nocivos para aposentadoria especial).
export const ehAgenteLtcat = (tipo: string) => tipo in TIPO;


function tabelaAgentes(g: GheLtcat): string {
  if (!g.agentes.length) return '<p>Não foi identificado agente físico, químico ou biológico neste GHE.</p>';
  return `<table>
    <thead><tr><th>Tipo</th><th>Agente</th><th>Fonte</th><th>Avaliação</th><th>Resultado</th><th>Limite</th><th>Técnica</th><th>EPC eficaz</th><th>EPI eficaz (CA)</th><th>Anexo IV</th></tr></thead>
    <tbody>${g.agentes
      .map(
        (a) => `<tr>
        <td>${TIPO[a.tipo]}</td><td>${escape(a.agente)}</td><td>${escape(a.fonteGeradora)}</td><td>${avaliacao(a)}</td>
        <td>${escape(a.intensidade ?? '—')}</td><td>${escape(a.limiteTolerancia ?? '—')}</td><td>${escape(a.tecnicaMedicao ?? '—')}</td>
        <td>${simNao(a.epcEficaz)}</td><td>${simNao(a.epiEficaz)}${a.epiCa ? ` (${escape(a.epiCa)})` : ''}</td><td>${escape(a.codigoAnexoIv ?? '—')}</td>
      </tr>`,
      )
      .join('')}</tbody>
  </table>`;
}

function blocoGhe(g: GheLtcat): string {
  const pendentes = g.agentes.filter((a) => !a.tipoAvaliacao).length;
  const nocivos = g.agentes.filter((a) => a.aposentadoriaEspecial);
  return `
    <section class="ghe">
      <h3>${escape(g.nome)} <span class="meta">${g.colaboradores} colaborador(es)</span></h3>
      ${g.descricao ? `<p>${escape(g.descricao).replace(/\n/g, '<br>')}</p>` : ''}
      <p><strong>Cargos:</strong> ${g.cargos.length ? g.cargos.map(escape).join(', ') : 'nenhum colaborador vinculado'}</p>
      ${tabelaAgentes(g)}
      ${pendentes ? `<p class="alerta">${pendentes} agente(s) ainda sem avaliação registrada.</p>` : ''}
      <p class="conclusao ${nocivos.length ? 'sim' : 'nao'}"><strong>Parecer:</strong> ${
        nocivos.length
          ? `há exposição permanente, não ocasional nem intermitente, ${nocivos.length > 1 ? 'aos agentes' : 'ao agente'} ${nocivos.map((a) => escape(a.agente)).join(', ')}, acima do limite ou reconhecida de forma qualitativa, sem proteção que neutralize o efeito. A atividade se enquadra para aposentadoria especial${nocivos.some((a) => a.codigoAnexoIv) ? ` (código ${nocivos.map((a) => a.codigoAnexoIv).filter(Boolean).map((c) => escape(c)).join(', ')} do Anexo IV do Decreto 3.048/99)` : ''}.`
          : 'não foi constatada exposição a agente nocivo que, pela intensidade, concentração ou forma de exposição, enseje aposentadoria especial.'
      }</p>
    </section>`;
}

export function renderLtcatHtml(moldura: Moldura, ghes: GheLtcat[], responsavel: Responsavel, extras: ExtrasLtcat): string {
  const e = extras.empresa;
  const nomeEmpresa = escape(e.razaoSocial);
  const total = ghes.reduce((t, g) => t + g.colaboradores, 0) || e.numFuncionarios;
  const conclusaoLinhas = ghes.map((g) => {
    const nocivos = g.agentes.filter((a) => a.aposentadoriaEspecial);
    return `<tr><td>${escape(g.nome)}</td><td>${g.cargos.length ? g.cargos.map(escape).join(', ') : '—'}</td>
      <td>${nocivos.length ? nocivos.map((a) => escape(a.agente)).join(', ') : 'Nenhum'}</td>
      <td class="c">${nocivos.length ? '<strong>Sim</strong>' : 'Não'}</td>
      <td>${nocivos.length ? nocivos.map((a) => escape(a.codigoAnexoIv ?? 'a informar')).join(', ') : '—'}</td></tr>`;
  });

  const secoes = secoesNumeradas([
    { titulo: 'Controle do documento', html: controleDocumento(extras.controle) },
    {
      titulo: 'Identificação',
      html: tabelaDuasColunas(['Dado', 'Informação'], [
        ['Empresa', nomeEmpresa],
        ['Endereço', e.endereco ? escape(e.endereco) : '<span class="falta">não informado</span>'],
        ['CNAE', e.cnae ? escape(e.cnae) : '<span class="falta">não informado</span>'],
        ['Trabalhadores', String(total)],
        ['Responsável técnico', responsavel.nome ? `${escape(responsavel.nome)}${extras.formacao ? `, ${escape(extras.formacao)}` : ''}${responsavel.registro ? ` · ${escape(responsavel.registro)}` : ''}` : '<span class="falta">não informado</span>'],
      ]),
    },
    {
      titulo: 'Introdução',
      html: p(
        `O Laudo Técnico das Condições Ambientais do Trabalho (LTCAT) é o documento que a Previdência Social usa para saber se um
        trabalhador ficou exposto a agentes que fazem mal à saúde, a ponto de dar direito à aposentadoria especial. Ele é exigido pela
        Lei 8.213/91 (art. 58) e é a base para o preenchimento do PPP e das informações do eSocial (evento S-2240).`,
        `Este laudo descreve os ambientes da ${nomeEmpresa}, os agentes físicos, químicos e biológicos encontrados em cada grupo de
        exposição, como eles foram avaliados e se as proteções coletivas e individuais funcionam. No fim, traz a conclusão por função.`,
      ),
    },
    {
      titulo: 'Objetivo',
      html: lista([
        'identificar e avaliar os agentes nocivos físicos, químicos e biológicos presentes nos ambientes de trabalho;',
        'verificar se a exposição é permanente, não ocasional nem intermitente;',
        'registrar se existe tecnologia de proteção coletiva ou individual que elimine ou reduza o agente abaixo do limite;',
        'concluir, para cada grupo e função, se há ou não enquadramento para aposentadoria especial;',
        'servir de base para o PPP e para as informações do eSocial.',
      ]),
    },
    {
      titulo: 'Referências legais e técnicas',
      html: tabelaReferencias([
        ['Lei 8.213/1991, art. 57 e 58', 'Aposentadoria especial e exigência do laudo técnico'],
        ['Decreto 3.048/1999, art. 64 a 70 e Anexo IV', 'Regulamento da Previdência e classificação dos agentes nocivos'],
        ['IN PRES/INSS 128/2022', 'Procedimentos do INSS para caracterização da atividade especial e conteúdo do LTCAT'],
        ['NR-15 e seus anexos', 'Limites de tolerância e critérios de avaliação dos agentes'],
        ['NR-09', 'Avaliação e controle das exposições ocupacionais'],
        ['NHOs da Fundacentro', 'Normas de higiene ocupacional com os métodos de medição (ruído, calor, vibração, poeiras e outros)'],
        ['LINACH (Portaria Interministerial 9/2014)', 'Lista de agentes cancerígenos para humanos, avaliados de forma qualitativa'],
      ]),
    },
    {
      titulo: 'Definições',
      html: tabelaDuasColunas(['Termo', 'O que quer dizer neste documento'], [
        ['Agente nocivo', 'Agente físico, químico ou biológico que, pela natureza, intensidade ou tempo de exposição, pode prejudicar a saúde.'],
        ['Exposição permanente', 'Aquela que faz parte da rotina do trabalho, indissociável da atividade, e não acontece só de vez em quando.'],
        ['Avaliação quantitativa', 'Medição do agente com aparelho, comparada com o limite de tolerância.'],
        ['Avaliação qualitativa', 'Reconhecimento do agente pela presença no ambiente, usado para agentes biológicos e cancerígenos, que não têm limite seguro.'],
        ['EPC ou EPI eficaz', 'Proteção que comprovadamente elimina ou reduz o agente abaixo do limite, com uso efetivo, troca e higienização em dia.'],
        ['Código do Anexo IV', 'Código do agente no Anexo IV do Decreto 3.048/99, informado no PPP e no eSocial.'],
      ]),
    },
    {
      titulo: 'Metodologia',
      html: p(
        `Os ambientes foram visitados e as atividades acompanhadas, com conversa com os trabalhadores e os encarregados sobre a rotina,
        a jornada e as proteções usadas. Cada agente foi avaliado do jeito que a norma pede: com medição quando há limite de tolerância
        (seguindo as NHOs da Fundacentro e os anexos da NR-15) ou de forma qualitativa quando se trata de agente biológico ou cancerígeno.`,
        `Na análise da proteção, foram conferidos o tipo de EPC existente, o EPI fornecido com o número do CA, o registro de entrega,
        o treinamento e a troca periódica. A proteção só foi considerada eficaz quando tudo isso estava comprovado.`,
      ),
    },
    {
      titulo: 'Avaliação por grupo de exposição',
      html: `${p('A seguir, cada grupo de exposição com o seu ambiente, os cargos, os agentes avaliados e o parecer.')}${ghes.map(blocoGhe).join('') || '<p class="falta">Nenhum GHE cadastrado.</p>'}`,
    },
    {
      titulo: 'Conclusão',
      html: `${p('Com base nas avaliações acima, a conclusão por grupo e função é a seguinte:')}
        <table><thead><tr><th>GHE</th><th>Cargos</th><th>Agente nocivo</th><th class="c">Aposentadoria especial</th><th>Código Anexo IV</th></tr></thead>
        <tbody>${conclusaoLinhas.join('') || '<tr><td colspan="5">Nenhum GHE cadastrado.</td></tr>'}</tbody></table>
        ${p('Esta conclusão vale para as condições encontradas na data da avaliação. Ela não se confunde com o laudo de insalubridade ou periculosidade, que segue a CLT e tem critérios próprios.')}`,
    },
    {
      titulo: 'Revisão e vigência',
      html: `${p(`A lei não fixa prazo de validade para o LTCAT, mas ele precisa ser refeito sempre que algo mudar no ambiente. Por segurança, recomendamos conferir as condições até ${dataBr(extras.controle.proximaRevisao)}. Ele deve ser revisto quando:`)}
        ${lista(['mudar o layout, as máquinas, os produtos ou o processo de trabalho;', 'mudarem as proteções coletivas ou os EPIs;', 'forem criadas novas funções ou setores;', 'uma nova medição apontar resultado diferente.'])}`,
    },
  ]);

  return documentoHtml(
    moldura,
    `${secoes}
     ${blocoAssinaturas(extras.local, extras.controle.emitidoEm, [
       { nome: responsavel.nome, papel: extras.formacao ?? 'Responsável técnico', registro: responsavel.registro },
       { nome: extras.representanteLegal, papel: 'Representante da organização' },
     ])}`,
    `${CSS_SECOES} .ghe table { font-size: 10px; } .c { text-align: center; } .alerta { color: #EF4444; } .conclusao { padding: 8px 10px; border-radius: 8px; margin-top: 8px; }
     .conclusao.sim { background: #FEF2F2; } .conclusao.nao { background: #ECFDF5; }`,
  );
}
