'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Painel } from '@/components/Dicionario';
import { Icone } from '@/components/Icone';
import { GuiaTela, guiaDoEndereco } from '@/lib/ajudaTelas';

// Evento para outras telas abrirem esta ajuda (ex.: o botão "Como usar?" do painel).
export const ABRIR_AJUDA = 'safety-nexo:abrir-ajuda';

// Botão fixo "Como usar esta tela?", em todas as telas com menu.
export function AjudaDaTela({ caminho }: { caminho: string }) {
  const [aberto, setAberto] = useState(false);
  const guia = guiaDoEndereco(caminho);

  useEffect(() => {
    const abrir = () => setAberto(true);
    window.addEventListener(ABRIR_AJUDA, abrir);
    return () => window.removeEventListener(ABRIR_AJUDA, abrir);
  }, []);
  useEffect(() => setAberto(false), [caminho]);

  if (!guia) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Como usar esta tela?"
        className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:brightness-110 print:hidden"
      >
        <Icone nome="interrogacao" className="h-5 w-5" />
        <span className="md:hidden">Ajuda</span>
        <span className="hidden md:inline">Como usar esta tela?</span>
      </button>
      {aberto && (
        <Painel titulo={`Como usar: ${guia.titulo}`} onFechar={() => setAberto(false)}>
          <GuiaCompleto guia={guia} aba={typeof window === 'undefined' ? '' : window.location.hash.slice(1)} />
          <Link href="/ajuda" className="mt-6 block rounded-card border border-border px-4 py-3 text-center text-sm font-semibold text-primary hover:border-primary">
            Ver a ajuda de todas as telas
          </Link>
        </Painel>
      )}
    </>
  );
}

// O guia de uma tela: para que serve e o passo a passo de cada parte. A parte da aba aberta vem primeiro e aberta.
export function GuiaCompleto({ guia, aba = '' }: { guia: GuiaTela; aba?: string }) {
  const daAba = guia.partes.findIndex((p) => p.aba && p.aba === aba);
  const partes = daAba > 0 ? [guia.partes[daAba], ...guia.partes.filter((_, i) => i !== daAba)] : guia.partes;
  const sozinha = partes.length === 1;
  return (
    <div className="space-y-4 text-sm">
      <p className="rounded-card bg-primary/5 p-3 leading-relaxed"><b>Para que serve:</b> {guia.paraQue}</p>
      {partes.map((p, i) => (
        <details key={p.titulo} open={sozinha || i === 0} className="rounded-card border border-border p-3">
          <summary className="cursor-pointer font-semibold text-primary">{p.titulo}</summary>
          <ol className="mt-2 list-decimal space-y-2 pl-5 leading-relaxed">
            {p.passos.map((passo) => <li key={passo}>{passo}</li>)}
          </ol>
        </details>
      ))}
      {guia.dicas?.map((d) => (
        <p key={d} className="rounded-card border border-success/30 bg-success/10 p-3 leading-relaxed"><b>Dica:</b> {d}</p>
      ))}
      <p className="text-text/60">Nos formulários, o <b>?</b> ao lado do nome do campo explica o que é, onde achar a informação e dá um exemplo.</p>
    </div>
  );
}
