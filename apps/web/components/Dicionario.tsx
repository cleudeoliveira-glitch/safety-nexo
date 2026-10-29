'use client';

import { useMemo, useState } from 'react';
import { dicionario } from '@/lib/dicionario';

export function Dicionario({ onFechar }: { onFechar: () => void }) {
  const [busca, setBusca] = useState('');
  const resultados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return dicionario;
    return dicionario.filter((v) => `${v.sigla} ${v.nome} ${v.explicacao}`.toLowerCase().includes(termo));
  }, [busca]);

  return (
    <Painel titulo="Dicionário SST" onFechar={onFechar}>
      <label htmlFor="busca-dicionario" className="sr-only">Buscar no dicionário</label>
      <input
        id="busca-dicionario"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Busque uma sigla, como GHE"
        className="w-full rounded-card border border-border bg-background px-3 py-2"
      />
      <dl className="mt-4 space-y-4">
        {resultados.map((v) => (
          <div key={v.sigla}>
            <dt className="font-semibold text-primary">
              {v.sigla} <span className="font-normal text-text">· {v.nome}</span>
            </dt>
            <dd className="mt-1 text-sm text-text/80">{v.explicacao}</dd>
          </div>
        ))}
        {resultados.length === 0 && <p className="text-sm text-text/60">Nenhum termo encontrado para “{busca}”.</p>}
      </dl>
    </Painel>
  );
}

export function Painel({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onFechar}>
      <section
        role="dialog"
        aria-label={titulo}
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">{titulo}</h2>
          <button type="button" onClick={onFechar} className="rounded-card border border-border px-3 py-1 text-sm">
            Fechar
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
