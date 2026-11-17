// As cores ficam em código (não em classe do Tailwind): esta pasta não entra na varredura de classes.
// Matriz de risco 5x5 (NR-01, 1.5.4.4.2): a mesma conta do PDF do PGR.
// Riscos antigos (matriz 3x3) podem vir como BAIXA, MEDIA ou ALTA: valem 2, 3 e 5.

export const GRAUS = ['1', '2', '3', '4', '5'];
const ANTIGO: Record<string, string> = { BAIXA: '2', MEDIA: '3', ALTA: '5' };
export const grau5 = (v?: string | null) => (v && GRAUS.includes(v) ? v : (v && ANTIGO[v]) || '3');

export const SEVERIDADES: [string, string, string][] = [
  ['1', 'Insignificante', 'sem lesão ou só primeiros socorros'],
  ['2', 'Leve', 'lesão sem afastamento'],
  ['3', 'Moderada', 'afastamento temporário'],
  ['4', 'Grave', 'lesão permanente ou doença séria'],
  ['5', 'Gravíssima', 'morte ou invalidez'],
];
export const PROBABILIDADES: [string, string, string][] = [
  ['1', 'Rara', 'quase impossível com as proteções de hoje'],
  ['2', 'Improvável', 'pode acontecer, mas é difícil'],
  ['3', 'Possível', 'já aconteceu ou pode acontecer de vez em quando'],
  ['4', 'Provável', 'deve acontecer se nada mudar'],
  ['5', 'Quase certa', 'acontece com frequência'],
];

export function nivelDoRisco(severidade?: string | null, probabilidade?: string | null) {
  const p = Number(grau5(severidade)) * Number(grau5(probabilidade));
  if (p >= 20) return { nome: 'Crítico', fundo: '#7F1D1D', pontos: p };
  if (p >= 15) return { nome: 'Alto', fundo: '#EF4444', pontos: p };
  if (p >= 8) return { nome: 'Moderado', fundo: '#FF8C69', pontos: p };
  return { nome: 'Baixo', fundo: '#10B981', pontos: p };
}
