// Diagnóstico do eSocial de SST: o que falta enviar em cada empresa e quanto isso pode custar em multa.
// É uma estimativa para orientar a consultora e o cliente. O valor final é definido pela fiscalização.
//
// Bases usadas:
// - ASO sem S-2220: infração de medicina do trabalho (CLT art. 201): 378,2847 a 3.782,8472 UFIR.
// - Trabalhador sem S-2240: infração de segurança do trabalho (CLT art. 201): 630,4745 a 6.304,7452 UFIR.
// - Acidente sem S-2210 (CAT): Lei 8.213/91 art. 22, entre o limite mínimo e o máximo do salário de contribuição.
// UFIR convertida a R$ 1,0641 (último valor, de 2000).
import { UFIR } from '../inspecoes/multas';

const real = (ufir: number) => Math.round(ufir * UFIR * 100) / 100;
export const MULTA_S2220 = { minimo: real(378.2847), maximo: real(3782.8472) };
export const MULTA_S2240 = { minimo: real(630.4745), maximo: real(6304.7452) };
// Salário mínimo e teto do INSS: valores de 2025. Para atualizar sem mexer no código, use as variáveis no servidor.
const numeroEnv = (nome: string, padrao: number) => { const n = Number(process.env[nome]); return Number.isFinite(n) && n > 0 ? n : padrao; };
export const multaS2210 = () => ({ minimo: numeroEnv('ESOCIAL_SALARIO_MINIMO', 1518), maximo: numeroEnv('ESOCIAL_TETO_INSS', 8157.41) });

// ASOs a partir desta data entram no diagnóstico (o eSocial de SST passou a valer para todos os grupos em 2023).
export const INICIO_SST = new Date('2023-01-01');

export const NOTA_DIAGNOSTICO =
  'Estimativa por evento que falta: ASO sem S-2220 e trabalhador sem S-2240 pela CLT art. 201 (UFIR a R$ 1,0641); ' +
  'acidente sem CAT (S-2210) pela Lei 8.213 art. 22, entre o salário mínimo e o teto do INSS. O valor final é definido pela fiscalização.';

export type Faltas = { s2220: number; s2240: number; s2210: number; s2230: number; cadastros: number; erros: number };

export function multaDiagnostico(f: Faltas) {
  const cat = multaS2210();
  return {
    minimo: f.s2220 * MULTA_S2220.minimo + f.s2240 * MULTA_S2240.minimo + f.s2210 * cat.minimo,
    maximo: f.s2220 * MULTA_S2220.maximo + f.s2240 * MULTA_S2240.maximo + f.s2210 * cat.maximo,
  };
}
