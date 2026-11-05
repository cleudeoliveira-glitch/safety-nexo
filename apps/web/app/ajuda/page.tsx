'use client';

import { useMemo, useState } from 'react';
import { GuiaCompleto } from '@/components/AjudaDaTela';
import { GUIAS } from '@/lib/ajudaTelas';

// Central de ajuda: o passo a passo de todas as telas num lugar só.
const semAcento = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function CentralDeAjuda() {
  const [busca, setBusca] = useState('');
  const guias = useMemo(() => {
    const t = semAcento(busca.trim());
    if (!t) return GUIAS;
    return GUIAS.filter((g) => semAcento(`${g.titulo} ${g.paraQue} ${g.partes.map((p) => `${p.titulo} ${p.passos.join(' ')}`).join(' ')}`).includes(t));
  }, [busca]);

  return (
    <main className="mx-auto max-w-4xl p-4 md:p-8">
      <section className="fundo-destaque rounded-3xl p-6 text-white shadow-lg shadow-primary/20 md:p-8">
        <h1 className="text-2xl font-bold md:text-3xl">Central de ajuda</h1>
        <p className="mt-2 max-w-2xl text-white/85">
          O passo a passo de cada tela do Safety Nexo. Em qualquer tela, o botão <b>Como usar esta tela?</b> no canto de baixo abre a explicação daquela tela.
        </p>
      </section>
      <label htmlFor="ajuda-busca" className="sr-only">Procurar na ajuda</label>
      <input
        id="ajuda-busca"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Procure: DDS, ASO, CIPA, EPI, CAT..."
        className="mt-6 w-full rounded-card border border-border bg-white px-4 py-3 text-base"
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
    </main>
  );
}
