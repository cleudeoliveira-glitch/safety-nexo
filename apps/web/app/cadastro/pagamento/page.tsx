'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { NomePasso, PassosCompra, TopoSite } from '@/components/PassosCompra';
import { Aviso, Botao } from '@/components/ui';
import { FormaPagamento, meuPlano, PagamentoPlano } from '@/lib/api';
import { PLANOS_SITE, reais, textoLimite } from '@/lib/planos';
import { lerToken } from '@/lib/sessao';

// Etapa 3 do caminho de compra: a conta já existe, falta pagar o plano escolhido.
// A cobrança é a mesma da tela "Meu plano" (Asaas): cartão, Pix ou boleto, cobrados todo mês.

const FORMAS: { codigo: FormaPagamento; titulo: string; texto: string }[] = [
  { codigo: 'CARTAO', titulo: 'Cartão de crédito', texto: 'Cadastra uma vez e a mensalidade sai sozinha todo mês.' },
  { codigo: 'PIX', titulo: 'Pix', texto: 'No primeiro Pix o seu banco oferece o Pix Automático para os próximos meses.' },
  { codigo: 'BOLETO', titulo: 'Boleto', texto: 'A fatura chega por e-mail todo mês, com boleto, Pix ou cartão.' },
];

const formatarDoc = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
};

export default function PagamentoDoCadastro() {
  const [plano, setPlano] = useState<(typeof PLANOS_SITE)[number] | null>(null);
  const [pagto, setPagto] = useState<PagamentoPlano | null>(null);
  const [forma, setForma] = useState<FormaPagamento>('CARTAO');
  const [doc, setDoc] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [pedido, setPedido] = useState(false);

  useEffect(() => {
    if (!lerToken()) { window.location.href = '/cadastro'; return; }
    const codigo = new URLSearchParams(window.location.search).get('plano');
    const p = PLANOS_SITE.find((x) => x.codigo === codigo && x.precoMensal > 0);
    if (!p) { window.location.href = '/empresas/nova'; return; }
    setPlano(p);
    meuPlano.pagamento().then(setPagto).catch(() => setPagto({ ligado: false, teste: false, toleranciaDias: 5, assinatura: null, faturaAberta: null, historico: [] }));
  }, []);

  async function pagar() {
    if (!plano) return;
    setErro(''); setEnviando(true);
    try {
      const r = await meuPlano.assinar({ plano: plano.codigo, forma, cpfCnpj: doc });
      if (r.link) setLink(r.link);
      else window.location.href = '/empresas/nova';
    } catch (e) { setErro((e as Error).message); }
    setEnviando(false);
  }

  // Cobrança automática ainda não ligada no servidor: o pedido vai para a equipe, como antes.
  async function pedirAEquipe() {
    if (!plano) return;
    setErro(''); setEnviando(true);
    try { await meuPlano.pedir(plano.codigo); setPedido(true); } catch (e) { setErro((e as Error).message); }
    setEnviando(false);
  }

  if (!plano || !pagto) return <main className="p-10 text-sm text-text/60">Carregando…</main>;

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <TopoSite />
      <div>
        <PassosCompra atual={link || pedido ? 4 : 3} />
        <NomePasso atual={link || pedido ? 4 : 3} />
      </div>

      <section className="space-y-5 rounded-card border border-border bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Pagamento</h1>
          <p className="text-sm text-text/60">Sua conta já foi criada. Agora é só pagar o plano para liberar tudo.</p>
          {pagto.teste && <p className="mt-1 text-xs font-semibold text-[#c2410c]">Ambiente de testes: nenhum valor é cobrado de verdade.</p>}
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-card border border-primary/30 bg-primary/5 px-4 py-3">
          <span><strong>Plano {plano.nome}</strong> · {textoLimite(plano.limiteEmpresas).toLowerCase()}</span>
          <span className="text-xl font-semibold text-primary">{reais(plano.precoMensal)}<span className="text-sm font-normal text-text/60">/mês</span></span>
        </div>

        {erro && <Aviso tipo="erro">{erro}</Aviso>}

        {link ? (
          <div className="space-y-4">
            <Aviso tipo="ok">Tudo certo. A cobrança foi criada. Abra a página segura de pagamento e conclua por lá.</Aviso>
            <a href={link} target="_blank" rel="noopener noreferrer" className="block rounded-card bg-primary px-4 py-3 text-center font-semibold text-white hover:opacity-90">
              Abrir a página de pagamento
            </a>
            <p className="text-sm text-text/70">O plano é liberado assim que o pagamento for confirmado (no cartão e no Pix costuma ser na hora; no boleto, em até 3 dias úteis). Enquanto isso você já pode usar o sistema.</p>
            <Link href="/empresas/nova" className="block rounded-card border border-border px-4 py-3 text-center font-semibold hover:border-primary hover:text-primary">
              Acessar o sistema
            </Link>
          </div>
        ) : pedido ? (
          <div className="space-y-4">
            <Aviso tipo="ok">Pedido do plano {plano.nome} enviado. A equipe do Safety Nexo fala com você para combinar o pagamento.</Aviso>
            <Link href="/empresas/nova" className="block rounded-card bg-primary px-4 py-3 text-center font-semibold text-white hover:opacity-90">Acessar o sistema</Link>
          </div>
        ) : !pagto.ligado ? (
          <div className="space-y-4">
            <p className="text-sm text-text/70">O pagamento on-line ainda está sendo ligado. Mande o pedido e a nossa equipe fala com você para combinar o pagamento. Enquanto isso, a conta já funciona com tudo liberado por 14 dias.</p>
            <Botao type="button" disabled={enviando} onClick={pedirAEquipe} className="w-full">{enviando ? 'Enviando…' : `Pedir o plano ${plano.nome}`}</Botao>
          </div>
        ) : (
          <>
            <div>
              <p className="text-sm font-semibold">Como você quer pagar?</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
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
            </div>
            <label className="block text-sm">
              <span className="font-semibold">CPF ou CNPJ de quem paga</span>
              <input value={doc} onChange={(e) => setDoc(formatarDoc(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" className="mt-1 block w-full rounded-lg border border-border px-3 py-2.5" />
              <span className="mt-1 block text-xs text-text/60">Vai na nota da cobrança. O cartão é digitado na página segura do Asaas e não fica guardado no Safety Nexo.</span>
            </label>
            <Botao type="button" disabled={enviando || doc.replace(/\D/g, '').length < 11} onClick={pagar} className="w-full">
              {enviando ? 'Criando a cobrança…' : `Pagar ${reais(plano.precoMensal)} e liberar o plano`}
            </Botao>
            <p className="text-xs text-text/60">Sem fidelidade: você cancela quando quiser em Minha conta › Meu plano.</p>
          </>
        )}
      </section>

      {!link && !pedido && (
        <p className="text-center text-sm text-text/60">
          Quer conhecer antes de pagar? <Link href="/empresas/nova" className="font-semibold text-primary hover:underline">Usar os 14 dias de teste e pagar depois</Link>
        </p>
      )}
    </main>
  );
}
