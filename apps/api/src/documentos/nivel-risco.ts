// NR-01, 1.5.4.4.2: nível de risco = severidade x probabilidade.
// Matriz 3x3. Cada eixo vale 1 (baixa), 2 (média) ou 3 (alta); o produto define o nível.

export type Grau = 'BAIXA' | 'MEDIA' | 'ALTA';
export type Nivel = 'BAIXO' | 'MODERADO' | 'ALTO' | 'CRITICO';

const PESO: Record<string, number> = { BAIXA: 1, MEDIA: 2, ALTA: 3 };

export function nivelRisco(severidade: string, probabilidade: string): Nivel {
  const p = (PESO[severidade] ?? 2) * (PESO[probabilidade] ?? 2);
  if (p >= 9) return 'CRITICO';
  if (p >= 6) return 'ALTO';
  if (p >= 3) return 'MODERADO';
  return 'BAIXO';
}

export const NOME_NIVEL: Record<Nivel, string> = { BAIXO: 'Baixo', MODERADO: 'Moderado', ALTO: 'Alto', CRITICO: 'Crítico' };

// O que fazer em cada nível: base para priorizar o plano de ação (NR-01).
export const DECISAO_NIVEL: Record<Nivel, string> = {
  BAIXO: 'Manter as medidas atuais e acompanhar nas inspeções.',
  MODERADO: 'Incluir no plano de ação, com responsável e prazo.',
  ALTO: 'Ação prioritária no plano de ação, com prazo curto.',
  CRITICO: 'Ação imediata. Avaliar a interrupção da atividade até o controle do risco.',
};

export const NOME_GRAU: Record<string, string> = { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta' };
