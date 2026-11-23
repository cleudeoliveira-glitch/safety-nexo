'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

// Formulário comprido em etapas: uma parte de cada vez, com "Etapa 2 de 4" no topo.
// Todos os campos continuam no formulário (só ficam escondidos), então o salvar, o rascunho
// automático e o aviso "Falta preencher" funcionam como antes.
// Ao tocar em "Continuar", confere só os campos obrigatórios da etapa atual.
// Se ao salvar faltar campo numa etapa anterior, a tela volta sozinha para ela.
export type Passo = { titulo: string; conteudo: ReactNode };

export function PassosDoForm({ passos, salvar }: { passos: Passo[]; salvar: ReactNode }) {
  const [atual, setAtual] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);
  const partes = useRef<(HTMLDivElement | null)[]>([]);
  const total = passos.length;

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const aoFaltar = (ev: Event) => {
      const i = partes.current.findIndex((p) => p?.contains(ev.target as Node));
      if (i >= 0) setAtual((a) => Math.min(a, i));
    };
    el.addEventListener('invalid', aoFaltar, true);
    return () => el.removeEventListener('invalid', aoFaltar, true);
  }, []);

  const ir = (i: number) => {
    setAtual(i);
    setTimeout(() => caixa.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  };
  const continuar = () => {
    const campos = partes.current[atual]?.querySelectorAll<HTMLInputElement>('input, select, textarea') ?? [];
    let ok = true;
    campos.forEach((c) => { if (!c.checkValidity()) ok = false; }); // o aviso "Falta preencher" aparece sozinho
    if (ok) ir(atual + 1);
  };

  return (
    <div ref={caixa} className="scroll-mt-24 md:col-span-3">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-text/60">Etapa {atual + 1} de {total}</p>
        <p className="text-lg font-bold text-primary">{passos[atual].titulo}</p>
        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          {passos.map((p, i) => (
            <button key={p.titulo} type="button" tabIndex={-1} onClick={() => i < atual && ir(i)}
              className={`h-2 flex-1 rounded-full ${i <= atual ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </div>
      </div>
      {passos.map((p, i) => (
        <div key={p.titulo} ref={(el) => { partes.current[i] = el; }} className={i === atual ? 'grid gap-4 md:grid-cols-3' : 'hidden'}>
          {p.conteudo}
        </div>
      ))}
      <div className="mt-6 flex items-center justify-between gap-3">
        {atual > 0 ? (
          <button type="button" onClick={() => ir(atual - 1)} className="min-h-[48px] px-2 text-sm font-semibold text-primary">← Voltar</button>
        ) : <span />}
        {atual < total - 1 ? (
          <button type="button" onClick={continuar} className="min-h-[52px] rounded-card bg-primary px-6 font-semibold text-white">Continuar →</button>
        ) : salvar}
      </div>
    </div>
  );
}
