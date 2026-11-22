// Vigência do plano pago: cada mês vai do dia em que o plano começou até a véspera do mesmo dia no mês seguinte.
// As datas ficam guardadas ao meio-dia (UTC) para não "pularem" de dia por causa do fuso horário do Brasil.

export function meioDia(d: Date | string): Date {
  const x = new Date(d);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate(), 12));
}

export function hojeMeioDia(): Date {
  // Dia de hoje no horário de Brasília.
  const agora = new Date(Date.now() - 3 * 3600 * 1000);
  return meioDia(agora);
}

export function somarDias(d: Date, dias: number): Date {
  return new Date(d.getTime() + dias * 86400000);
}

// Soma meses mantendo o dia; se o mês seguinte for mais curto (ex.: 31/01 + 1 mês), fica no último dia dele.
export function somarMeses(d: Date, meses: number): Date {
  const ano = d.getUTCFullYear();
  const mes = d.getUTCMonth() + meses;
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ano, mes, Math.min(d.getUTCDate(), ultimoDia), 12));
}

// Fim de um período que começa em "inicio" e dura "meses" meses (o último dia ainda pago).
export const fimDoPeriodo = (inicio: Date, meses: number) => somarDias(somarMeses(inicio, meses), -1);
