// Planos do Safety Nexo (tabela aprovada pelo Rodrigo em 2026-11-08): cada degrau dá mais empresas e mais recursos.
// limiteEmpresas null = ilimitado. Os limites e recursos de cada plano ficam em RECURSOS_POR_PLANO (common/plano.ts).
// A página de planos do site (apps/web/lib/planos.ts) mostra estes mesmos valores: ao mudar aqui, mude lá também.
export const PLANOS = [
  { codigo: 'FREE', nome: 'Grátis', precoMensal: 0, limiteEmpresas: 1 },
  { codigo: 'START', nome: 'Start', precoMensal: 47, limiteEmpresas: 1 },
  { codigo: 'ESSENCIAL', nome: 'Essencial', precoMensal: 97, limiteEmpresas: 5 },
  { codigo: 'PROFISSIONAL', nome: 'Profissional', precoMensal: 197, limiteEmpresas: 15 },
  { codigo: 'ENTERPRISE', nome: 'Ilimitado', precoMensal: 397, limiteEmpresas: null },
  // Plano antigo, mantido para quem já estava nele (não aparece mais no site).
  { codigo: 'PREMIUM', nome: 'Premium (antigo)', precoMensal: 197, limiteEmpresas: 30 },
] as const;

export type CodigoPlano = (typeof PLANOS)[number]['codigo'];
export const ILIMITADO = 100000;

export const planoPorCodigo = (codigo: string) => PLANOS.find((p) => p.codigo === codigo);
