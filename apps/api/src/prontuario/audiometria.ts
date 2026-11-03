// Frequências do audiograma (Hz) e conferência dos limiares digitados (dB NA).
export const FREQUENCIAS = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000] as const;
export type Limiares = { od: Record<string, number | null>; oe: Record<string, number | null> };

export function limparAudiometria(d: unknown): Limiares {
  const ler = (o: unknown) => Object.fromEntries(FREQUENCIAS.map((f) => {
    const v = (o as Record<string, unknown> | undefined)?.[String(f)];
    if (v === null || v === undefined || v === '') return [String(f), null];
    const n = Number(v);
    if (!Number.isFinite(n) || n < -10 || n > 120 || n % 5 !== 0) throw new Error(`Limiar inválido em ${f} Hz: use valores de -10 a 120 dB, de 5 em 5.`);
    return [String(f), n];
  }));
  const x = d as Record<string, unknown> | undefined;
  return { od: ler(x?.od), oe: ler(x?.oe) };
}

export type Espiro = { cvf: number | null; cvfPct: number | null; vef1: number | null; vef1Pct: number | null; relacao: number | null };
export function limparEspirometria(d: unknown): Espiro {
  const x = (d ?? {}) as Record<string, unknown>;
  const num = (k: string, max: number) => {
    const v = x[k]; if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).replace(',', '.'));
    if (!Number.isFinite(n) || n < 0 || n > max) throw new Error('Confira os números da espirometria.');
    return n;
  };
  return { cvf: num('cvf', 15), cvfPct: num('cvfPct', 300), vef1: num('vef1', 15), vef1Pct: num('vef1Pct', 300), relacao: num('relacao', 150) };
}

// Audiograma em SVG: orelha direita em vermelho com círculos, esquerda em azul com X (convenção usual).
export function audiogramaSvg(l: Limiares) {
  const W = 360, H = 240, x0 = 40, y0 = 20, w = 300, h = 200;
  const xs = (i: number) => x0 + (i * w) / (FREQUENCIAS.length - 1);
  const ys = (db: number) => y0 + ((db + 10) * h) / 130;
  const grade = [-10, 0, 20, 40, 60, 80, 100, 120].map((db) => `<line x1="${x0}" y1="${ys(db)}" x2="${x0 + w}" y2="${ys(db)}" stroke="#ddd"/><text x="${x0 - 6}" y="${ys(db) + 3}" font-size="8" text-anchor="end">${db}</text>`).join('');
  const eixo = FREQUENCIAS.map((f, i) => `<line x1="${xs(i)}" y1="${y0}" x2="${xs(i)}" y2="${y0 + h}" stroke="#eee"/><text x="${xs(i)}" y="${y0 - 6}" font-size="8" text-anchor="middle">${f >= 1000 ? `${f / 1000}k` : f}</text>`).join('');
  const serie = (o: Record<string, number | null>, cor: string, marca: (x: number, y: number) => string) => {
    const pts = FREQUENCIAS.map((f, i) => (o[String(f)] == null ? null : [xs(i), ys(o[String(f)] as number)] as const)).filter(Boolean) as (readonly [number, number])[];
    return `<polyline fill="none" stroke="${cor}" stroke-width="1.5" points="${pts.map((p) => p.join(',')).join(' ')}"/>${pts.map(([x, y]) => marca(x, y)).join('')}`;
  };
  const circulo = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="4" fill="none" stroke="#d33" stroke-width="1.5"/>`;
  const xis = (x: number, y: number) => `<path d="M${x - 4} ${y - 4}L${x + 4} ${y + 4}M${x + 4} ${y - 4}L${x - 4} ${y + 4}" stroke="#25c" stroke-width="1.5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + 20}" viewBox="0 0 ${W} ${H + 20}">${grade}${eixo}${serie(l.od, '#d33', circulo)}${serie(l.oe, '#25c', xis)}
<text x="${x0}" y="${H + 14}" font-size="8" fill="#d33">○ Orelha direita</text><text x="${x0 + 90}" y="${H + 14}" font-size="8" fill="#25c">✕ Orelha esquerda</text><text x="${x0 + w}" y="${H + 14}" font-size="8" text-anchor="end">Hz × dB NA</text></svg>`;
}
