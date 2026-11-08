import { AsyncLocalStorage } from 'async_hooks';
import { ForbiddenException, SetMetadata } from '@nestjs/common';
import { CodigoPlano, planoPorCodigo } from '../admin/planos';

// O que cada plano libera. A trava é feita pelo AuthGuard (rotas marcadas com @Recurso) e por alguns serviços (limites).
export type Recurso =
  | 'logoEmpresa' // logo da empresa no PDF, sem marca d'água
  | 'logoConsultoria' // logo da consultoria no rodapé
  | 'documentos' // todos os programas e laudos (o Grátis só testa 1 PGR e 1 OS)
  | 'assinatura' // assinatura com o dedo, por link e com certificado
  | 'offline' // campo sem internet
  | 'slides' // material completo dos treinamentos
  | 'esocial'
  | 'proposta' // proposta comercial
  | 'cobranca' // contratos, serviços e cobranças
  | 'rosto' // entrega de EPI pelo rosto
  | 'equipe' // mais de uma pessoa da consultoria
  | 'semMarca'; // sem a marca Safety Nexo nos documentos

type Limites = { funcionarios: number | null; psicossocialMes: number | null; equipe: number | null };
const START: Recurso[] = ['logoEmpresa', 'documentos', 'assinatura', 'offline', 'slides'];
const ESSENCIAL: Recurso[] = [...START, 'logoConsultoria', 'proposta', 'esocial'];
const PROFISSIONAL: Recurso[] = [...ESSENCIAL, 'rosto', 'cobranca', 'equipe'];
const TUDO: Recurso[] = [...PROFISSIONAL, 'semMarca'];

export const RECURSOS_POR_PLANO: Record<CodigoPlano, { recursos: Recurso[]; limites: Limites }> = {
  FREE: { recursos: [], limites: { funcionarios: 10, psicossocialMes: 0, equipe: 1 } },
  START: { recursos: START, limites: { funcionarios: null, psicossocialMes: 2, equipe: 1 } },
  ESSENCIAL: { recursos: ESSENCIAL, limites: { funcionarios: null, psicossocialMes: 5, equipe: 1 } },
  PROFISSIONAL: { recursos: PROFISSIONAL, limites: { funcionarios: null, psicossocialMes: 15, equipe: 3 } },
  PREMIUM: { recursos: PROFISSIONAL, limites: { funcionarios: null, psicossocialMes: 30, equipe: 3 } },
  ENTERPRISE: { recursos: TUDO, limites: { funcionarios: null, psicossocialMes: null, equipe: null } },
};

// Plano que vale agora: o teste de 14 dias libera o Profissional; a consultoria do dono da plataforma tem tudo.
export type PlanoEfetivo = { codigo: string; nome: string; emTeste: boolean; testeAte: Date | null; dono: boolean; recursos: Recurso[]; limites: Limites };

export function planoEfetivo(c: { plano: string; testeAte: Date | null }, dono: boolean): PlanoEfetivo {
  const codigo = (planoPorCodigo(c.plano)?.codigo ?? 'FREE') as CodigoPlano;
  const nome = planoPorCodigo(codigo)!.nome;
  if (dono) return { codigo, nome, emTeste: false, testeAte: null, dono: true, ...RECURSOS_POR_PLANO.ENTERPRISE };
  const emTeste = codigo === 'FREE' && !!c.testeAte && c.testeAte.getTime() > Date.now();
  const base = RECURSOS_POR_PLANO[emTeste ? 'PROFISSIONAL' : codigo];
  return { codigo, nome, emTeste, testeAte: c.testeAte, dono: false, ...base };
}

export const temRecurso = (p: PlanoEfetivo | undefined, r: Recurso) => !p || p.recursos.includes(r);

// Nome do menor plano que libera o recurso, para a mensagem de "faça upgrade".
export function planoMinimo(r: Recurso): string {
  for (const codigo of ['START', 'ESSENCIAL', 'PROFISSIONAL', 'ENTERPRISE'] as const) {
    if (RECURSOS_POR_PLANO[codigo].recursos.includes(r)) return planoPorCodigo(codigo)!.nome;
  }
  return 'Ilimitado';
}

export const mensagemUpgrade = (r: Recurso, oQue: string) =>
  `${oQue} faz parte do plano ${planoMinimo(r)} ou maior. Abra "Meu plano" no menu para liberar.`;

// Marca a rota com o recurso do plano que ela exige.
export const RECURSO = 'recursoDoPlano';
export const Recurso = (r: Recurso, oQue: string) => SetMetadata(RECURSO, { r, oQue });

// Plano de quem fez o pedido, para quem não recebe a sessão (PDF com marca d'água, logos).
// O middleware abre a caixa a cada pedido e o AuthGuard coloca o plano dentro.
export const caixaPlano = new AsyncLocalStorage<{ plano?: PlanoEfetivo }>();
export const planoAtual = () => caixaPlano.getStore()?.plano;

// Limite de funcionários por empresa (o Grátis só deixa 10). Lança o erro quando passa.
export function conferirFuncionarios(atuais: number, novos: number) {
  const limite = planoAtual()?.limites.funcionarios;
  if (limite != null && atuais + novos > limite) {
    throw new ForbiddenException(`O plano Grátis aceita até ${limite} funcionários por empresa. Abra "Meu plano" no menu para cadastrar mais.`);
  }
}
