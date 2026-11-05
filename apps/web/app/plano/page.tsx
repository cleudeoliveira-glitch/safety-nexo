'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { GradePlanos, InclusoEmTodos } from '@/components/Planos';
import { Aviso, Botao } from '@/components/ui';
import { MeuPlano, meuPlano } from '@/lib/api';
import { PLANOS_SITE, textoLimite } from '@/lib/planos';

const nomeDo = (codigo: string | null) => PLANOS_SITE.find((p) => p.codigo === codigo)?.nome ?? codigo;
const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');

// Tela "Meu plano" (dentro do sistema): plano atual, quantas empresas já usa e o pedido de troca.
export default function PaginaMeuPlano() {
  const [dados, setDados] = useState<MeuPlano | null>(null);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [enviando, setEnviando] = useState('');

  useEffect(() => { meuPlano.ver().then(setDados).catch((e: Error) => setErro(e.message)); }, []);

  async function pedir(codigo: string) {
    setErro(''); setOk(''); setEnviando(codigo);
    try {
      setDados(await meuPlano.pedir(codigo));
      setOk(`Pedido do plano ${nomeDo(codigo)} enviado. A equipe do Safety Nexo vai falar com você para confirmar a troca e o pagamento.`);
    } catch (e) { setErro((e as Error).message); }
    setEnviando('');
  }

  const usoPct = dados && dados.limiteEmpresas ? Math.min(100, Math.round((dados.empresas / dados.limiteEmpresas) * 100)) : 0;

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Meu plano</h1>
        <p className="text-sm text-text/60">Veja o seu plano, quantas empresas você já usa e o que tem em cada plano. <Link href="/planos" className="font-semibold text-primary">Abrir a página dos planos</Link></p>
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {ok && <Aviso tipo="ok">{ok}</Aviso>}

      {dados && (
        <section className="rounded-card border border-border bg-white p-6 shadow-sm">
          {dados.acessoTotal ? (
            <>
              <h2 className="text-lg font-semibold">Acesso total</h2>
              <p className="mt-1 text-text/70">Esta é a conta da dona da plataforma: usa o sistema inteiro, sem pagar plano e sem limite de empresas. Você já tem {dados.empresas} empresa{dados.empresas === 1 ? '' : 's'} cadastrada{dados.empresas === 1 ? '' : 's'}.</p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Plano {dados.nomePlano}</h2>
              <p className="mt-1 text-text/70">
                {textoLimite(dados.limiteEmpresas)}. Você já usa {dados.empresas}{dados.limiteEmpresas ? ` de ${dados.limiteEmpresas}` : ''}.
              </p>
              {dados.limiteEmpresas !== null && (
                <div className="mt-3 h-3 w-full max-w-md overflow-hidden rounded-full bg-background" aria-hidden>
                  <div className={`h-full ${usoPct >= 100 ? 'bg-danger' : usoPct >= 80 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${usoPct}%` }} />
                </div>
              )}
              {dados.limiteEmpresas !== null && dados.empresas >= dados.limiteEmpresas && (
                <p className="mt-2 text-sm font-semibold text-danger">Você chegou ao limite do seu plano. Para cadastrar mais empresas, escolha um plano maior abaixo.</p>
              )}
              {dados.pedidoPlano && (
                <p className="mt-3 text-sm text-text/70">Pedido em andamento: plano <strong>{nomeDo(dados.pedidoPlano)}</strong>, feito em {data(dados.pedidoPlanoEm)}. A equipe do Safety Nexo vai confirmar.</p>
              )}
            </>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xl font-semibold">Planos</h2>
        <GradePlanos
          atual={dados && !dados.acessoTotal ? dados.plano : undefined}
          acao={(p) => {
            if (!dados || dados.acessoTotal) return null;
            if (p.codigo === dados.plano) return <p className="text-center text-sm font-semibold text-success">Plano atual</p>;
            if (p.codigo === dados.pedidoPlano) return <p className="text-center text-sm font-semibold text-primary">Pedido enviado</p>;
            if (p.limiteEmpresas !== null && p.limiteEmpresas < dados.empresas) return <p className="text-center text-xs text-text/50">Você já tem mais empresas que este plano permite</p>;
            return (
              <Botao type="button" variante={p.destaque ? 'primario' : 'secundario'} className="w-full" disabled={!!enviando} onClick={() => pedir(p.codigo)}>
                {enviando === p.codigo ? 'Enviando…' : `Quero o ${p.nome}`}
              </Botao>
            );
          }}
        />
      </section>

      <InclusoEmTodos />
    </main>
  );
}
