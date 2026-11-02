import { documentoHtml, escape, Moldura } from '../documentos/layout';
import type { situacaoCipa } from './cipa.service';

const data = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });

export function renderCipaHtml(moldura: Moldura, cipa: ReturnType<typeof situacaoCipa>): string {
  const d = cipa.dimensionamento;
  const base = `
    <section>
      <h2>Enquadramento</h2>
      <p><strong>Grau de risco:</strong> ${cipa.grauRisco ?? 'não informado'} (NR-04) · <strong>Empregados no estabelecimento:</strong> ${cipa.numFuncionarios}</p>
    </section>`;

  let resultado: string;
  if (d.situacao === 'SEM_GRAU') {
    resultado = '<p class="alerta">Informe o grau de risco da empresa para dimensionar a CIPA.</p>';
  } else if (d.situacao === 'CIPA') {
    resultado = `
      <section>
        <h2>Composição exigida (NR-05, Quadro I)</h2>
        <table>
          <thead><tr><th>Representação</th><th class="c">Efetivos</th><th class="c">Suplentes</th></tr></thead>
          <tbody>
            <tr><td>Representantes dos empregados (eleitos)</td><td class="c">${d.efetivos}</td><td class="c">${d.suplentes}</td></tr>
            <tr><td>Representantes da organização (indicados)</td><td class="c">${d.efetivos}</td><td class="c">${d.suplentes}</td></tr>
            <tr class="total"><td>Total da comissão</td><td class="c">${d.efetivos * 2}</td><td class="c">${d.suplentes * 2}</td></tr>
          </tbody>
        </table>
      </section>`;
  } else {
    resultado = `
      <section>
        <h2>Resultado</h2>
        <p>A empresa está abaixo do Quadro I da NR-05 (CIPA obrigatória a partir de ${d.minimoParaCipa} empregados neste grau de risco).</p>
        <p>${
          cipa.atendidaSesmt
            ? 'Como a empresa é atendida por SESMT, ele cumpre as atribuições da CIPA (item 5.4.13.1).'
            : `A organização deve nomear um representante entre os empregados para auxiliar nas ações de prevenção (item 5.4.13).
               <br><strong>Representante nomeado:</strong> ${escape(cipa.representante ?? 'não informado')}`
        }</p>
      </section>`;
  }

  const c = cipa.calendario;
  const calendario = c
    ? `
      <section>
        <h2>Calendário do mandato</h2>
        <table>
          <tbody>
            <tr><td>Início do mandato</td><td>${data(c.inicioMandato)}</td></tr>
            <tr><td>Fim do mandato (1 ano, item 5.4.6)</td><td>${data(c.fimMandato)}</td></tr>
            ${
              d.situacao === 'CIPA'
                ? `<tr><td>Publicar edital de convocação até (item 5.5.1)</td><td>${data(c.convocacaoAte)}</td></tr>
                   <tr><td>Realizar a eleição até (item 5.5.3, f)</td><td>${data(c.eleicaoAte)}</td></tr>
                   <tr><td>Posse da nova gestão (item 5.4.7)</td><td>${data(c.posse)}</td></tr>`
                : ''
            }
          </tbody>
        </table>
      </section>`
    : '';

  return documentoHtml(moldura, base + resultado + calendario, `.c { text-align: center; } .total td { font-weight: 600; } .alerta { color: #EF4444; }`);
}
