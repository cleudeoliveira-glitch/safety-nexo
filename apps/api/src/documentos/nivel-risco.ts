// NR-01, 1.5.4.4.2: nível de risco = severidade x probabilidade.
// Matriz 5x5: cada eixo vai de 1 a 5 e o produto (1 a 25) define o nível.
// Riscos antigos, da matriz 3x3, ainda podem vir como BAIXA, MEDIA ou ALTA:
// valem 2, 3 e 5, o que mantém o mesmo nível que tinham antes.

export type Nivel = 'BAIXO' | 'MODERADO' | 'ALTO' | 'CRITICO';

const ANTIGO: Record<string, string> = { BAIXA: '2', MEDIA: '3', ALTA: '5' };
export const GRAUS = ['1', '2', '3', '4', '5'];

// Aceita '1'..'5' ou o valor antigo e devolve sempre '1'..'5'.
export function grau5(v: string | null | undefined, padrao = '3'): string {
  if (!v) return padrao;
  if (GRAUS.includes(v)) return v;
  return ANTIGO[v] ?? padrao;
}

export const NOME_SEVERIDADE: Record<string, string> = {
  '1': 'Insignificante', '2': 'Leve', '3': 'Moderada', '4': 'Grave', '5': 'Gravíssima',
};
export const EXPLICA_SEVERIDADE: Record<string, string> = {
  '1': 'sem lesão ou só primeiros socorros',
  '2': 'lesão sem afastamento',
  '3': 'afastamento temporário',
  '4': 'lesão permanente ou doença séria',
  '5': 'morte ou invalidez',
};
export const NOME_PROBABILIDADE: Record<string, string> = {
  '1': 'Rara', '2': 'Improvável', '3': 'Possível', '4': 'Provável', '5': 'Quase certa',
};

export function pontosRisco(severidade: string, probabilidade: string) {
  return Number(grau5(severidade)) * Number(grau5(probabilidade));
}

export function nivelRisco(severidade: string, probabilidade: string): Nivel {
  const p = pontosRisco(severidade, probabilidade);
  if (p >= 20) return 'CRITICO';
  if (p >= 15) return 'ALTO';
  if (p >= 8) return 'MODERADO';
  return 'BAIXO';
}

export const NOME_NIVEL: Record<Nivel, string> = { BAIXO: 'Baixo', MODERADO: 'Moderado', ALTO: 'Alto', CRITICO: 'Crítico' };

// O que fazer em cada nível: base para priorizar o plano de ação (NR-01).
export const DECISAO_NIVEL: Record<Nivel, string> = {
  BAIXO: 'Manter o que já existe e acompanhar.',
  MODERADO: 'Entra no plano de ação, com responsável e prazo.',
  ALTO: 'Resolver com prioridade, em prazo curto.',
  CRITICO: 'Resolver já. Se não der, parar a atividade até controlar o risco.',
};

export const nomeSeveridade = (v: string) => `${grau5(v)} · ${NOME_SEVERIDADE[grau5(v)]}`;
export const nomeProbabilidade = (v: string) => `${grau5(v)} · ${NOME_PROBABILIDADE[grau5(v)]}`;

// Medidas de controle separadas pela hierarquia da NR-01 (1.5.5.1.2): proteção coletiva (EPC),
// EPI e as outras (eliminar, trocar, organizar o trabalho). Riscos antigos só têm o texto geral.
export type MedidasRisco = { medidasControle: string | null; medidasEpc?: string | null; medidasEpi?: string | null };
export function medidasPartes(r: MedidasRisco): [string, string][] {
  return ([['EPC', r.medidasEpc], ['EPI', r.medidasEpi], ['Outras medidas', r.medidasControle]] as [string, string | null | undefined][])
    .filter((x): x is [string, string] => !!x[1]?.trim());
}
