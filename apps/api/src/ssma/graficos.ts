// Gráficos em SVG para o PDF. Uma série por gráfico, sem eixo duplo.
export const COR = { serie1: '#0a8fae', serie2: '#eb6834', grade: '#e5e7eb', texto: '#52514e' };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const rot = (mes: string) => { const [a, m] = mes.split('-'); return `${m}/${a.slice(2)}`; };

export function linhaSvg(titulo: string, pontos: { mes: string; v: number | null }[]) {
  const W = 330, H = 150, x0 = 30, y0 = 12, w = 290, h = 105;
  const max = Math.max(1, ...pontos.map((p) => p.v ?? 0)) * 1.15;
  const x = (i: number) => x0 + (i * w) / Math.max(1, pontos.length - 1);
  const y = (v: number) => y0 + h - (v / max) * h;
  const pts = pontos.map((p, i) => (p.v == null ? null : `${x(i)},${y(p.v)}`)).filter(Boolean).join(' ');
  const ult = [...pontos].reverse().find((p) => p.v != null);
  const iu = ult ? pontos.lastIndexOf(ult) : -1;
  return `<figure style="margin:0;page-break-inside:avoid"><figcaption style="font-weight:600;font-size:11px;margin-bottom:4px">${esc(titulo)}</figcaption>
  <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  ${[0, 0.5, 1].map((t) => `<line x1="${x0}" x2="${x0 + w}" y1="${y(max * t / 1.15)}" y2="${y(max * t / 1.15)}" stroke="${COR.grade}"/><text x="${x0 - 4}" y="${y(max * t / 1.15) + 3}" font-size="7" text-anchor="end" fill="${COR.texto}">${(max * t / 1.15).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</text>`).join('')}
  ${pontos.map((p, i) => (i % 2 === pontos.length % 2 ? '' : `<text x="${x(i)}" y="${H - 6}" font-size="7" text-anchor="middle" fill="${COR.texto}">${rot(p.mes)}</text>`)).join('')}
  <polyline fill="none" stroke="${COR.serie1}" stroke-width="2" points="${pts}"/>
  ${pontos.map((p, i) => (p.v == null ? '' : `<circle cx="${x(i)}" cy="${y(p.v)}" r="2.5" fill="${COR.serie1}" stroke="#fff" stroke-width="1"/>`)).join('')}
  ${ult && iu >= 0 ? `<text x="${x(iu) - 4}" y="${y(ult.v!) - 6}" font-size="8" text-anchor="end" fill="#0b0b0b">${ult.v!.toLocaleString('pt-BR')}</text>` : ''}
  </svg></figure>`;
}

export function barrasSvg(titulo: string, itens: { nome: string; v: number }[]) {
  const W = 330, linha = 18, x0 = 110, w = 190;
  const H = Math.max(1, itens.length) * linha + 8;
  const max = Math.max(1, ...itens.map((i) => i.v));
  return `<figure style="margin:0;page-break-inside:avoid"><figcaption style="font-weight:600;font-size:11px;margin-bottom:4px">${esc(titulo)}</figcaption>
  ${itens.length ? `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  ${itens.map((it, i) => `<text x="${x0 - 6}" y="${i * linha + 13}" font-size="8" text-anchor="end" fill="#0b0b0b">${esc(it.nome.slice(0, 24))}</text>
  <rect x="${x0}" y="${i * linha + 4}" width="${Math.max(2, (it.v / max) * w)}" height="11" rx="3" fill="${COR.serie1}"/>
  <text x="${x0 + Math.max(2, (it.v / max) * w) + 4}" y="${i * linha + 13}" font-size="8" fill="#0b0b0b">${it.v}</text>`).join('')}
  </svg>` : '<p style="font-size:10px">Nenhum acidente no período.</p>'}</figure>`;
}

export function rosquinhaSvg(titulo: string, com: number, sem: number) {
  const total = com + sem; const r = 38, c = 2 * Math.PI * r;
  const fCom = total ? com / total : 0;
  return `<figure style="margin:0;page-break-inside:avoid"><figcaption style="font-weight:600;font-size:11px;margin-bottom:4px">${esc(titulo)}</figcaption>
  ${total ? `<svg width="230" height="100" viewBox="0 0 230 100" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(50,50) rotate(-90)">
    <circle r="${r}" fill="none" stroke="${COR.serie1}" stroke-width="14"/>
    ${com ? `<circle r="${r}" fill="none" stroke="${COR.serie2}" stroke-width="14" stroke-dasharray="${fCom * c - (sem ? 2 : 0)} ${c}"/>` : ''}
  </g>
  <text x="50" y="54" font-size="12" font-weight="600" text-anchor="middle">${total}</text>
  <rect x="105" y="30" width="9" height="9" rx="2" fill="${COR.serie2}"/><text x="119" y="38" font-size="9">Com afastamento: ${com}</text>
  <rect x="105" y="55" width="9" height="9" rx="2" fill="${COR.serie1}"/><text x="119" y="63" font-size="9">Sem afastamento: ${sem}</text>
  </svg>` : '<p style="font-size:10px">Nenhum acidente no período.</p>'}</figure>`;
}
