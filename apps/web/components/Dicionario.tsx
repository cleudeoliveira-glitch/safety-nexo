'use client';

import { useMemo, useState } from 'react';
import { dicionario } from '@/lib/dicionario';
import { AJUDA_CAMPOS, AREAS } from '@/lib/ajudaCampos';

const SIGLAS = [...dicionario].sort((a, b) => a.sigla.localeCompare(b.sigla));
const semAcento = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Base de Conhecimento: as siglas e a explicação de todos os campos, num lugar só para estudar.
// É o mesmo texto do "?" ao lado de cada campo (lib/ajudaCampos.ts).
export function BaseConhecimento({ idBusca = 'busca-base' }: { idBusca?: string }) {
  const [busca, setBusca] = useState('');
  const t = semAcento(busca.trim());
  const siglas = useMemo(() => (t ? SIGLAS.filter((v) => semAcento(`${v.sigla} ${v.nome} ${v.explicacao}`).includes(t)) : SIGLAS), [t]);
  const campos = useMemo(() => {
    const lista = t
      ? AJUDA_CAMPOS.filter((c) => semAcento(`${c.campo} ${c.area} ${c.ajuda.oQueE} ${c.ajuda.ondeAcho ?? ''} ${c.ajuda.exemplo ?? ''} ${c.ajuda.baseLegal ?? ''}`).includes(t))
      : AJUDA_CAMPOS;
    return AREAS.map((area) => ({ area, itens: lista.filter((c) => c.area === area) })).filter((g) => g.itens.length > 0);
  }, [t]);

  return (
    <div>
      <label htmlFor={idBusca} className="sr-only">Procurar na Base de Conhecimento</label>
      <input
        id={idBusca}
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Procure um campo ou sigla: GHE, CA, CNAE, CAT..."
        className="w-full rounded-card border border-border bg-white px-3 py-2.5"
      />
      {siglas.length > 0 && (
        <details open={!!t} className="mt-4 rounded-card border border-border bg-white p-3">
          <summary className="cursor-pointer font-semibold text-primary">Siglas de SST ({siglas.length})</summary>
          <dl className="mt-3 space-y-3">
            {siglas.map((v) => (
              <div key={v.sigla}>
                <dt className="font-semibold text-primary">{v.sigla} <span className="font-normal text-text">· {v.nome}</span></dt>
                <dd className="mt-1 text-sm text-text/80">{v.explicacao}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      {campos.map((g) => (
        <details key={g.area} open={!!t} className="mt-3 rounded-card border border-border bg-white p-3">
          <summary className="cursor-pointer font-semibold text-primary">{g.area} ({g.itens.length})</summary>
          <dl className="mt-3 space-y-4">
            {g.itens.map((c) => (
              <div key={c.campo} className="text-sm">
                <dt className="font-semibold text-text">{c.campo}</dt>
                <dd className="mt-1 space-y-1 text-text/80">
                  <p><b>O que é:</b> {c.ajuda.oQueE}</p>
                  {c.ajuda.ondeAcho && <p><b>Onde acho:</b> {c.ajuda.ondeAcho}</p>}
                  {c.ajuda.exemplo && <p><b>Exemplo:</b> {c.ajuda.exemplo}</p>}
                  {c.ajuda.baseLegal && <p className="text-text/60"><b>Base legal:</b> {c.ajuda.baseLegal}</p>}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      ))}
      {siglas.length === 0 && campos.length === 0 && <p className="mt-4 text-sm text-text/60">Nada encontrado para “{busca}”.</p>}
    </div>
  );
}

export function Dicionario({ onFechar }: { onFechar: () => void }) {
  return (
    <Painel titulo="Base de Conhecimento" onFechar={onFechar}>
      <p className="mb-3 text-sm text-text/70">A explicação de cada campo do sistema: o que é, onde achar, exemplo e base legal. É o mesmo texto do <b>?</b> ao lado de cada campo.</p>
      <BaseConhecimento idBusca="busca-dicionario" />
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
