'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { temRascunhoAqui } from '@/components/RascunhoAutomatico';

// Lista primeiro, formulário quando pedir: a tela abre mostrando o que já foi feito e um botão grande "+ Novo".
// O formulário abre sozinho quando ainda não há nada na lista ou quando há rascunho guardado.
export function useNovo(listaVazia: boolean) {
  const [aberto, setAberto] = useState(false);
  // Enquanto a pessoa não tocar em abrir ou fechar, o formulário segue a lista: aberto se vazia, fechado se tem algo.
  // (A lista pode chegar um instante depois da tela; e, depois do primeiro registro salvo, o formulário recolhe sozinho.)
  const [escolheu, setEscolheu] = useState(false);
  const rascunho = useRef<boolean | null>(null);
  useEffect(() => {
    if (rascunho.current === null) rascunho.current = temRascunhoAqui();
    if (rascunho.current) { setAberto(true); setEscolheu(true); return; }
    if (!escolheu) setAberto(listaVazia);
  }, [listaVazia, escolheu]);
  const abrir = () => { setEscolheu(true); setAberto(true); };
  return {
    aberto,
    abrir,
    fechar: () => { setEscolheu(true); setAberto(false); },
    // Abre e espera o formulário aparecer antes de mexer nos campos (ex.: "Repetir").
    abrirE: (depois: () => void) => { abrir(); setTimeout(depois, 60); },
  };
}

export function NovoRegistro({ rotulo, aberto, abrir, fechar, children, outros }: {
  rotulo: string; aberto: boolean; abrir: () => void; fechar: () => void; children: ReactNode;
  outros?: ReactNode; // botões ao lado, como "Repetir o último"
}) {
  if (!aberto) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={abrir}
          className="flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-base font-semibold text-white shadow-sm active:scale-[0.99]">
          <span className="text-2xl leading-none">+</span> {rotulo}
        </button>
        {outros}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button type="button" onClick={fechar} className="min-h-[44px] px-2 text-sm font-semibold text-text/60 hover:text-primary">Fechar formulário ✕</button>
      </div>
      {children}
    </div>
  );
}

// Botão secundário do mesmo tamanho, para ficar ao lado do "+ Novo".
export function BotaoAoLado({ children, onClick, title }: { children: ReactNode; onClick: () => void; title?: string }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-2 border-primary/30 bg-white px-5 text-base font-semibold text-primary active:scale-[0.99] sm:flex-none">
      {children}
    </button>
  );
}
