// Vigência do plano pago, para a tela "Meu plano" e o Painel ADM.
// Mesma regra do servidor (apps/api/src/admin/vigencia.ts): cada mês vai do dia em que o plano começou
// até a véspera do mesmo dia no mês seguinte. As datas vêm guardadas ao meio-dia (UTC).

const DIA = 86400000;

function meioDia(d: Date | string): Date {
  const x = new Date(d);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate(), 12));
}

export function hoje(): Date {
  return meioDia(new Date(Date.now() - 3 * 3600 * 1000)); // dia de hoje em Brasília
}

function somarMeses(d: Date, meses: number): Date {
  const ano = d.getUTCFullYear();
  const mes = d.getUTCMonth() + meses;
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ano, mes, Math.min(d.getUTCDate(), ultimoDia), 12));
}

export const dataBr = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '';

export const paraCampoData = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');

// Dias que faltam até o vencimento (negativo = já venceu).
export const diasAte = (d: string | Date) => Math.round((meioDia(d).getTime() - hoje().getTime()) / DIA);

export type PeriodoPlano = { numero: number; de: Date; ate: Date; situacao: 'pago' | 'atual' | 'parcial' | 'aberto' };

// Lista os meses do plano, do primeiro até o mês de hoje (ou até o último pago, se pagou adiantado).
export function periodosDoPlano(desde: string | null | undefined, pagoAte: string | null | undefined): PeriodoPlano[] {
  if (!desde) return [];
  const inicio = meioDia(desde);
  const pago = pagoAte ? meioDia(pagoAte) : null;
  const h = hoje();
  const lista: PeriodoPlano[] = [];
  for (let k = 0; k < 240; k++) {
    const de = somarMeses(inicio, k);
    const ate = new Date(somarMeses(inicio, k + 1).getTime() - DIA);
    const passouDeHoje = de > h;
    const passouDoPago = !pago || de > pago;
    if (passouDeHoje && passouDoPago) break;
    const ehAtual = de <= h && h <= ate;
    const coberto = !!pago && ate <= pago;
    const parcial = !!pago && !coberto && de <= pago; // vencimento lançado à mão no meio do mês
    lista.push({ numero: k + 1, de, ate, situacao: coberto ? (ehAtual ? 'atual' : 'pago') : parcial ? 'parcial' : 'aberto' });
  }
  return lista;
}
