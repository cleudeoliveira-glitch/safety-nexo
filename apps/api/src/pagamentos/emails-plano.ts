import { emailMoldura, WEB } from '../common/email';

// Textos dos e-mails automáticos que o cliente recebe sobre o teste e o plano.
// Escritos como uma pessoa da equipe escreveria: curtos, diretos e sem termos técnicos.

const DIA = 86_400_000;
const dataBr = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
// Data de Brasília (UTC-3) de um instante, ao meio-dia UTC, para contar dias inteiros.
const diaBrasilia = (d: Date) => {
  const x = new Date(d.getTime() - 3 * 3600_000);
  return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate(), 12);
};
export const dataBrasilia = (d: Date) => dataBr(new Date(diaBrasilia(d)));
// Quantos dias faltam (pelo calendário de Brasília) até a data. 0 = hoje, 1 = amanhã.
export const diasAteBrasilia = (d: Date, agora = new Date()) => Math.round((diaBrasilia(d) - diaBrasilia(agora)) / DIA);

const reais = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] || nome;
const botao = (texto: string, caminho: string) =>
  `<p><a href="${WEB()}${caminho}" style="display:inline-block;background:#0E4A5B;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">${texto}</a></p>`;
const RODAPE = 'Ficou com alguma dúvida? É só responder este e-mail ou chamar no WhatsApp pelo site.';
// O que continua liberado no Grátis (common/plano.ts, RECURSOS_POR_PLANO.FREE).
const GRATIS = '1 empresa, até 10 funcionários e 1 PGR e 1 ordem de serviço para testar, com a marca "Versão Teste" no PDF';

export type EmailPronto = { assunto: string; html: string };

export function emailTesteAcabando(nome: string, testeAte: Date, dias: number): EmailPronto {
  const quando = dias <= 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`;
  const assunto = `Seu teste do Safety Nexo acaba ${quando}`;
  const corpo = `<p>Olá, ${primeiroNome(nome)}.</p>
    <p>Passando para lembrar que o seu teste com tudo liberado termina ${quando}, no dia <strong>${dataBrasilia(testeAte)}</strong>.</p>
    <p>Se quiser continuar com tudo o que usou até agora, é só escolher um plano em "Meu plano". Dá para pagar no cartão, no Pix ou no boleto, e o plano libera assim que o pagamento cair.</p>
    <p>Se preferir esperar, tudo bem. A sua conta não some: ela passa para o plano Grátis (${GRATIS}). Nada do que você cadastrou é apagado.</p>
    ${botao('Ver os planos', '/plano')}`;
  return { assunto, html: emailMoldura(assunto, corpo, RODAPE) };
}

export function emailTesteAcabou(nome: string, testeAte: Date): EmailPronto {
  const assunto = 'Seu teste do Safety Nexo terminou';
  const corpo = `<p>Olá, ${primeiroNome(nome)}.</p>
    <p>O seu teste de 14 dias terminou em <strong>${dataBrasilia(testeAte)}</strong>. Obrigado por experimentar o Safety Nexo.</p>
    <p>A sua conta continua aberta, agora no plano Grátis: ${GRATIS}. Tudo o que você cadastrou continua lá.</p>
    <p>Para voltar a usar todos os programas, laudos, assinaturas e o seu logo nos documentos, escolha um plano em "Meu plano". Libera na hora em que o pagamento cair.</p>
    ${botao('Escolher um plano', '/plano')}`;
  return { assunto, html: emailMoldura(assunto, corpo, RODAPE) };
}

// Pagamento confirmado (ou plano liberado pela equipe, quando valor vem vazio).
export function emailPlanoConfirmado(d: { nome: string; plano: string; valor?: number | null; pagoAte?: Date | null; primeiro: boolean }): EmailPronto {
  const ate = d.pagoAte ? ` Ele vale até <strong>${dataBr(d.pagoAte)}</strong>.` : '';
  const assunto = d.primeiro ? `Seu plano ${d.plano} está liberado` : 'Recebemos o seu pagamento';
  const corpo = d.primeiro
    ? `<p>Olá, ${primeiroNome(d.nome)}.</p>
      <p>${d.valor ? `Recebemos o pagamento de <strong>${reais(d.valor)}</strong> e o` : 'O'} seu plano <strong>${d.plano}</strong> já está liberado.${ate}</p>
      <p>Pode entrar e usar normalmente. Se ainda não colocou, vale cadastrar o logo da sua consultoria e o das empresas para sair nos documentos.</p>
      <p>Obrigado pela confiança. Qualquer coisa, estamos por aqui.</p>
      ${botao('Abrir o Safety Nexo', '/')}`
    : `<p>Olá, ${primeiroNome(d.nome)}.</p>
      <p>Recebemos o pagamento${d.valor ? ` de <strong>${reais(d.valor)}</strong>` : ''} do plano <strong>${d.plano}</strong>.${ate}</p>
      <p>Não precisa fazer nada. É só continuar usando.</p>
      ${botao('Ver Meu plano', '/plano')}`;
  return { assunto, html: emailMoldura(assunto, corpo, RODAPE) };
}
