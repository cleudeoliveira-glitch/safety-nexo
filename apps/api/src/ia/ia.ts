import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { ServiceUnavailableException } from '@nestjs/common';
import { z } from 'zod';
import { iaConfigurada } from '../importacao/leitor';

export const SEM_IA = 'A IA ainda não está ligada neste servidor: falta configurar a chave da IA (ANTHROPIC_API_KEY).';

const BASE = `Você ajuda profissionais de Segurança e Saúde no Trabalho (SST) no Brasil.
Responda em português do Brasil, com frases curtas e simples, sem jargão desnecessário.
Use as Normas Regulamentadoras (NRs) vigentes do Ministério do Trabalho e cite a NR (e o item, só quando tiver certeza).
Nunca invente fatos que não aparecem na foto ou no texto. Se algo não dá para ver ou saber, diga isso.
Tudo o que você escreve é sugestão: o profissional habilitado revisa, decide e assina.`;

export const Perigo = z.object({
  descricao: z.string(),
  nr: z.string().nullable(),
  tipo: z.enum(['FISICO', 'QUIMICO', 'BIOLOGICO', 'ERGONOMICO', 'ACIDENTE']),
  probabilidade: z.number().int().min(1).max(5),
  severidade: z.number().int().min(1).max(5),
  acoes: z.array(z.string()),
});
export const AnaliseFoto = z.object({
  resumo: z.string(),
  imagemUtil: z.boolean(),
  perigos: z.array(Perigo),
  boasPraticas: z.array(z.string()),
});
export type AnaliseFoto = z.infer<typeof AnaliseFoto>;

export const AprSugerida = z.object({
  etapas: z.array(z.object({ etapa: z.string(), riscos: z.string(), medidas: z.string(), epis: z.string() })),
  permissoes: z.array(z.string()),
  observacao: z.string().nullable(),
});
export type AprSugerida = z.infer<typeof AprSugerida>;

export const InvestigacaoSugerida = z.object({
  porques: z.array(z.string()),
  causas: z.array(z.object({ categoria: z.enum(['METODO', 'MAQUINA', 'MATERIAL', 'PESSOAS', 'AMBIENTE', 'GESTAO']), texto: z.string() })),
  medidas: z.array(z.object({ descricao: z.string(), prioridade: z.enum(['ALTA', 'MEDIA', 'BAIXA']) })),
  observacao: z.string().nullable(),
});
export type InvestigacaoSugerida = z.infer<typeof InvestigacaoSugerida>;

export type Imagem = { dados: Buffer; tipo: string };
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

async function perguntar<T>(esquema: z.ZodType<T>, instrucoes: string, texto: string, imagem?: Imagem): Promise<T> {
  if (!iaConfigurada()) throw new ServiceUnavailableException(SEM_IA);
  const client = new Anthropic({ timeout: 5 * 60 * 1000, maxRetries: 2 });
  const conteudo: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (imagem) {
    if (!TIPOS.includes(imagem.tipo as (typeof TIPOS)[number])) throw new Error('Envie a foto em JPG, PNG ou WEBP.');
    conteudo.push({ type: 'image', source: { type: 'base64', media_type: imagem.tipo as (typeof TIPOS)[number], data: imagem.dados.toString('base64') } });
  }
  conteudo.push({ type: 'text', text: texto });
  const msg = await client.beta.messages.stream({
    model: process.env.IA_MODELO || 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low', format: betaZodOutputFormat(esquema) },
    system: `${BASE}\n\n${instrucoes}`,
    messages: [{ role: 'user', content: conteudo }],
  }).finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('A IA não aceitou analisar este conteúdo.');
  const bruto = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  const r = esquema.safeParse(JSON.parse(bruto));
  if (!r.success) throw new Error('A resposta da IA veio fora do formato. Tente de novo.');
  return r.data;
}

export const analisarFoto = (imagem: Imagem, contexto: string) => perguntar(AnaliseFoto,
  `Analise a foto de um local de trabalho como numa inspeção de segurança.
Liste só os perigos que dá para VER na foto. Para cada um: o que está errado, a NR relacionada, o tipo de risco, a probabilidade e a severidade de 1 a 5 (matriz 5x5) e ações corretivas práticas.
Se a foto não mostra um ambiente de trabalho ou está ruim, marque imagemUtil como falso e explique no resumo.
Liste também o que está certo (boas práticas), se houver.`,
  `Contexto informado pela técnica: ${contexto || 'nenhum'}.`, imagem);

export const sugerirApr = (atividade: string, local: string, imagem?: Imagem) => perguntar(AprSugerida,
  `Monte uma Análise Preliminar de Risco (APR) para a atividade.
Divida em 3 a 8 etapas na ordem em que são feitas. Para cada etapa: riscos, medidas de controle e EPIs (com o nome comum do EPI).
Em "permissoes", diga se a atividade pede permissão de trabalho (altura NR-35, espaço confinado NR-33, trabalho a quente, eletricidade NR-10). Deixe vazio se não pedir.`,
  `Atividade: ${atividade}\nLocal: ${local || 'não informado'}`, imagem);

export const sugerirInvestigacao = (descricao: string) => perguntar(InvestigacaoSugerida,
  `Ajude a investigar um acidente ou quase acidente.
Monte os 5 porquês (cada um respondendo ao anterior, até a causa de gestão), as causas por categoria (método, máquina, material, pessoas, ambiente, gestão) e medidas para evitar que se repita.
Não culpe a vítima: procure causas no sistema de trabalho. Se faltar informação, diga em "observacao" o que perguntar às testemunhas.`,
  `O que aconteceu: ${descricao}`);
