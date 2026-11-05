import { documentoHtml, escape, Moldura } from '../documentos/layout';
import { grauDoModelo, MODELOS_CHECKLIST } from './modelos';
import { Faixa, multaItem, NOTA_MULTA, reais, somar } from './multas';

export type ItemInspecao = { texto: string; resposta: 'C' | 'NC' | 'NA'; observacao?: string; grau?: number };
const RESPOSTA = { C: 'Conforme', NC: 'Não conforme', NA: 'Não se aplica' };

// Conformidade = itens conformes sobre os itens que se aplicam.
export function conformidade(itens: ItemInspecao[]) {
  const aplicaveis = itens.filter((i) => i.resposta !== 'NA').length;
  const conformes = itens.filter((i) => i.resposta === 'C').length;
  return { aplicaveis, conformes, naoConformes: aplicaveis - conformes, percentual: aplicaveis ? Math.round((conformes / aplicaveis) * 100) : 100 };
}

// Multa estimada de cada não conformidade e o total, pelo número de empregados da empresa.
export function multasInspecao(modelo: string, itens: ItemInspecao[], empregados: number) {
  const tipo = MODELOS_CHECKLIST[modelo]?.tipo ?? 'S';
  const porItem: (Faixa | null)[] = itens.map((i) => (i.resposta === 'NC' ? multaItem(i.grau ?? grauDoModelo(modelo, i.texto) ?? 0, empregados, tipo) : null));
  return { porItem, total: somar(porItem), empregados };
}

export const resumoInspecao = (modelo: string, itens: ItemInspecao[], empregados: number) => {
  const m = multasInspecao(modelo, itens, empregados);
  return { ...conformidade(itens), multa: m.total };
};

const faixaTexto = (f: Faixa | null) => (f ? `${reais(f.minimo)} a ${reais(f.maximo)}` : '');

export function inspecaoHtml(moldura: Moldura, d: { modelo: string; titulo: string; local: string; data: Date; inspetor: string; itens: ItemInspecao[] }, empregados: number): string {
  const c = conformidade(d.itens);
  const ncs = d.itens.map((i, n) => ({ ...i, n })).filter((i) => i.resposta === 'NC');
  const multas = multasInspecao(d.modelo, d.itens, empregados);
  const temMulta = multas.total.maximo > 0;
  return documentoHtml(
    moldura,
    `
    <section>
      <p><strong>Checklist:</strong> ${escape(d.titulo)} · <strong>Local:</strong> ${escape(d.local)} · <strong>Data:</strong> ${d.data.toLocaleDateString('pt-BR', { timeZone: 'UTC' })} · <strong>Inspetor(a):</strong> ${escape(d.inspetor)}</p>
      <p class="resumo ${c.percentual >= 80 ? 'bom' : 'ruim'}"><strong>${c.percentual}% de conformidade</strong> · ${c.conformes} conforme(s), ${c.naoConformes} não conforme(s), ${d.itens.length - c.aplicaveis} não se aplica</p>
      <table>
        <thead><tr><th>Nº</th><th>Item verificado</th><th>Resultado</th><th>Observação</th></tr></thead>
        <tbody>${d.itens
          .map((i, n) => `<tr><td>${n + 1}</td><td>${escape(i.texto)}</td><td class="r-${i.resposta}">${RESPOSTA[i.resposta]}</td><td>${escape(i.observacao || '')}</td></tr>`)
          .join('')}</tbody>
      </table>
      ${
        temMulta
          ? `<h2>Multas que a empresa pode receber</h2>
      <p class="resumo ruim"><strong>${faixaTexto(multas.total)}</strong> no total, somando ${ncs.length} não conformidade(s), para ${empregados || 1} empregado(s).</p>
      <table><thead><tr><th>Nº</th><th>Não conformidade</th><th>Gravidade</th><th>Multa estimada</th></tr></thead>
      <tbody>${ncs
        .filter((i) => multas.porItem[i.n])
        .map((i) => `<tr><td>${i.n + 1}</td><td>${escape(i.texto)}</td><td>I${i.grau ?? grauDoModelo(d.modelo, i.texto)}</td><td>${faixaTexto(multas.porItem[i.n])}</td></tr>`)
        .join('')}</tbody></table>
      <p class="meta">${NOTA_MULTA}</p>`
          : ''
      }
      ${
        ncs.length
          ? `<h2>Plano de ação</h2>
      <table><thead><tr><th>Não conformidade</th><th>Ação corretiva</th><th>Responsável</th><th>Prazo</th></tr></thead>
      <tbody>${ncs.map((i) => `<tr><td>${escape(i.texto)}${i.observacao ? `<br/><span class="meta">${escape(i.observacao)}</span>` : ''}</td><td></td><td></td><td></td></tr>`).join('')}</tbody></table>`
          : ''
      }
    </section>
    <div class="assinaturas">
      <div class="assinatura">${escape(d.inspetor)}<span>Inspetor(a)</span></div>
      <div class="assinatura">&nbsp;<span>Responsável pela área</span></div>
    </div>`,
    `.resumo { padding: 8px 10px; border-radius: 8px; } .resumo.bom { background: #ECFDF5; } .resumo.ruim { background: #FEF2F2; }
     .r-C { color: #10B981; font-weight: 600; } .r-NC { color: #EF4444; font-weight: 600; } .r-NA { color: #6b7280; } td:nth-child(2) { width: 45%; }`,
  );
}
