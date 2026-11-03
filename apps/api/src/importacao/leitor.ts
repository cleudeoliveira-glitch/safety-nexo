import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { DocumentoLido, INSTRUCOES } from './esquema';

export const iaConfigurada = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

// Manda o PDF inteiro (lê também PDF escaneado, como imagem) e recebe os dados já no formato do sistema.
export async function lerPdfComIa(pdf: Buffer): Promise<DocumentoLido> {
  const client = new Anthropic({ timeout: 15 * 60 * 1000, maxRetries: 2 });
  const stream = client.beta.messages.stream({
    model: process.env.IA_MODELO || 'claude-opus-5-5',
    max_tokens: 64000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: betaZodOutputFormat(DocumentoLido) },
    system: INSTRUCOES,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf.toString('base64') } },
        { type: 'text', text: 'Extraia os GHEs e os riscos deste documento.' },
      ],
    }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('A IA não aceitou ler este documento.');
  if (msg.stop_reason === 'max_tokens') throw new Error('O documento é grande demais para ler de uma vez. Envie as partes com o inventário de riscos.');
  const texto = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  const r = DocumentoLido.safeParse(JSON.parse(texto));
  if (!r.success) throw new Error('A resposta da IA veio fora do formato. Tente de novo.');
  return r.data;
}
