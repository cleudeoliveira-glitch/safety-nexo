'use client';

import { useEffect, useState } from 'react';

// "Falta isto": quando a pessoa toca em salvar e falta campo obrigatório, em vez do balão do navegador
// (que mostra um campo só e some), aparece a lista do que falta e a tela vai até o primeiro campo.

function nomeDoCampo(el: HTMLElement): string {
  const id = el.id;
  const rotulo = (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) || el.closest('label');
  const texto = rotulo?.textContent ?? el.getAttribute('aria-label') ?? (el as HTMLInputElement).placeholder ?? '';
  return texto.replace(/\?/g, '').replace(/\s+/g, ' ').trim() || 'um campo';
}

export function OQueFalta() {
  const [faltam, setFaltam] = useState<string[] | null>(null);

  useEffect(() => {
    let lote: HTMLElement[] = [];
    let espera: ReturnType<typeof setTimeout> | undefined;
    const aoFaltar = (ev: Event) => {
      const el = ev.target as HTMLElement;
      if (!el.closest('main')) return;
      ev.preventDefault(); // tira o balão do navegador: a lista abaixo mostra tudo de uma vez
      (el as HTMLInputElement).form?.classList.add('tentou-salvar');
      lote.push(el);
      clearTimeout(espera);
      espera = setTimeout(() => {
        const nomes = [...new Set(lote.map(nomeDoCampo))];
        const primeiro = lote[0];
        lote = [];
        setFaltam(nomes);
        primeiro.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => primeiro.focus({ preventScroll: true }), 350);
      }, 30);
    };
    document.addEventListener('invalid', aoFaltar, true);
    return () => { document.removeEventListener('invalid', aoFaltar, true); clearTimeout(espera); };
  }, []);

  useEffect(() => { if (!faltam) return; const t = setTimeout(() => setFaltam(null), 6000); return () => clearTimeout(t); }, [faltam]);

  if (!faltam) return null;
  return (
    <div role="alert" onClick={() => setFaltam(null)}
      className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-2xl border border-danger/30 bg-white p-4 shadow-xl md:bottom-6">
      <p className="text-sm font-semibold text-danger">Falta preencher {faltam.length === 1 ? 'um campo' : `${faltam.length} campos`}:</p>
      <p className="mt-1 text-sm">{faltam.join(' · ')}</p>
      <p className="mt-1 text-xs text-text/60">A tela já foi até o primeiro. Os campos que faltam ficam com a borda vermelha.</p>
    </div>
  );
}
