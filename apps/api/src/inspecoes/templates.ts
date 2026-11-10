import { documentoHtml, escape, Moldura } from '../documentos/layout';
import type { RelatorioInspecaoIa } from '../ia/ia';
import { grauDoModelo, MODELOS_CHECKLIST } from './modelos';
import { Faixa, multaItem, NOTA_MULTA, reais, somar } from './multas';

export type ItemInspecao = { texto: string; resposta: 'C' | 'NC' | 'NA'; observacao?: string; grau?: number };
const RESPOSTA = { C: 'Conforme', NC: 'Não conforme', NA: 'Não se aplica' };
const TIPO_RISCO: Record<string, string> = { FISICO: 'Físico', QUIMICO: 'Químico', BIOLOGICO: 'Biológico', ERGONOMICO: 'Ergonômico', ACIDENTE: 'Acidente' };
export type FotoNoPdf = { uri: string; legenda: string };

// Nível pela matriz 5x5 (probabilidade x severidade).
const nivel = (p: number, s: number) => { const v = p * s; return v >= 15 ? ['Alto', 'alto'] : v >= 8 ? ['Médio', 'medio'] : ['Baixo', 'baixo']; };

function secaoFotos(fotos: FotoNoPdf[]) {
  if (!fotos.length) return '';
  return `<h2>Registro fotográfico</h2>
    <div class="fotos">${fotos.map((f, n) => `<figure><img src="${f.uri}" alt="Foto ${n + 1}"/><figcaption>Foto ${n + 1}${f.legenda ? `: ${escape(f.legenda)}` : ''}</figcaption></figure>`).join('')}</div>`;
}

function secaoIa(r: RelatorioInspecaoIa | null) {
  if (!r) return '';
  return `<h2>Análise das fotos</h2>
    <p>${escape(r.resumo)}</p>
    ${r.perigos.length ? `<table><thead><tr><th>Perigo observado</th><th>Tipo</th><th>NR</th><th>Nível</th><th>Ação sugerida</th></tr></thead>
    <tbody>${r.perigos.map((p) => { const [n, c] = nivel(p.probabilidade, p.severidade); return `<tr><td>${escape(p.descricao)}${p.foto ? `<br/><span class="meta">Foto ${p.foto}</span>` : ''}</td><td>${TIPO_RISCO[p.tipo] ?? p.tipo}</td><td>${escape(p.nr ?? '—')}</td><td class="n-${c}">${n} (${p.probabilidade}×${p.severidade})</td><td>${p.acoes.map(escape).join('<br/>')}</td></tr>`; }).join('')}</tbody></table>` : '<p>Nenhum perigo visível nas fotos.</p>'}
    ${r.boasPraticas.length ? `<p><strong>Pontos positivos:</strong> ${r.boasPraticas.map(escape).join('; ')}.</p>` : ''}
    <p class="meta">A análise teve ajuda de inteligência artificial e foi revisada por quem fez a inspeção.</p>`;
}

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

export const resumoInspecao = (modelo: string, itens: ItemInspecao[], empregados: number) => ({ ...conformidade(itens), multa: multasInspecao(modelo, itens, empregados).total });

const faixaTexto = (f: Faixa | null) => (f ? `${reais(f.minimo)} a ${reais(f.maximo)}` : '');

export function inspecaoHtml(moldura: Moldura, d: { modelo: string; titulo: string; local: string; data: Date; inspetor: string; itens: ItemInspecao[]; fotos?: FotoNoPdf[]; relatorioIa?: RelatorioInspecaoIa | null; proximaInspecao?: Date | null }, empregados = 0): string {
  const c = conformidade(d.itens);
  const ncs = d.itens.filter((i) => i.resposta === 'NC');
  const multas = multasInspecao(d.modelo, d.itens, empregados);
  const numerados = d.itens.map((i, n) => ({ ...i, n })).filter((i) => multas.porItem[i.n]);
  return documentoHtml(
    moldura,
    `
    <section>
      <p><strong>Checklist:</strong> ${escape(d.titulo)} · <strong>Local:</strong> ${escape(d.local)} · <strong>Data:</strong> ${d.data.toLocaleDateString('pt-BR', { timeZone: 'UTC' })} · <strong>Inspetor(a):</strong> ${escape(d.inspetor)}${d.proximaInspecao ? ` · <strong>Próxima inspeção:</strong> ${d.proximaInspecao.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}` : ''}</p>
      <p class="resumo ${c.percentual >= 80 ? 'bom' : 'ruim'}"><strong>${c.percentual}% de conformidade</strong> · ${c.conformes} conforme(s), ${c.naoConformes} não conforme(s), ${d.itens.length - c.aplicaveis} não se aplica</p>
      <table class="itens">
        <thead><tr><th>Nº</th><th>Item verificado</th><th>Resultado</th><th>Observação</th></tr></thead>
        <tbody>${d.itens
          .map((i, n) => `<tr><td>${n + 1}</td><td>${escape(i.texto)}</td><td class="r-${i.resposta}">${RESPOSTA[i.resposta]}</td><td>${escape(i.observacao || '')}</td></tr>`)
          .join('')}</tbody>
      </table>
      ${
        numerados.length
          ? `<h2>Multas que a empresa pode receber</h2>
      <p class="resumo ruim"><strong>${faixaTexto(multas.total)}</strong> no total, somando ${numerados.length} não conformidade(s), para ${empregados || 1} empregado(s).</p>
      <table><thead><tr><th>Nº</th><th>Não conformidade</th><th>Gravidade</th><th>Multa estimada</th></tr></thead>
      <tbody>${numerados.map((i) => `<tr><td>${i.n + 1}</td><td>${escape(i.texto)}</td><td>I${i.grau ?? grauDoModelo(d.modelo, i.texto)}</td><td>${faixaTexto(multas.porItem[i.n])}</td></tr>`).join('')}</tbody></table>
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
      ${secaoIa(d.relatorioIa ?? null)}
      ${secaoFotos(d.fotos ?? [])}
    </section>
    <div class="assinaturas">
      <div class="assinatura">${escape(d.inspetor)}<span>Inspetor(a)</span></div>
      <div class="assinatura">&nbsp;<span>Responsável pela área</span></div>
    </div>`,
    `.resumo { padding: 8px 10px; border-radius: 8px; } .resumo.bom { background: #ECFDF5; } .resumo.ruim { background: #FEF2F2; }
     .r-C { color: #10B981; font-weight: 600; } .r-NC { color: #EF4444; font-weight: 600; } .r-NA { color: #6b7280; } .itens td:nth-child(2) { width: 45%; }
     .fotos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; } figure { margin: 0; break-inside: avoid; }
     figure img { width: 100%; max-height: 260px; object-fit: cover; border-radius: 6px; border: 1px solid #E5E7EB; } figcaption { font-size: 10px; color: #6b7280; margin-top: 3px; }
     .n-alto { color: #EF4444; font-weight: 600; } .n-medio { color: #c2410c; font-weight: 600; } .n-baixo { color: #10B981; font-weight: 600; }`,
  );
}
