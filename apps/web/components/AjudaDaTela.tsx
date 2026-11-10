'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Painel } from '@/components/Dicionario';
import { Icone } from '@/components/Icone';
import { GuiaTela, guiaDoEndereco } from '@/lib/ajudaTelas';

// Evento para outras telas abrirem esta ajuda (ex.: o botão "Como usar?" do painel).
export const ABRIR_AJUDA = 'safety-nexo:abrir-ajuda';

// "Como usar esta tela?" fica no TOPO, nunca flutuando por cima dos campos:
//  - computador: botão no alto da página, à direita (rola junto com a página);
//  - celular: "?" na barra fixa do topo (BotaoAjudaTopo, no Moldura).
// Uma tela pode abrir esta ajuda disparando o evento ABRIR_AJUDA (ex.: "Como usar?" do painel).
// aba: a parte do guia que abre primeiro (telas com abas por estado, como o Campo).
export function AjudaDaTela({ caminho, barra = true, aba }: { caminho: string; barra?: boolean; aba?: string }) {
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
      {barra && (
        <div className="hidden justify-end px-6 pt-4 md:flex print:hidden">
          <BotaoComoUsar />
        </div>
      )}
      {aberto && (
        <Painel titulo={`Como usar: ${guia.titulo}`} onFechar={() => setAberto(false)}>
          <GuiaCompleto guia={guia} aba={aba ?? (typeof window === 'undefined' ? '' : window.location.hash.slice(1))} />
          <Link href="/ajuda" className="mt-6 block rounded-card border border-border px-4 py-3 text-center text-sm font-semibold text-primary hover:border-primary">
            Ver a Central de ajuda
          </Link>
        </Painel>
      )}
    </>
  );
}

// Botão "Como usar esta tela?" para pôr no alto de uma tela.
export function BotaoComoUsar({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(ABRIR_AJUDA))}
      className={`flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-sm font-medium text-text/80 shadow-sm hover:border-primary hover:text-primary print:hidden ${className}`}
    >
      <Icone nome="interrogacao" className="h-4 w-4" /> Como usar esta tela?
    </button>
  );
}

// "?" da barra do topo no celular. Só aparece se a tela tiver guia.
export function BotaoAjudaTopo({ caminho }: { caminho: string }) {
  if (!guiaDoEndereco(caminho)) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(ABRIR_AJUDA))}
      aria-label="Como usar esta tela?"
      title="Como usar esta tela?"
      className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/25"
    >
      <Icone nome="interrogacao" className="h-5 w-5" /> Ajuda
    </button>
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
