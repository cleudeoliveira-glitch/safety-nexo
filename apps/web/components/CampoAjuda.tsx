'use client';

import { useEffect, useRef, useState } from 'react';

// O "?" de cada campo, sempre na mesma ordem: o que é, para que serve, como preencher e um exemplo.
// O texto vem de lib/ajudaCampos.ts: a 1ª frase de oQueE é "O que é", o resto é "Para que serve",
// ondeAcho é "Como preencher" e a base legal fica por último, em letra mais clara.
export type Ajuda = { oQueE: string; ondeAcho?: string; exemplo?: string; baseLegal?: string };

// alinhar="direita" abre o balão para a esquerda, para campos perto da borda direita da tela.
// O balão abre logo abaixo do "?" e nunca passa da borda da tela (no celular inclusive).
export function CampoAjuda({ titulo, ajuda, alinhar = 'esquerda' }: { titulo: string; ajuda: Ajuda; alinhar?: 'esquerda' | 'direita' }) {
  const [pos, setPos] = useState<{ left: number; top: number; largura: number } | null>(null);
  const botao = useRef<HTMLButtonElement>(null);

  const abrir = () => {
    if (pos) return setPos(null);
    const r = botao.current?.getBoundingClientRect();
    if (!r) return;
    const vw = window.innerWidth;
    const largura = Math.min(288, vw - 16);
    const desejado = alinhar === 'direita' ? r.right - largura : r.left;
    setPos({ left: Math.max(8, Math.min(desejado, vw - largura - 8)), top: r.bottom + 6, largura });
  };

  // Fecha ao rolar a tela, ao redimensionar ou com Esc.
  useEffect(() => {
    if (!pos) return;
    const fechar = () => setPos(null);
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && fechar();
    window.addEventListener('scroll', fechar, true);
    window.addEventListener('resize', fechar);
    window.addEventListener('keydown', tecla);
    return () => { window.removeEventListener('scroll', fechar, true); window.removeEventListener('resize', fechar); window.removeEventListener('keydown', tecla); };
  }, [pos]);

  return (
    <span className="relative inline-block align-middle">
      <button
        ref={botao}
        type="button"
        aria-label={`Ajuda sobre ${titulo}`}
        aria-expanded={!!pos}
        onClick={abrir}
        className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs text-text/60 hover:border-primary hover:text-primary"
      >
        ?
      </button>
      {pos && (
        <span
          role="dialog"
          style={{ left: pos.left, top: pos.top, width: pos.largura }}
          className="fixed z-50 block max-h-[70vh] overflow-y-auto rounded-card border border-border bg-white p-4 text-left text-sm font-normal text-text shadow-lg"
        >
          <span className="flex items-start justify-between gap-2">
            <strong className="block text-primary">{titulo}</strong>
            <button type="button" onClick={() => setPos(null)} aria-label="Fechar ajuda" className="-mr-1 -mt-1 rounded px-1.5 text-lg leading-none text-text/50 hover:text-primary">×</button>
          </span>
          <TextoAjuda ajuda={ajuda} />
        </span>
      )}
    </span>
  );
}

// O texto da ajuda, igual no "?" e na Base de Conhecimento.
export function TextoAjuda({ ajuda }: { ajuda: Ajuda }) {
  const [oQueE, ...resto] = dividirFrases(ajuda.oQueE);
  return (<>
    <span className="mt-2 block"><b>O que é:</b> {oQueE}</span>
    {resto.length > 0 && <span className="mt-2 block"><b>Para que serve:</b> {resto.join(' ')}</span>}
    {ajuda.ondeAcho && <span className="mt-2 block"><b>Como preencher:</b> {ajuda.ondeAcho}</span>}
    {ajuda.exemplo && <span className="mt-2 block rounded-lg bg-primary/5 px-2.5 py-1.5"><b>Exemplo:</b> {ajuda.exemplo}</span>}
    {ajuda.baseLegal && <span className="mt-2 block text-xs text-text/60"><b>Base legal:</b> {ajuda.baseLegal}</span>}
  </>);
}

// Separa em frases sem quebrar abreviações como "art. 58", "nº 7" ou "ex.: ".
function dividirFrases(t: string): string[] {
  return t.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/).map((f) => f.trim()).filter(Boolean);
}
