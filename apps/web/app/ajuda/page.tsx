'use client';

import { useEffect, useMemo, useState } from 'react';
import { GuiaCompleto } from '@/components/AjudaDaTela';
import { GUIAS } from '@/lib/ajudaTelas';
import { BaseConhecimento } from '@/components/Dicionario';

// Central de ajuda: o passo a passo de todas as telas num lugar só.
const semAcento = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Uma Central de ajuda com duas abas: como usar cada tela, e o que é cada campo (o texto do "?").
type AbaAjuda = 'telas' | 'campos';

export default function CentralDeAjuda() {
  const [aba, setAba] = useState<AbaAjuda>('telas');
  const [busca, setBusca] = useState('');
  const guias = useMemo(() => {
    const t = semAcento(busca.trim());
    if (!t) return GUIAS;
    return GUIAS.filter((g) => semAcento(`${g.titulo} ${g.paraQue} ${g.partes.map((p) => `${p.titulo} ${p.passos.join(' ')}`).join(' ')}`).includes(t));
  }, [busca]);

  // Link com #campos abre direto a aba dos campos.
  useEffect(() => {
    if (window.location.hash === '#campos') setAba('campos');
  }, []);

  return (
    <main className="mx-auto max-w-4xl p-4 md:p-8">
      <section className="fundo-destaque rounded-3xl p-6 text-white shadow-lg shadow-primary/20 md:p-8">
        <h1 className="text-2xl font-bold md:text-3xl">Central de ajuda</h1>
        <p className="mt-2 max-w-2xl text-white/85">
          Tudo num lugar só: o passo a passo de cada tela e o que é cada campo. Dentro das telas, o <b>Como usar esta tela?</b> fica no alto, e o <b>?</b> fica ao lado de cada campo.
        </p>
      </section>
      <div role="tablist" className="mt-6 grid grid-cols-2 gap-2">
        {([['telas', 'Como usar cada tela'], ['campos', 'O que é cada campo']] as [AbaAjuda, string][]).map(([v, n]) => (
          <button key={v} type="button" role="tab" aria-selected={aba === v} onClick={() => setAba(v)}
            className={`rounded-card px-4 py-3 text-sm font-semibold md:text-base ${aba === v ? 'bg-primary text-white' : 'border border-border bg-white text-primary hover:border-primary'}`}>
            {n}
          </button>
        ))}
      </div>

      {aba === 'telas' && (
        <>
          <label htmlFor="ajuda-busca" className="sr-only">Procurar na ajuda</label>
          <input
            id="ajuda-busca"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Procure uma tela: DDS, ASO, CIPA, EPI, CAT..."
            className="mt-4 w-full rounded-card border border-border bg-white px-4 py-3 text-base"
          />
          <div className="mt-4 space-y-3">
            {guias.map((g) => (
              <details key={g.id} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                <summary className="cursor-pointer text-lg font-semibold text-primary">{g.titulo}</summary>
                <div className="mt-3"><GuiaCompleto guia={g} /></div>
              </details>
            ))}
            {guias.length === 0 && <p className="text-text/60">Nada encontrado para “{busca}”.</p>}
          </div>
        </>
      )}

      {aba === 'campos' && (
        <section id="campos" className="mt-4">
          <p className="mb-3 text-sm text-text/70">O que é, onde achar, exemplo e base legal de cada campo, e as siglas de SST. É o mesmo texto do <b>?</b> ao lado do campo.</p>
          <BaseConhecimento />
        </section>
      )}
    </main>
  );
}
