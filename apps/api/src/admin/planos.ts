// Planos do Safety Nexo (valores do PROMPT do projeto: Essencial R$67, Profissional R$127, Premium R$197, Enterprise R$397).
// limiteEmpresas null = ilimitado.
export const PLANOS = [
  { codigo: 'FREE', nome: 'Free', precoMensal: 0, limiteEmpresas: 1 },
  { codigo: 'ESSENCIAL', nome: 'Essencial', precoMensal: 67, limiteEmpresas: 3 },
  { codigo: 'PROFISSIONAL', nome: 'Profissional', precoMensal: 127, limiteEmpresas: 10 },
  { codigo: 'PREMIUM', nome: 'Premium', precoMensal: 197, limiteEmpresas: 30 },
  { codigo: 'ENTERPRISE', nome: 'Enterprise', precoMensal: 397, limiteEmpresas: null },
] as const;

export const ILIMITADO = 100000;

export const planoPorCodigo = (codigo: string) => PLANOS.find((p) => p.codigo === codigo);
