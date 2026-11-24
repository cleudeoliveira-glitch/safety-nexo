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

// Relatório de inspeção feito sobre várias fotos do mesmo local.
export const RelatorioInspecaoIa = z.object({
  resumo: z.string(),
  perigos: z.array(Perigo.extend({ foto: z.number().int().nullable() })),
  boasPraticas: z.array(z.string()),
  prazoSugeridoDias: z.number().int().min(7).max(365),
});
export type RelatorioInspecaoIa = z.infer<typeof RelatorioInspecaoIa>;

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

async function perguntar<T>(esquema: z.ZodType<T>, instrucoes: string, texto: string, imagem?: Imagem | Imagem[]): Promise<T> {
  if (!iaConfigurada()) throw new ServiceUnavailableException(SEM_IA);
  const client = new Anthropic({ timeout: 5 * 60 * 1000, maxRetries: 2 });
  const conteudo: Anthropic.Beta.BetaContentBlockParam[] = [];
  const imagens = imagem ? (Array.isArray(imagem) ? imagem : [imagem]) : [];
  imagens.forEach((img, i) => {
    if (!TIPOS.includes(img.tipo as (typeof TIPOS)[number])) throw new Error('Envie a foto em JPG, PNG ou WEBP.');
    if (imagens.length > 1) conteudo.push({ type: 'text', text: `Foto ${i + 1}:` });
    conteudo.push({ type: 'image', source: { type: 'base64', media_type: img.tipo as (typeof TIPOS)[number], data: img.dados.toString('base64') } });
  });
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

export const relatorioDeInspecao = (imagens: Imagem[], contexto: string) => perguntar(RelatorioInspecaoIa,
  `Você recebe de 1 a 15 fotos do mesmo local de trabalho, tiradas numa inspeção de segurança.
Escreva um resumo curto do que a inspeção mostra (2 a 4 frases).
Liste os perigos que dá para VER nas fotos. Para cada um: o que está errado, a NR relacionada, o tipo de risco, a probabilidade e a severidade de 1 a 5 (matriz 5x5), ações corretivas práticas e o número da foto onde aparece (null se aparece em várias).
Liste o que está certo (boas práticas), se houver.
Em prazoSugeridoDias, sugira em quantos dias inspecionar o local de novo: menos dias quando há risco alto.
Se uma foto não mostra um ambiente de trabalho, ignore essa foto e diga isso no resumo.`,
  `Contexto informado pela técnica: ${contexto || 'nenhum'}.`, imagens);

// Mudança em NR achada no Diário Oficial: explica em linguagem simples para a consultora de SST.
export const MudancaNorma = z.object({
  titulo: z.string(),
  normas: z.array(z.string()),
  resumo: z.string(),
  oQueFazer: z.string(),
  vigenciaEm: z.string().nullable(),
});
export type MudancaNorma = z.infer<typeof MudancaNorma>;

export const explicarMudancaNorma = (textoOficial: string) => perguntar(MudancaNorma,
  `Você recebe o texto de um ato publicado no Diário Oficial da União que mexe em uma ou mais Normas Regulamentadoras.
Explique para uma consultora de SST, como uma colega explicaria, sem juridiquês e sem cara de texto de robô.
titulo: até 90 caracteres, começando pelas NRs (ex.: "NR-01: prazo do capítulo 1.5 adiado para 2027").
normas: as NRs afetadas no formato "NR-01", "NR-35".
resumo: o que mudou de fato, em 3 a 6 frases curtas. Diga o que era antes e como fica, quando o texto permitir. Cite o item da NR só quando estiver no texto.
oQueFazer: o que a consultora precisa revisar nas empresas (PGR, PCMSO, treinamentos, fichas, laudos etc.), em 1 a 4 frases. Se não precisa fazer nada agora, diga isso.
vigenciaEm: a data em que passa a valer, no formato AAAA-MM-DD, ou null se o texto não diz.
Use só o que está no texto. Não invente prazos nem itens.`,
  textoOficial.slice(0, 120000));
