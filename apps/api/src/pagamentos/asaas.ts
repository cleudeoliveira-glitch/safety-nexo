import { BadGatewayException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { registrarFalha } from '../diagnostico/falhas';

// Conversa com o Asaas, o serviço que cobra o plano do Safety Nexo (cartão de crédito todo mês, Pix Automático e boleto).
// Precisa de ASAAS_API_KEY no servidor. ASAAS_AMBIENTE=producao usa a conta de verdade; sem ele, usa a de testes (sandbox).

const log = new Logger('Asaas');

export const asaasLigado = () => !!process.env.ASAAS_API_KEY;
export const asaasProducao = () => process.env.ASAAS_AMBIENTE === 'producao';
const base = () => (asaasProducao() ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3');

export type AsaasPagamento = {
  id: string; customer: string; subscription?: string | null; value: number; netValue?: number;
  billingType: string; status: string; dueDate: string; paymentDate?: string | null; clientPaymentDate?: string | null;
  confirmedDate?: string | null; invoiceUrl?: string | null; externalReference?: string | null; deleted?: boolean;
};
export type AsaasAssinatura = { id: string; customer: string; billingType: string; value: number; nextDueDate: string; status: string; externalReference?: string | null };

async function chamar<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  if (!asaasLigado()) throw new ServiceUnavailableException('O pagamento automático ainda não foi ligado. Fale com o suporte do Safety Nexo.');
  const r = await fetch(`${base()}${caminho}`, {
    method: metodo,
    headers: { access_token: process.env.ASAAS_API_KEY!, 'Content-Type': 'application/json', 'User-Agent': 'safety-nexo' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await r.text();
  const dados = texto ? JSON.parse(texto) : null;
  if (!r.ok) {
    const motivo = (dados?.errors ?? []).map((e: { description?: string }) => e.description).filter(Boolean).join(' ');
    log.warn(`${metodo} ${caminho} -> ${r.status} ${texto.slice(0, 500)}`);
    registrarFalha({ origem: 'ASAAS', rota: `${metodo} ${caminho}`, status: r.status, mensagem: motivo || `O Asaas respondeu ${r.status}.`, detalhe: texto.slice(0, 1500) });
    throw new BadGatewayException(motivo ? `O serviço de pagamento recusou: ${motivo}` : 'O serviço de pagamento não respondeu. Tente de novo em alguns minutos.');
  }
  return dados as T;
}

export const asaas = {
  criarCliente: (d: { name: string; cpfCnpj: string; email?: string; externalReference: string }) =>
    chamar<{ id: string }>('POST', '/customers', { ...d, notificationDisabled: false }),
  atualizarCliente: (id: string, d: { name?: string; cpfCnpj?: string; email?: string }) => chamar<{ id: string }>('PUT', `/customers/${id}`, d),
  // Mensal. billingType: CREDIT_CARD (o cartão fica salvo e cobra sozinho), PIX (o banco oferece o Pix Automático)
  // ou UNDEFINED (a fatura deixa escolher boleto, Pix ou cartão a cada mês).
  criarAssinatura: (d: { customer: string; billingType: 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'; value: number; nextDueDate: string; description: string; externalReference: string }) =>
    chamar<AsaasAssinatura>('POST', '/subscriptions', { ...d, cycle: 'MONTHLY' }),
  apagarAssinatura: (id: string) => chamar<{ deleted: boolean }>('DELETE', `/subscriptions/${id}`),
  // Só confere se a chave funciona (usado pelo Diagnóstico do Painel ADM).
  conferir: () => chamar<{ totalCount?: number }>('GET', '/customers?limit=1'),
  pagamentosDaAssinatura: (id: string) => chamar<{ data: AsaasPagamento[] }>('GET', `/subscriptions/${id}/payments`),
};
