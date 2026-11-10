import { documentoHtml, escape, Moldura } from './layout';

export type AgenteLtcat = {
  tipo: string; agente: string; fonteGeradora: string; tipoAvaliacao: string | null; intensidade: string | null; limiteTolerancia: string | null;
  tecnicaMedicao: string | null; epcEficaz: boolean | null; epiEficaz: boolean | null; epiCa: string | null; codigoAnexoIv: string | null; aposentadoriaEspecial: boolean;
};
export type GheLtcat = { nome: string; descricao: string | null; cargos: string[]; colaboradores: number; agentes: AgenteLtcat[] };
export type Responsavel = { nome: string | null; registro: string | null };

const TIPO: Record<string, string> = { FISICO: 'Físico', QUIMICO: 'Químico', BIOLOGICO: 'Biológico' };
const simNao = (v: boolean | null) => (v === null ? '—' : v ? 'Sim' : 'Não');
const avaliacao = (a: AgenteLtcat) => (a.tipoAvaliacao === 'QUANTITATIVA' ? 'Quantitativa' : a.tipoAvaliacao === 'QUALITATIVA' ? 'Qualitativa' : 'Não avaliado');

// Só agentes físicos, químicos e biológicos entram no LTCAT (são os que podem ser nocivos para aposentadoria especial).
export const ehAgenteLtcat = (tipo: string) => tipo in TIPO;

export function renderLtcatHtml(moldura: Moldura, ghes: GheLtcat[], responsavel: Responsavel): string {
  const blocos = ghes
    .map((g) => {
      const enquadra = g.agentes.some((a) => a.aposentadoriaEspecial);
      const pendentes = g.agentes.filter((a) => !a.tipoAvaliacao).length;
      return `
      <section class="ghe">
        <h2>${escape(g.nome)} <span class="meta">${g.colaboradores} colaborador(es)</span></h2>
        ${g.descricao ? `<p>${escape(g.descricao)}</p>` : ''}
        <p><strong>Cargos:</strong> ${g.cargos.length ? g.cargos.map(escape).join(', ') : 'nenhum colaborador vinculado'}</p>
        ${
          g.agentes.length
            ? `<table>
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
        </table>`
            : '<p>Não encontramos agente físico, químico ou biológico neste GHE.</p>'
        }
        ${pendentes ? `<p class="alerta">${pendentes} agente(s) ainda sem avaliação registrada.</p>` : ''}
        <p class="conclusao ${enquadra ? 'sim' : 'nao'}"><strong>Conclusão:</strong> ${
          enquadra
            ? 'há exposição a agente nocivo que dá direito à aposentadoria especial, conforme a avaliação acima.'
            : 'não encontramos exposição a agente nocivo que dê direito à aposentadoria especial.'
        }</p>
      </section>`;
    })
    .join('');

  return documentoHtml(
    moldura,
    `
    <section>
      <h2>Para que serve este laudo</h2>
      <p>Mostrar à Previdência Social se os trabalhadores ficam expostos a agentes químicos, físicos ou biológicos que dão direito à
      aposentadoria especial (Lei 8.213/91, art. 58, e Decreto 3.048/99, Anexo IV).</p>
      <h2>Como avaliamos</h2>
      <p>Visitamos os ambientes, acompanhamos as atividades e avaliamos cada agente, com medição quando a norma pede. As medições foram
      comparadas com os limites de tolerância, usando a técnica indicada para cada agente. Na conclusão, levamos em conta se as proteções coletivas e os EPIs funcionam de fato.</p>
    </section>
    ${blocos || '<p>Nenhum GHE cadastrado.</p>'}
    <section>
      <h2>Revisão</h2>
      <p>Sempre que mudar o ambiente, o processo, as atividades ou as proteções, este laudo precisa ser refeito.</p>
    </section>
    <div class="assinaturas"><div class="assinatura">${escape(responsavel.nome ?? '')}<span>Responsável técnico${responsavel.registro ? ` · ${escape(responsavel.registro)}` : ''}</span></div></div>`,
    `.ghe table { font-size: 10px; } .alerta { color: #EF4444; } .conclusao { padding: 8px 10px; border-radius: 8px; margin-top: 8px; }
     .conclusao.sim { background: #FEF2F2; } .conclusao.nao { background: #ECFDF5; }`,
  );
}
