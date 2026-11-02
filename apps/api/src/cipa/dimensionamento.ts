// NR-05 (Portaria MTP nº 422/2021), Quadro I. Cada faixa vai até o limite indicado.
// Os números são dos representantes dos empregados; a organização indica o mesmo número (paridade).
const FAIXAS = [19, 29, 50, 80, 100, 120, 140, 300, 500, 1000, 2500, 5000, 10000];

// [efetivos, suplentes] por faixa; null = faixa sem CIPA obrigatória. O último par é o acréscimo
// para cada grupo de 2.500 acima de 10.000.
const QUADRO_I: Record<number, ([number, number] | null)[]> = {
  1: [null, null, null, null, [1, 1], [1, 1], [1, 1], [1, 1], [2, 2], [4, 3], [5, 4], [6, 5], [8, 6], [1, 1]],
  2: [null, null, null, [1, 1], [1, 1], [2, 1], [2, 1], [3, 2], [4, 3], [5, 4], [6, 5], [8, 6], [10, 8], [1, 1]],
  3: [null, [1, 1], [1, 1], [2, 1], [2, 1], [2, 1], [3, 2], [4, 2], [5, 4], [6, 4], [8, 6], [10, 8], [12, 8], [2, 2]],
  4: [null, [1, 1], [2, 1], [3, 2], [3, 2], [4, 2], [4, 2], [4, 3], [5, 4], [6, 5], [9, 7], [11, 8], [13, 10], [2, 2]],
};

export type Dimensionamento =
  | { situacao: 'SEM_GRAU' }
  | { situacao: 'REPRESENTANTE'; minimoParaCipa: number }
  | { situacao: 'CIPA'; efetivos: number; suplentes: number };

export function dimensionarCipa(grauRisco: number | null, empregados: number): Dimensionamento {
  const quadro = grauRisco ? QUADRO_I[grauRisco] : undefined;
  if (!quadro) return { situacao: 'SEM_GRAU' };

  let membros: [number, number] | null;
  const faixa = FAIXAS.findIndex((limite) => empregados <= limite);
  if (faixa >= 0) {
    membros = quadro[faixa];
  } else {
    // O texto fala em "cada grupo de 2500": só grupos completos acrescentam.
    const grupos = Math.floor((empregados - 10000) / 2500);
    const [base, extra] = [quadro[FAIXAS.length - 1]!, quadro[FAIXAS.length]!];
    membros = [base[0] + grupos * extra[0], base[1] + grupos * extra[1]];
  }

  if (!membros) {
    // Item 5.4.13: abaixo do Quadro I, a organização nomeia um representante (salvo SESMT ou MEI).
    const primeira = quadro.findIndex((m) => m !== null);
    return { situacao: 'REPRESENTANTE', minimoParaCipa: FAIXAS[primeira - 1] + 1 };
  }
  return { situacao: 'CIPA', efetivos: membros[0], suplentes: membros[1] };
}

const DIA_MS = 24 * 60 * 60 * 1000;

// Mandato de um ano (5.4.6); convocação 60 dias antes do fim (5.5.1); eleição 30 dias antes (5.5.3 f);
// posse no primeiro dia útil após o fim (5.4.7). Feriados não entram na conta.
export function calendarioCipa(inicioMandato: Date) {
  const fimMandato = new Date(inicioMandato);
  fimMandato.setUTCFullYear(fimMandato.getUTCFullYear() + 1);
  fimMandato.setTime(fimMandato.getTime() - DIA_MS);

  const posse = new Date(fimMandato.getTime() + DIA_MS);
  while (posse.getUTCDay() === 0 || posse.getUTCDay() === 6) posse.setTime(posse.getTime() + DIA_MS);

  return {
    inicioMandato,
    fimMandato,
    convocacaoAte: new Date(fimMandato.getTime() - 60 * DIA_MS),
    eleicaoAte: new Date(fimMandato.getTime() - 30 * DIA_MS),
    posse,
  };
}
