// Taxas da NBR 14280, com as fórmulas do aditivo V16.2:
// TF = acidentes x 1.000.000 / HHT; TG = dias perdidos x 1.000.000 / HHT.
export const taxa = (n: number, hht: number) => (hht > 0 ? Math.round((n * 1_000_000 * 100) / hht) / 100 : null);
export const variacao = (atual: number | null, anterior: number | null) =>
  atual == null || anterior == null || anterior === 0 ? null : Math.round(((atual - anterior) / anterior) * 1000) / 10;

const DIA = 86_400_000;
export const inicioMes = (mes: string) => new Date(`${mes}-01T00:00:00Z`);
export const fimMes = (mes: string) => { const d = inicioMes(mes); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)); };
export function mesesAte(fim: string, n = 12) {
  const d = inicioMes(fim); const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)); out.push(x.toISOString().slice(0, 7)); }
  return out;
}
// Até a data limite: no mês corrente conta só os dias úteis que já passaram.
export function diasUteis(mes: string, ate?: Date) {
  let n = 0; const f = ate && ate < fimMes(mes) ? ate : fimMes(mes);
  for (let d = inicioMes(mes); d <= f; d = new Date(d.getTime() + DIA)) { const w = d.getUTCDay(); if (w !== 0 && w !== 6) n++; }
  return n;
}
// Dias corridos de um período [ini, fim] que caem dentro do mês.
export function diasNoMes(ini: Date, fim: Date, mes: string) {
  const a = Math.max(ini.getTime(), inicioMes(mes).getTime()); const b = Math.min(fim.getTime(), fimMes(mes).getTime());
  return b < a ? 0 : Math.floor((b - a) / DIA) + 1;
}
