const DIA_MS = 24 * 60 * 60 * 1000;

// Lei 8.213/91, art. 22: comunicar até o primeiro dia útil seguinte ao acidente; em caso de morte, de imediato.
// Feriados não entram na conta.
export function prazoCat(dataHora: Date, houveObito: boolean): Date {
  if (houveObito) return dataHora;
  const prazo = new Date(Date.UTC(dataHora.getUTCFullYear(), dataHora.getUTCMonth(), dataHora.getUTCDate()) + DIA_MS);
  while (prazo.getUTCDay() === 0 || prazo.getUTCDay() === 6) prazo.setTime(prazo.getTime() + DIA_MS);
  prazo.setUTCHours(23, 59, 59);
  return prazo;
}
