import { documentoHtml, escape, Moldura } from '../documentos/layout';

export type ItemInspecao = { texto: string; resposta: 'C' | 'NC' | 'NA'; observacao?: string };
const RESPOSTA = { C: 'Conforme', NC: 'Não conforme', NA: 'Não se aplica' };

// Conformidade = itens conformes sobre os itens que se aplicam.
export function conformidade(itens: ItemInspecao[]) {
  const aplicaveis = itens.filter((i) => i.resposta !== 'NA').length;
  const conformes = itens.filter((i) => i.resposta === 'C').length;
  return { aplicaveis, conformes, naoConformes: aplicaveis - conformes, percentual: aplicaveis ? Math.round((conformes / aplicaveis) * 100) : 100 };
}

export function inspecaoHtml(moldura: Moldura, d: { titulo: string; local: string; data: Date; inspetor: string; itens: ItemInspecao[] }): string {
  const c = conformidade(d.itens);
  const ncs = d.itens.filter((i) => i.resposta === 'NC');
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
