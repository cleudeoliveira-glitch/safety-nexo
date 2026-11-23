'use client';

import { useEffect, useRef, useState } from 'react';
import { Aviso, Botao } from '@/components/ui';
import { FormaPagamento, MeuPlano, meuPlano, PagamentoPlano } from '@/lib/api';
import { PLANOS_SITE } from '@/lib/planos';
import { dataBr } from '@/lib/vigencia';

const nomeDo = (codigo: string | null | undefined) => PLANOS_SITE.find((p) => p.codigo === codigo)?.nome ?? codigo ?? '';
const reais = (centavos: number) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const FORMAS: { codigo: FormaPagamento; titulo: string; texto: string }[] = [
  { codigo: 'CARTAO', titulo: 'Cartão de crédito', texto: 'Você cadastra o cartão uma vez e a mensalidade é cobrada sozinha todo mês.' },
  { codigo: 'PIX', titulo: 'Pix', texto: 'Ao pagar o primeiro Pix, o seu banco pergunta se você quer o Pix Automático. Aceitando, os próximos meses saem sozinhos da conta.' },
  { codigo: 'BOLETO', titulo: 'Boleto', texto: 'A fatura chega por e-mail todo mês. Nela dá para pagar com boleto, Pix ou cartão.' },
];
const NOME_FORMA: Record<string, string> = { CARTAO: 'cartão de crédito', PIX: 'Pix', BOLETO: 'boleto', CREDIT_CARD: 'Cartão', DEBIT_CARD: 'Débito', UNDEFINED: '—' };
const STATUS_PAGTO: Record<string, string> = { PAGO: 'Pago', PENDENTE: 'Em aberto', ATRASADO: 'Atrasado', ESTORNADO: 'Estornado', CANCELADO: 'Cancelado' };

const formatarDoc = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
};

// Hook da tela "Meu plano": carrega o pagamento automático (null enquanto carrega).
export function usePagamentoPlano() {
  const [pagto, setPagto] = useState<PagamentoPlano | null>(null);
  useEffect(() => { meuPlano.pagamento().then(setPagto).catch(() => setPagto({ ligado: false, teste: false, toleranciaDias: 5, assinatura: null, faturaAberta: null, historico: [] })); }, []);
  return [pagto, setPagto] as const;
}

// Pagamento do plano: cobrança automática, fatura em aberto, histórico e a escolha da forma de pagamento.
export function PagamentoDoPlano({ dados, pagto, setPagto, escolhido, setEscolhido }: {
  dados: MeuPlano; pagto: PagamentoPlano; setPagto: (p: PagamentoPlano) => void;
  escolhido: string | null; setEscolhido: (c: string | null) => void;
}) {
  const [forma, setForma] = useState<FormaPagamento>('CARTAO');
  const [doc, setDoc] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (escolhido) caixa.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [escolhido]);

  const a = pagto.assinatura;
  const planoEscolhido = PLANOS_SITE.find((p) => p.codigo === escolhido);

  async function assinar() {
    if (!escolhido) return;
    setErro(''); setEnviando(true);
    try {
      const r = await meuPlano.assinar({ plano: escolhido, forma, cpfCnpj: doc });
      if (r.link) window.location.href = r.link;
      else { setPagto(await meuPlano.pagamento()); setEscolhido(null); }
    } catch (e) { setErro((e as Error).message); }
    setEnviando(false);
  }

  async function cancelar() {
    if (!window.confirm('Cancelar a cobrança automática? O plano continua valendo até o dia que já está pago.')) return;
    setErro('');
    try { setPagto(await meuPlano.cancelarAssinatura()); } catch (e) { setErro((e as Error).message); }
  }

  return (
    <section className="rounded-card border border-border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Pagamento</h2>
      {pagto.teste && <p className="mt-1 text-xs font-semibold text-[#c2410c]">Ambiente de testes: nenhum valor é cobrado de verdade.</p>}
      {erro && <div className="mt-3"><Aviso tipo="erro">{erro}</Aviso></div>}

      {a ? (
        <div className="mt-3 space-y-2 text-sm">
          <p>
            Cobrança automática do plano <strong>{nomeDo(a.plano)}</strong> no <strong>{NOME_FORMA[a.forma ?? ''] ?? a.forma}</strong>
            {a.status === 'AGUARDANDO' && <span className="text-[#c2410c]">, aguardando o primeiro pagamento</span>}
            {a.status === 'ATRASADA' && <span className="font-semibold text-danger">, com pagamento atrasado</span>}.
          </p>
          {a.forma === 'PIX' && (
            <p className="text-text/70">{a.pixAutomatico ? 'Pix Automático autorizado no seu banco: os próximos meses saem sozinhos.' : 'O Pix Automático ainda não foi autorizado. Ao pagar o próximo Pix, aceite a oferta que o seu banco mostrar.'}</p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-text/70">
          {dados.plano === 'FREE' ? 'Escolha um plano abaixo para pagar no cartão de crédito, no Pix ou no boleto.' : 'O seu plano ainda não tem cobrança automática.'}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {pagto.faturaAberta && (
          <a href={pagto.faturaAberta.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            Pagar agora: {reais(pagto.faturaAberta.valorCentavos)}, vence {dataBr(pagto.faturaAberta.vencimento)}
          </a>
        )}
        {!a && dados.plano !== 'FREE' && !escolhido && (
          <Botao type="button" variante="secundario" onClick={() => setEscolhido(dados.plano)}>Ligar a cobrança automática</Botao>
        )}
        {a && !escolhido && <Botao type="button" variante="secundario" onClick={() => setEscolhido(a.plano)}>Trocar a forma de pagamento</Botao>}
        {a && <button type="button" onClick={cancelar} className="text-sm text-text/60 hover:text-danger">Cancelar a cobrança automática</button>}
      </div>

      {escolhido && planoEscolhido && (
        <div ref={caixa} className="mt-5 rounded-card border-2 border-primary/40 bg-background p-4">
          <p className="font-semibold">Plano {planoEscolhido.nome}: {reais(planoEscolhido.precoMensal * 100)} por mês</p>
          <p className="mt-1 text-sm text-text/70">Como você quer pagar?</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {FORMAS.map((f) => (
              <label key={f.codigo} className={`cursor-pointer rounded-card border p-3 text-sm ${forma === f.codigo ? 'border-primary bg-white ring-2 ring-primary/30' : 'border-border bg-white'}`}>
                <span className="flex items-center gap-2 font-semibold">
                  <input type="radio" name="forma" checked={forma === f.codigo} onChange={() => setForma(f.codigo)} />
                  {f.titulo}
                </span>
                <span className="mt-1 block text-text/70">{f.texto}</span>
              </label>
            ))}
          </div>
          <label className="mt-4 block text-sm">
            <span className="font-semibold">CPF ou CNPJ de quem paga</span>
            <input value={doc} onChange={(e) => setDoc(formatarDoc(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" className="mt-1 block w-full max-w-xs rounded-lg border border-border px-3 py-2" />
            <span className="mt-1 block text-xs text-text/60">Vai na nota da cobrança. O cartão é digitado na página segura do Asaas, não fica com o Safety Nexo.</span>
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Botao type="button" disabled={enviando || doc.replace(/\D/g, '').length < 11} onClick={assinar}>{enviando ? 'Abrindo o pagamento…' : 'Ir para o pagamento'}</Botao>
            <button type="button" onClick={() => setEscolhido(null)} className="text-sm text-text/60 hover:text-primary">Voltar</button>
          </div>
          <p className="mt-3 text-xs text-text/60">
            Se o seu plano atual ainda está pago, a nova cobrança começa no dia seguinte ao vencimento, sem pagar duas vezes. Se o pagamento atrasar, você tem {pagto.toleranciaDias} dias de tolerância; depois a conta fica só para consulta até pagar. Nada é apagado.
          </p>
        </div>
      )}

      {pagto.historico.length > 0 && (
        <details className="mt-5 rounded-card border border-border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Pagamentos</summary>
          <ul className="divide-y divide-border border-t border-border text-sm">
            {pagto.historico.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <span>Vence {dataBr(h.vencimento)} · {nomeDo(h.plano)} · {reais(h.valorCentavos)}{h.pagoEm ? ` · pago em ${dataBr(h.pagoEm)}` : ''}</span>
                <span className="flex items-center gap-2">
                  {h.linkFatura && <a href={h.linkFatura} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary">recibo</a>}
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${h.status === 'PAGO' ? 'bg-success/10 text-success' : h.status === 'ATRASADO' ? 'bg-danger/10 text-danger' : 'bg-background text-text/70'}`}>{STATUS_PAGTO[h.status] ?? h.status}</span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
