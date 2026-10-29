import { documentoHtml, escape, Moldura } from './layout';

export type ExamePdf = {
  nome: string;
  tipo: string;
  admissional: boolean;
  periodico: boolean;
  retornoTrabalho: boolean;
  mudancaRisco: boolean;
  demissional: boolean;
  periodicidadeMeses: number | null;
};
export type GhePcmso = { nome: string; colaboradores: number; riscos: string[]; exames: ExamePdf[] };
export type Medico = { nome: string | null; crm: string | null };

const marca = (sim: boolean) => (sim ? '●' : '');

export function renderPcmsoHtml(moldura: Moldura, medico: Medico, ghes: GhePcmso[]): string {
  const blocos = ghes
    .map(
      (ghe) => `
      <section>
        <h2>${escape(ghe.nome)} <span class="meta">${ghe.colaboradores} colaborador(es)</span></h2>
        <p class="riscos"><strong>Riscos do PGR:</strong> ${ghe.riscos.length ? ghe.riscos.map(escape).join(', ') : 'nenhum risco cadastrado'}</p>
        ${
          ghe.exames.length
            ? `<table>
          <thead>
            <tr><th>Exame</th><th>Tipo</th><th class="c">Admissional</th><th class="c">Periódico</th><th class="c">Retorno</th><th class="c">Mudança de risco</th><th class="c">Demissional</th><th>Periodicidade</th></tr>
          </thead>
          <tbody>
            ${ghe.exames
              .map(
                (e) => `<tr>
                  <td>${escape(e.nome)}</td>
                  <td>${e.tipo === 'CLINICO' ? 'Clínico' : 'Complementar'}</td>
                  <td class="c">${marca(e.admissional)}</td>
                  <td class="c">${marca(e.periodico)}</td>
                  <td class="c">${marca(e.retornoTrabalho)}</td>
                  <td class="c">${marca(e.mudancaRisco)}</td>
                  <td class="c">${marca(e.demissional)}</td>
                  <td>${e.periodicidadeMeses ? `${e.periodicidadeMeses} meses` : '—'}</td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>`
            : '<p class="vazio">Nenhum exame programado para este GHE.</p>'
        }
      </section>`,
    )
    .join('');

  const medicoHtml = `
    <section class="medico">
      <h2>Médico responsável</h2>
      <p>${escape(medico.nome ?? 'Não informado')} · CRM ${escape(medico.crm ?? 'não informado')}</p>
    </section>`;

  return documentoHtml(
    moldura,
    medicoHtml + (blocos || '<p>Nenhum GHE cadastrado.</p>'),
    `.c { text-align: center; } .riscos { margin: 0 0 4px; } .vazio { color: #6b7280; } .medico p { margin: 0; }`,
  );
}
