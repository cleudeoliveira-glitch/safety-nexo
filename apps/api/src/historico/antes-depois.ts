import { Logger } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@prisma/client';
import { caixaPlano } from '../common/plano';

// Histórico com antes e depois: quando alguém muda um risco, um GHE, um ASO, uma ação do plano ou uma versão
// do PGR, guarda o que estava e o que ficou, campo por campo, para quem precisar mostrar numa fiscalização.

export type Mudanca = { tipo: string; rotulo: string; campos: { campo: string; antes: string; depois: string }[] };

// Modelos vigiados e o nome de cada campo como a consultora conhece. Campo fora da lista não entra.
const VIGIADOS: Record<string, { tipo: string; rotulo: (r: Record<string, unknown>) => string; campos: Record<string, string> }> = {
  GheRisco: {
    tipo: 'Risco', rotulo: (r) => String(r.agente ?? ''),
    campos: {
      tipo: 'Tipo de risco', agente: 'Agente', fonteGeradora: 'Fonte geradora', medidasControle: 'Outras medidas', medidasEpc: 'EPC',
      medidasEpi: 'EPI', severidade: 'Severidade', probabilidade: 'Probabilidade', possiveisLesoes: 'Possíveis lesões',
      tipoAvaliacao: 'Tipo de avaliação', intensidade: 'Intensidade medida', limiteTolerancia: 'Limite de tolerância', anexoNr15: 'Anexo da NR-15',
      grauInsalubridade: 'Grau de insalubridade', tecnicaMedicao: 'Técnica de medição', epcEficaz: 'EPC eficaz', epiEficaz: 'EPI eficaz', epiCa: 'CA do EPI',
      codigoAnexoIv: 'Código do Anexo IV', aposentadoriaEspecial: 'Aposentadoria especial',
    },
  },
  Ghe: {
    tipo: 'GHE', rotulo: (r) => String(r.nome ?? ''),
    campos: { nome: 'Nome', codigo: 'Código', unidade: 'Unidade', descricao: 'Descrição', setor: 'Setor', periculosidadeAnexo: 'Periculosidade (NR-16)', periculosidadeJustificativa: 'Justificativa da periculosidade' },
  },
  Aso: {
    tipo: 'ASO', rotulo: (r) => String(r.tipo ?? '').replace(/_/g, ' ').toLowerCase(),
    campos: {
      tipo: 'Tipo', dataExame: 'Data do exame', resultado: 'Resultado', medicoExaminadorNome: 'Médico', medicoExaminadorCrm: 'CRM', medicoExaminadorUf: 'UF do CRM',
      exames: 'Exames', riscos: 'Riscos', proximoExame: 'Próximo exame', observacoes: 'Observações',
    },
  },
  AcaoCorretiva: {
    tipo: 'Ação do plano', rotulo: (r) => String(r.descricao ?? ''),
    campos: {
      descricao: 'Descrição', local: 'Local', responsavel: 'Responsável', responsavelEmail: 'E-mail do responsável', prazo: 'Prazo', prioridade: 'Prioridade', status: 'Situação', feitaEm: 'Feita em',
      feitaPor: 'Feita por', observacao: 'Observação', hierarquia: 'Hierarquia de controle', nivelAntes: 'Nível antes', nivelDepois: 'Nível depois', eficaz: 'Eficaz',
    },
  },
  Documento: {
    tipo: 'Versão de documento', rotulo: (r) => `${r.tipo ?? ''} versão ${r.versao ?? ''}`,
    campos: { vencimento: 'Vencimento', mudancas: 'O que mudou' },
  },
};

// Valores guardados em código que viram palavra na tela.
const PALAVRAS: Record<string, string> = { ABERTA: 'A fazer', ANDAMENTO: 'Em andamento', FEITA: 'Feita', ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa', APTO: 'Apto', INAPTO: 'Inapto' };
function texto(v: unknown): string {
  if (v === null || v === undefined || v === '') return '(vazio)';
  if (v instanceof Date) return v.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '(vazio)';
  return PALAVRAS[String(v)] ?? String(v).slice(0, 300);
}

// Compara duas versões da mesma linha. Exportada para os testes.
export function comparar(modelo: string, antes: Record<string, unknown>, depois: Record<string, unknown>): Mudanca | null {
  const v = VIGIADOS[modelo];
  if (!v) return null;
  const campos: Mudanca['campos'] = [];
  for (const [campo, nome] of Object.entries(v.campos)) {
    if (!(campo in depois)) continue;
    const a = texto(antes[campo]), d = texto(depois[campo]);
    if (a !== d) campos.push({ campo: nome, antes: a, depois: d });
  }
  return campos.length ? { tipo: v.tipo, rotulo: v.rotulo(depois).slice(0, 80), campos } : null;
}

const log = new Logger('Historico');
type Leitor = Record<string, { findUnique: (a: unknown) => Promise<Record<string, unknown> | null> }>;
const delegado = (m: string) => m.charAt(0).toLowerCase() + m.slice(1);

// Ligado no PrismaService: num pedido com histórico ligado, lê a linha antes de mudar e compara com o resultado.
export function ligarAntesDepois(prisma: PrismaClient) {
  prisma.$use(async (params: Prisma.MiddlewareParams, next) => {
    const caixa = caixaPlano.getStore()?.mudancas;
    if (!caixa || params.action !== 'update' || !params.model || !VIGIADOS[params.model]) return next(params);
    let antes: Record<string, unknown> | null = null;
    try { antes = await (prisma as unknown as Leitor)[delegado(params.model)].findUnique({ where: params.args?.where }); }
    catch (e) { log.warn(`não leu o antes (${params.model}): ${(e as Error).message}`); }
    const depois = await next(params);
    if (antes && depois && typeof depois === 'object') {
      const m = comparar(params.model, antes, depois as Record<string, unknown>);
      if (m) caixa.push(m);
    }
    return depois;
  });
}
