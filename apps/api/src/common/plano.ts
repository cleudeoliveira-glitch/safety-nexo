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
// situacao: EM_DIA; TOLERANCIA (venceu há até 5 dias: só aviso); CONSULTA (passou da tolerância: vê e baixa, não cria nem muda).
export type SituacaoPlano = 'EM_DIA' | 'TOLERANCIA' | 'CONSULTA';
export type PlanoEfetivo = {
  codigo: string; nome: string; emTeste: boolean; testeAte: Date | null; dono: boolean; recursos: Recurso[]; limites: Limites;
  situacao: SituacaoPlano; pagoAte: Date | null; consultaDesde: Date | null;
};

// Dias de tolerância depois do vencimento, com aviso na tela e por e-mail, antes de a conta ficar só para consulta.
export const TOLERANCIA_DIAS = 5;
const DIA = 86_400_000;
const hojeBrasilia = () => {
  const x = new Date(Date.now() - 3 * 3600_000);
  return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate(), 12);
};
const meioDiaDe = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12);

// Situação do pagamento de um plano pago. Sem data de vencimento (plano liberado à mão, sem data) nada trava.
export function situacaoPlano(c: { plano: string; planoPagoAte?: Date | null; assinaturaStatus?: string | null }, dono = false): { situacao: SituacaoPlano; consultaDesde: Date | null; diasVencido: number } {
  if (dono || c.plano === 'FREE' || !c.planoPagoAte) return { situacao: 'EM_DIA', consultaDesde: null, diasVencido: 0 };
  const fim = meioDiaDe(c.planoPagoAte);
  const diasVencido = Math.round((hojeBrasilia() - fim) / DIA);
  const consultaDesde = new Date(fim + (TOLERANCIA_DIAS + 1) * DIA);
  // Quem cancelou não fica só para consulta: volta para o Grátis no dia seguinte ao vencimento (tarefa diária).
  if (diasVencido <= 0 || c.assinaturaStatus === 'CANCELADA') return { situacao: 'EM_DIA', consultaDesde, diasVencido };
  return { situacao: diasVencido <= TOLERANCIA_DIAS ? 'TOLERANCIA' : 'CONSULTA', consultaDesde, diasVencido };
}

export function planoEfetivo(c: { plano: string; testeAte: Date | null; planoPagoAte?: Date | null; assinaturaStatus?: string | null }, dono: boolean): PlanoEfetivo {
  const codigo = (planoPorCodigo(c.plano)?.codigo ?? 'FREE') as CodigoPlano;
  const nome = planoPorCodigo(codigo)!.nome;
  if (dono) return { codigo, nome, emTeste: false, testeAte: null, dono: true, situacao: 'EM_DIA', pagoAte: null, consultaDesde: null, ...RECURSOS_POR_PLANO.ENTERPRISE };
  const emTeste = codigo === 'FREE' && !!c.testeAte && c.testeAte.getTime() > Date.now();
  const base = RECURSOS_POR_PLANO[emTeste ? 'PROFISSIONAL' : codigo];
  const { situacao, consultaDesde } = situacaoPlano({ plano: codigo, planoPagoAte: c.planoPagoAte, assinaturaStatus: c.assinaturaStatus });
  return { codigo, nome, emTeste, testeAte: c.testeAte, dono: false, situacao, pagoAte: c.planoPagoAte ?? null, consultaDesde, ...base };
}

// Conta só para consulta: deixa ler, baixar PDF e ver a prévia; trava criar, mudar e apagar.
// Ficam liberados o pagamento do plano, a sessão (entrar/sair) e as preferências de aviso.
const LIBERADO_NA_CONSULTA = [/^\/meu-plano(\/|$)/, /^\/auth(\/|$)/, /^\/pagamentos(\/|$)/, /^\/push(\/|$)/, /^\/avisos\/preferencia$/];
const SO_BAIXAR = /\/(pdf|relatorio|cartaz|programacao|lista)(\/[^/]+)*$/;
export function travaConsulta(metodo: string, caminho: string, previa: boolean): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(metodo.toUpperCase())) return false;
  if (previa || SO_BAIXAR.test(caminho)) return false;
  return !LIBERADO_NA_CONSULTA.some((r) => r.test(caminho));
}
const dataBr = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
export const mensagemConsulta = (p: PlanoEfetivo, cliente: boolean) =>
  cliente
    ? 'Por enquanto este acesso está só para consulta. Você pode ver e baixar tudo o que já foi feito. Fale com a sua consultoria.'
    : `Sua conta está só para consulta porque o plano venceu em ${p.pagoAte ? dataBr(p.pagoAte) : '-'}. Você pode ver e baixar tudo o que já fez, mas para criar ou mudar algo é preciso pagar em "Meu plano". Nada foi apagado.`;

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
// lixeira: num pedido de exclusão (DELETE), o que for apagado é guardado antes na Lixeira (ver lixeira/lixeira.ts).
export type ArquivoGuardado = { prefixo: string; pastaLocal: string; caminho: string };
export type CaixaLixeira = { arvores: unknown[]; arquivos: ArquivoGuardado[] };
// mudancas: antes e depois do que foi alterado neste pedido (ver historico/antes-depois.ts).
export const caixaPlano = new AsyncLocalStorage<{ plano?: PlanoEfetivo; previa?: boolean; lixeira?: CaixaLixeira; mudancas?: { tipo: string; rotulo: string; campos: { campo: string; antes: string; depois: string }[] }[] }>();
export const planoAtual = () => caixaPlano.getStore()?.plano;
// Pré-visualização: o site pede o documento com o cabeçalho "X-Previa: 1" antes de gerar o PDF.
// Nesse pedido o documento volta em HTML, com a marca "Pré-visualização", e nada é guardado.
export const emPrevia = () => caixaPlano.getStore()?.previa === true;

// Limite de funcionários por empresa (o Grátis só deixa 10). Lança o erro quando passa.
export function conferirFuncionarios(atuais: number, novos: number) {
  const limite = planoAtual()?.limites.funcionarios;
  if (limite != null && atuais + novos > limite) {
    throw new ForbiddenException(`O plano Grátis aceita até ${limite} funcionários por empresa. Abra "Meu plano" no menu para cadastrar mais.`);
  }
}
