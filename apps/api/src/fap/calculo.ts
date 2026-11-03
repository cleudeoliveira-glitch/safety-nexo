// Regras conferidas:
// - RAT de 1%, 2% ou 3% conforme o risco da atividade preponderante (Lei 8.212/1991, art. 22, II; IN RFB 971/2009, art. 72).
// - FAP: multiplicador de 0,5000 a 2,0000, com quatro casas decimais, aplicado à alíquota do RAT
//   (Decreto 3.048/1999, art. 202-A, § 1º, redação do Decreto 6.957/2009).
// - Entram no FAP as CATs, os benefícios acidentários (inclusive por nexo técnico do INSS), a gravidade e o custo deles (art. 202-A, § 4º).
// - O FAP de cada empresa é divulgado pela Previdência na internet (art. 202-A, § 5º).
const q4 = (n: number) => Math.round(n * 10000) / 10000;
const q2 = (n: number) => Math.round(n * 100) / 100;

export function calcular(rat: number, fap: number, folhaMensal: number | null) {
  const ratAjustado = q4(rat * fap);
  const r = { rat, fap, ratAjustado, efeito: fap < 1 ? 'reduz' : fap > 1 ? 'aumenta' : 'neutro', percentual: q2(Math.abs(fap - 1) * 100) };
  if (folhaMensal == null) return { ...r, custoMensal: null, semFap: null, diferencaMensal: null };
  const custoMensal = q2((folhaMensal * ratAjustado) / 100);
  const semFap = q2((folhaMensal * rat) / 100);
  return { ...r, custoMensal, semFap, diferencaMensal: q2(custoMensal - semFap) };
}
