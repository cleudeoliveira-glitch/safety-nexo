'use client';

import { useState } from 'react';

// O "?" de cada campo: o que é, onde achar, exemplo e base legal.
export type Ajuda = { oQueE: string; ondeAcho?: string; exemplo?: string; baseLegal?: string };

// alinhar="direita" abre o balão para a esquerda, para campos perto da borda direita da tela.
export function CampoAjuda({ titulo, ajuda, alinhar = 'esquerda' }: { titulo: string; ajuda: Ajuda; alinhar?: 'esquerda' | 'direita' }) {
  const [aberto, setAberto] = useState(false);
  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        aria-label={`Ajuda sobre ${titulo}`}
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs text-text/60 hover:border-primary hover:text-primary"
      >
        ?
      </button>
      {aberto && (
        <span
          role="dialog"
          className={`absolute ${alinhar === 'direita' ? 'right-0' : 'left-0'} top-7 z-20 block w-72 rounded-card border border-border bg-white p-4 text-left text-sm font-normal text-text shadow-lg`}
        >
          <strong className="block text-primary">{titulo}</strong>
          <span className="mt-2 block">{ajuda.oQueE}</span>
          {ajuda.ondeAcho && <span className="mt-2 block"><b>Onde acho:</b> {ajuda.ondeAcho}</span>}
          {ajuda.exemplo && <span className="mt-2 block"><b>Exemplo:</b> {ajuda.exemplo}</span>}
          {ajuda.baseLegal && <span className="mt-2 block text-text/60"><b>Base legal:</b> {ajuda.baseLegal}</span>}
        </span>
      )}
    </span>
  );
}
