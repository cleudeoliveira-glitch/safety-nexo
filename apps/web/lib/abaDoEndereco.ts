'use client';

import { useEffect } from 'react';

// O menu lateral abre uma aba pelo endereço (ex.: /operacao#dds).
// Lê o "#" ao abrir a tela e de novo quando o menu troca de aba na mesma tela.
export function useAbaDoEndereco<A extends string>(validas: readonly A[], escolher: (aba: A) => void, apelidos: Record<string, A> = {}) {
  useEffect(() => {
    const ler = () => {
      const h = window.location.hash.slice(1);
      const aba = (apelidos[h] ?? h) as A;
      if (validas.includes(aba)) escolher(aba);
    };
    ler();
    window.addEventListener('hashchange', ler);
    return () => window.removeEventListener('hashchange', ler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// Na tela de cadastro da empresa, o "#" leva até a parte certa depois que ela carrega.
export function rolarParaAncora() {
  const h = window.location.hash.slice(1);
  if (!h) return;
  document.getElementById(h)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
