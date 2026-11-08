// NR-04, Anexo II: dimensionamento do SESMT pelo grau de risco e pelo número de empregados.
// Ordem dos números: técnico de segurança, engenheiro de segurança, auxiliar/técnico de enfermagem do trabalho,
// enfermeiro do trabalho e médico do trabalho. "p" = tempo parcial (pelo menos 3 horas por dia).
export type Profissional = 'tecnico' | 'engenheiro' | 'auxEnfermagem' | 'enfermeiro' | 'medico';
export const NOME_PROFISSIONAL: Record<Profissional, string> = {
  tecnico: 'Técnico de segurança do trabalho',
  engenheiro: 'Engenheiro de segurança do trabalho',
  auxEnfermagem: 'Auxiliar ou técnico de enfermagem do trabalho',
  enfermeiro: 'Enfermeiro do trabalho',
  medico: 'Médico do trabalho',
};
const ORDEM: Profissional[] = ['tecnico', 'engenheiro', 'auxEnfermagem', 'enfermeiro', 'medico'];

type Celula = number | 'p' | 0;
type Linha = [Celula, Celula, Celula, Celula, Celula];
const FAIXAS = [100, 250, 500, 1000, 2000, 3500, 5000];
const NOME_FAIXA = ['50 a 100', '101 a 250', '251 a 500', '501 a 1.000', '1.001 a 2.000', '2.001 a 3.500', '3.501 a 5.000'];

// Para cada grau: as 7 faixas e, por último, o acréscimo a cada grupo de 4.000 (ou fração acima de 2.000) além de 5.000.
const QUADRO: Record<number, Linha[]> = {
  1: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [1, 0, 0, 0, 0], [1, 0, 0, 0, 0], [1, 'p', 1, 0, 'p'], [2, 1, 1, 'p', 1], [1, 'p', 1, 0, 'p']],
  2: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [1, 0, 0, 0, 0], [1, 'p', 1, 0, 'p'], [2, 1, 1, 0, 1], [5, 1, 1, 1, 1], [1, 'p', 1, 0, 'p']],
  3: [[0, 0, 0, 0, 0], [1, 0, 0, 0, 0], [2, 0, 0, 0, 0], [3, 'p', 0, 0, 'p'], [4, 1, 1, 0, 1], [6, 1, 2, 0, 1], [8, 2, 1, 1, 2], [3, 1, 1, 0, 1]],
  4: [[1, 0, 0, 0, 0], [2, 'p', 0, 0, 'p'], [3, 'p', 0, 0, 'p'], [4, 1, 1, 0, 1], [5, 1, 1, 0, 1], [8, 2, 2, 0, 2], [10, 3, 1, 1, 3], [3, 1, 1, 0, 1]],
};

export type ResultadoSesmt =
  | { situacao: 'SEM_SESMT'; faixa: string }
  | { situacao: 'SESMT'; faixa: string; equipe: { profissional: Profissional; nome: string; quantidade: number; parcial: boolean }[] };

export function dimensionarSesmt(grau: number, empregados: number): ResultadoSesmt | null {
  const quadro = QUADRO[grau];
  if (!quadro || empregados < 0) return null;
  if (empregados < 50) return { situacao: 'SEM_SESMT', faixa: 'menos de 50' };
  const i = FAIXAS.findIndex((f) => empregados <= f);
  let linha: [number, boolean][];
  let faixa: string;
  if (i >= 0) {
    linha = quadro[i].map((c) => [c === 'p' ? 1 : c, c === 'p']);
    faixa = NOME_FAIXA[i];
  } else {
    // Acima de 5.000: soma um acréscimo a cada 4.000; uma sobra acima de 2.000 conta como mais um grupo.
    const resto = empregados - 5000;
    const grupos = Math.floor(resto / 4000) + (resto % 4000 > 2000 ? 1 : 0);
    linha = quadro[6].map((c, k) => {
      const base = c === 'p' ? 1 : c;
      const extra = quadro[7][k];
      const somaExtra = (extra === 'p' ? 1 : extra) * grupos;
      return [base + somaExtra, c === 'p' && (somaExtra === 0 || extra === 'p')];
    });
    faixa = `acima de 5.000 (${grupos} grupo(s) a mais)`;
  }
  const equipe = linha
    .map(([quantidade, parcial], k) => ({ profissional: ORDEM[k], nome: NOME_PROFISSIONAL[ORDEM[k]], quantidade, parcial }))
    .filter((p) => p.quantidade > 0);
  return equipe.length ? { situacao: 'SESMT', faixa, equipe } : { situacao: 'SEM_SESMT', faixa };
}
