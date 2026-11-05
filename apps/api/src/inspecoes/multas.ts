// Estimativa de multa da fiscalização do trabalho, pela tabela do Anexo I da NR-28.
// A tabela está em UFIR. A UFIR foi extinta em 2000 com o valor de R$ 1,0641, que é o valor usado na conversão.
// É uma estimativa: o auditor fiscal define o valor dentro da faixa, a reincidência pode dobrar a multa
// e cada item tem um código próprio no Anexo II da NR-28.

export const UFIR = 1.0641;

// Faixas de número de empregados: até 10, 25, 50, 100, 250, 500, 1000 e acima de 1000.
const FAIXAS = [10, 25, 50, 100, 250, 500, 1000, Infinity];

// [mínimo, máximo] em UFIR, por faixa de empregados (linhas) e gravidade I1 a I4 (colunas).
const SEGURANCA: [number, number][][] = [
  [[630, 729], [1129, 1393], [1691, 2091], [2252, 2792]],
  [[730, 830], [1394, 1664], [2092, 2495], [2793, 3334]],
  [[831, 963], [1665, 1935], [2496, 2898], [3335, 3876]],
  [[964, 1104], [1936, 2200], [2899, 3302], [3877, 4418]],
  [[1105, 1241], [2201, 2471], [3303, 3718], [4419, 4948]],
  [[1242, 1374], [2472, 2748], [3719, 4121], [4949, 5490]],
  [[1375, 1507], [2749, 3020], [4122, 4525], [5491, 6033]],
  [[1508, 1646], [3021, 3284], [4526, 4929], [6034, 6304]],
];

const MEDICINA: [number, number][][] = [
  [[378, 428], [676, 839], [1015, 1254], [1350, 1680]],
  [[429, 497], [840, 1002], [1255, 1500], [1681, 2014]],
  [[498, 571], [1003, 1166], [1501, 1746], [2015, 2343]],
  [[572, 645], [1167, 1324], [1747, 1986], [2344, 2659]],
  [[646, 730], [1325, 1482], [1987, 2225], [2660, 2987]],
  [[731, 804], [1483, 1646], [2226, 2471], [2988, 3300]],
  [[805, 880], [1647, 1810], [2472, 2717], [3301, 3628]],
  [[881, 955], [1811, 1973], [2718, 2957], [3629, 3782]],
];

export type Faixa = { minimo: number; maximo: number };

const real = (ufir: number) => Math.round(ufir * UFIR * 100) / 100;

export function multaItem(grau: number, empregados: number, tipo: 'S' | 'M' = 'S'): Faixa | null {
  if (!(grau >= 1 && grau <= 4)) return null;
  const linha = FAIXAS.findIndex((f) => Math.max(1, empregados || 1) <= f);
  const [min, max] = (tipo === 'M' ? MEDICINA : SEGURANCA)[linha][grau - 1];
  return { minimo: real(min), maximo: real(max) };
}

export function somar(faixas: (Faixa | null)[]): Faixa {
  return faixas.reduce<Faixa>((t, f) => (f ? { minimo: t.minimo + f.minimo, maximo: t.maximo + f.maximo } : t), { minimo: 0, maximo: 0 });
}

export const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const NOTA_MULTA =
  'Estimativa pela tabela do Anexo I da NR-28 (UFIR a R$ 1,0641), conforme o número de empregados e a gravidade sugerida de cada item. ' +
  'O valor final é definido pela fiscalização e pode dobrar em caso de reincidência.';
