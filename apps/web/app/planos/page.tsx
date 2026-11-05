'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { GradePlanos, InclusoEmTodos } from '@/components/Planos';
import { lerToken } from '@/lib/sessao';

// Página aberta dos planos: qualquer pessoa vê, sem entrar no sistema.
export default function PaginaPlanos() {
  const [logado, setLogado] = useState(false);
  useEffect(() => setLogado(!!lerToken()), []);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link href={logado ? '/' : '/entrar'}><img src="/logo.png" alt="Safety Nexo" className="h-10 w-auto" /></Link>
        <nav className="flex gap-2 text-sm">
          {logado ? (
            <Link href="/plano" className="rounded-card bg-primary px-4 py-2 font-semibold text-white">Meu plano</Link>
          ) : (
            <>
              <Link href="/entrar" className="rounded-card border border-border bg-white px-4 py-2 font-semibold">Entrar</Link>
              <Link href="/cadastro" className="rounded-card bg-primary px-4 py-2 font-semibold text-white">Criar conta grátis</Link>
            </>
          )}
        </nav>
      </header>

      <section className="mt-10 text-center">
        <h1 className="text-3xl font-semibold text-primary sm:text-4xl">Planos do Safety Nexo</h1>
        <p className="mx-auto mt-3 max-w-2xl text-text/70">
          Comece grátis com 1 empresa. Quando sua carteira crescer, troque de plano a qualquer momento. Todos os planos têm o sistema inteiro.
        </p>
      </section>

      <section className="mt-8">
        <GradePlanos
          acao={(p) => (
            <Link
              href={logado ? '/plano' : `/cadastro?plano=${p.codigo}`}
              className={`block rounded-card px-4 py-2.5 text-center text-sm font-semibold ${p.destaque ? 'bg-primary text-white' : 'border border-border bg-white hover:border-primary'}`}
            >
              {p.precoMensal === 0 ? 'Começar grátis' : `Quero o ${p.nome}`}
            </Link>
          )}
        />
      </section>

      <section className="mt-12"><InclusoEmTodos /></section>

      <section className="mt-12 rounded-card border border-border bg-white p-6 text-sm text-text/70">
        <h2 className="text-lg font-semibold text-text">Como funciona</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Toda conta nova começa no plano Free, sem cartão.</li>
          <li>Para mudar de plano, entre no sistema e abra <strong>Meu plano</strong> no menu. A equipe do Safety Nexo confirma a troca e combina o pagamento.</li>
          <li>Seus dados ficam guardados mesmo se você trocar de plano.</li>
        </ul>
      </section>
    </main>
  );
}
