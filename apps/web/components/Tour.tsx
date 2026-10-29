'use client';

import { useEffect, useLayoutEffect, useState } from 'react';

// Tour guiado: destaca um elemento por vez (marcado com data-tour) e explica para que serve.
export type PassoTour = { alvo: string; titulo: string; texto: string };

const CHAVE = 'safety-nexo:tour-visto';

export function useTourPrimeiraVez() {
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(CHAVE)) setAberto(true);
    } catch {
      // Sem acesso ao armazenamento: o tour só abre pelo botão.
    }
  }, []);
  const fechar = () => {
    setAberto(false);
    try {
      localStorage.setItem(CHAVE, '1');
    } catch {}
  };
  return { aberto, abrir: () => setAberto(true), fechar };
}

export function Tour({ passos, onFechar }: { passos: PassoTour[]; onFechar: () => void }) {
  const [indice, setIndice] = useState(0);
  const [caixa, setCaixa] = useState<DOMRect | null>(null);
  const passo = passos[indice];

  useLayoutEffect(() => {
    const el = document.querySelector(`[data-tour="${passo.alvo}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setCaixa(el ? el.getBoundingClientRect() : null);
  }, [passo]);

  const ultimo = indice === passos.length - 1;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Tour do Safety Nexo">
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      {caixa && (
        <div
          className="pointer-events-none absolute rounded-card ring-4 ring-success transition-all"
          style={{ top: caixa.top - 6, left: caixa.left - 6, width: caixa.width + 12, height: caixa.height + 12 }}
        />
      )}
      <div
        className="absolute w-80 max-w-[calc(100vw-32px)] rounded-card bg-white p-5 shadow-xl"
        style={{
          top: caixa ? Math.min(caixa.bottom + 16, window.innerHeight - 220) : '40%',
          left: caixa ? Math.max(16, Math.min(caixa.left, window.innerWidth - 336)) : 16,
        }}
      >
        <p className="text-xs text-text/60">
          Passo {indice + 1} de {passos.length}
        </p>
        <h3 className="mt-1 font-semibold text-primary">{passo.titulo}</h3>
        <p className="mt-2 text-sm">{passo.texto}</p>
        <div className="mt-4 flex justify-between gap-2">
          <button type="button" onClick={onFechar} className="text-sm text-text/60">
            Pular tour
          </button>
          <div className="flex gap-2">
            {indice > 0 && (
              <button type="button" onClick={() => setIndice(indice - 1)} className="rounded-card border border-border px-3 py-1.5 text-sm">
                Voltar
              </button>
            )}
            <button
              type="button"
              onClick={() => (ultimo ? onFechar() : setIndice(indice + 1))}
              className="rounded-card bg-primary px-3 py-1.5 text-sm font-semibold text-white"
            >
              {ultimo ? 'Concluir' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
