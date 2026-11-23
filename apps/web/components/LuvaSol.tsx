'use client';

import { useEffect, useState } from 'react';

// Botão "Luva e sol": deixa tudo maior e com mais contraste para usar em campo, de luva ou no sol forte.
// Fica guardado neste aparelho; não muda nada para as outras pessoas.
const CHAVE = 'safety-nexo:luva-sol';

export function aplicarLuvaSol() {
  try { document.documentElement.classList.toggle('luva-sol', localStorage.getItem(CHAVE) === '1'); } catch { /* sem memória no aparelho */ }
}

export function BotaoLuvaSol({ claro = false }: { claro?: boolean }) {
  const [ligado, setLigado] = useState(false);
  useEffect(() => { aplicarLuvaSol(); setLigado(document.documentElement.classList.contains('luva-sol')); }, []);
  const trocar = () => {
    const novo = !ligado;
    setLigado(novo);
    document.documentElement.classList.toggle('luva-sol', novo);
    try { localStorage.setItem(CHAVE, novo ? '1' : '0'); } catch { /* segue só nesta tela */ }
  };
  return (
    <button type="button" onClick={trocar} aria-pressed={ligado}
      title="Letras e botões maiores, com mais contraste, para usar de luva ou no sol"
      className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-semibold ${claro
        ? (ligado ? 'bg-menta text-primary-escuro' : 'bg-white/10 text-white hover:bg-white/20')
        : (ligado ? 'bg-primary text-white' : 'border border-primary text-primary')}`}>
      <span aria-hidden="true">🧤☀️</span>{ligado ? 'Luva e sol: ligado' : 'Luva e sol'}
    </button>
  );
}
