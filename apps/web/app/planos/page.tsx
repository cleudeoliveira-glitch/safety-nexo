'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BotaoPlanoSite, GradePlanos, InclusoEmTodos } from '@/components/Planos';
import { DuvidasPlanos, LinkWhatsApp } from '@/components/DuvidasPlanos';
import { lerToken } from '@/lib/sessao';

// Página aberta dos planos: qualquer pessoa vê, sem entrar no sistema.
export default function PaginaPlanos() {
  const [logado, setLogado] = useState(false);
  useEffect(() => setLogado(!!lerToken()), []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/"><img src="/logo.png" alt="Safety Nexo" className="h-10 w-auto" /></Link>
        <nav className="flex gap-2 text-sm">
          {logado ? (
            <Link href="/plano" className="rounded-xl bg-primary px-4 py-2.5 font-semibold text-white">Meu plano</Link>
          ) : (
            <>
              <Link href="/entrar" className="rounded-xl px-4 py-2.5 font-semibold text-text/75 hover:text-primary">Entrar</Link>
              <Link href="/cadastro?plano=FREE" className="rounded-xl bg-primary px-4 py-2.5 font-semibold text-white hover:bg-primary-escuro">Começar grátis</Link>
            </>
          )}
        </nav>
      </header>

      <section className="mt-10 text-center sm:mt-14">
        <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-5xl">Planos do Safety Nexo</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-text/75 sm:text-lg">
          Comece grátis com 1 empresa. Os primeiros 14 dias têm tudo liberado. Quando a carteira crescer, você troca de plano quando quiser.
        </p>
      </section>

      <section className="mt-12">
        <GradePlanos
          acao={(p) =>
            logado ? (
              <Link href="/plano" className="flex min-h-[3rem] items-center justify-center rounded-xl border-2 border-primary px-5 py-3 text-base font-semibold text-primary hover:bg-primary hover:text-white">
                Ver em Meu plano
              </Link>
            ) : (
              <BotaoPlanoSite p={p} href={`/cadastro?plano=${p.codigo}`} />
            )
          }
        />
        <p className="mt-8 text-center text-base text-text/70">
          Prefere pagar o ano de uma vez? São 10 mensalidades por 12 meses de uso. <LinkWhatsApp>Fale com a gente no WhatsApp</LinkWhatsApp>.
        </p>
      </section>

      <section className="mt-16"><InclusoEmTodos /></section>

      <section className="mx-auto mb-16 mt-16 max-w-3xl"><DuvidasPlanos /></section>
    </main>
  );
}
