'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icone } from '@/components/Icone';
import { MATERIAIS, Material } from '@/lib/materiais';
import { libera, planoMinimo, usePlano } from '@/lib/plano';

type Aba = 'slides' | 'roteiro' | 'prova';

// Material pronto dos treinamentos: slides para mostrar no celular ou na TV, roteiro do instrutor e prova com gabarito.
// Tudo fica no próprio site: depois de abrir uma vez com internet, abre sem sinal (o endereço muda só depois do #).
export default function PaginaMaterial() {
  const [codigo, setCodigo] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>('slides');
  const [n, setN] = useState(0);
  const [gabarito, setGabarito] = useState(false);
  const plano = usePlano();
  const liberado = libera(plano, 'slides');
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ler = () => { setCodigo(window.location.hash.slice(1) || null); setN(0); setAba('slides'); };
    ler();
    window.addEventListener('hashchange', ler);
    return () => window.removeEventListener('hashchange', ler);
  }, []);

  const m = MATERIAIS.find((x) => x.codigo === codigo);
  const total = m ? (liberado ? m.slides.length : 1) : 0;
  const ir = useCallback((d: number) => setN((x) => Math.max(0, Math.min(total - 1, x + d))), [total]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (aba !== 'slides') return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); ir(1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); ir(-1); }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aba, ir]);

  if (!m) return <Lista />;

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6 print:max-w-none print:p-0">
      <div className="print:hidden">
        <Link href="/material" className="text-sm text-primary">← Todos os materiais</Link>
        <h1 className="mt-2 text-2xl font-semibold text-primary">{m.norma} · {m.nome}</h1>
        <p className="text-sm text-text/60">{m.cargaHoraria} {m.publico}</p>
      </div>

      <div role="tablist" className="flex flex-wrap gap-2 print:hidden">
        {([['slides', 'Slides'], ['roteiro', 'Roteiro do instrutor'], ['prova', 'Prova']] as [Aba, string][]).map(([v, nome]) => (
          <button key={v} role="tab" aria-selected={aba === v} onClick={() => setAba(v)}
            className={`rounded-card px-4 py-2 text-sm font-semibold ${aba === v ? 'bg-primary text-white' : 'border border-border bg-white'}`}>{nome}</button>
        ))}
        {liberado && aba !== 'slides' && (
          <button onClick={() => window.print()} className="ml-auto rounded-card border border-border bg-white px-4 py-2 text-sm font-semibold">
            {aba === 'roteiro' ? 'Imprimir apostila' : 'Imprimir prova'}
          </button>
        )}
      </div>

      {!liberado && (
        <div className="card-pendente rounded-card p-4 text-sm print:hidden">
          <p className="font-semibold">No plano Grátis você vê só a capa.</p>
          <p className="mt-1">Os slides completos, o roteiro e a prova fazem parte do plano {planoMinimo('slides')} ou maior. <Link href="/plano?recurso=slides" className="font-semibold text-primary">Ver os planos</Link></p>
        </div>
      )}

      {aba === 'slides' && (
        <div ref={caixa} className="space-y-3 bg-white">
          <SlideTela m={m} n={n} />
          <div className="flex items-center justify-between gap-2 print:hidden">
            <button onClick={() => ir(-1)} disabled={n === 0} className="rounded-card border border-border bg-white px-5 py-3 text-sm font-semibold disabled:opacity-40">← Voltar</button>
            <span className="text-sm text-text/60">{n + 1} de {m.slides.length}</span>
            <div className="flex gap-2">
              <button onClick={() => caixa.current?.requestFullscreen?.().catch(() => undefined)} className="hidden rounded-card border border-border bg-white px-4 py-3 text-sm font-semibold sm:block">Tela cheia</button>
              <button onClick={() => ir(1)} disabled={n >= total - 1} className="rounded-card bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">Avançar →</button>
            </div>
          </div>
          {liberado && <p className="rounded-card bg-background p-3 text-sm print:hidden"><strong>O que falar:</strong> {m.slides[n].fala}</p>}
        </div>
      )}

      {aba === 'roteiro' && (liberado ? (
        <ol className="space-y-4">
          {m.slides.map((s, i) => (
            <li key={i} className="break-inside-avoid rounded-card border border-border bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-text/50">Slide {i + 1}</p>
              <h2 className="mt-1 text-lg font-semibold text-primary">{s.titulo}</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{s.pontos.map((p) => <li key={p}>{p}</li>)}</ul>
              <p className="mt-3 rounded-lg bg-background p-3 text-sm"><strong>O que falar:</strong> {s.fala}</p>
            </li>
          ))}
        </ol>
      ) : null)}

      {aba === 'prova' && (liberado ? (
        <div className="rounded-card border border-border bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-primary">Avaliação · {m.norma} {m.nome}</h2>
              <p className="mt-1 text-sm">Nome: ______________________________________ Data: ____/____/______</p>
            </div>
            <label className="flex items-center gap-2 text-sm print:hidden">
              <input type="checkbox" checked={gabarito} onChange={(e) => setGabarito(e.target.checked)} className="h-4 w-4" /> Mostrar o gabarito
            </label>
          </div>
          <ol className="space-y-4">
            {m.prova.map((q, i) => (
              <li key={i} className="break-inside-avoid">
                <p className="font-semibold">{i + 1}. {q.pergunta}</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {q.opcoes.map((o, j) => (
                    <li key={j} className={gabarito && j === q.certa ? 'font-semibold text-success' : ''}>( {gabarito && j === q.certa ? 'X' : ' '} ) {'abcd'[j]}) {o}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          {gabarito && <p className="mt-4 text-sm"><strong>Gabarito:</strong> {m.prova.map((q, i) => `${i + 1}-${'abcd'[q.certa]}`).join(' · ')}</p>}
        </div>
      ) : null)}

      <p className="text-xs text-text/50 print:hidden">Material-base para apoiar o treinamento. Revise e adapte à realidade da empresa antes de aplicar. Lista de presença e certificado ficam na turma, em Treinamentos.</p>
    </main>
  );
}

function SlideTela({ m, n }: { m: Material; n: number }) {
  const s = m.slides[n];
  const capa = n === 0;
  return (
    <section className={`relative flex aspect-video w-full flex-col justify-center overflow-hidden rounded-2xl p-6 sm:p-12 ${capa ? 'fundo-destaque text-white' : 'border border-border bg-white'}`}>
      <span className={`absolute left-6 top-5 text-xs font-bold uppercase tracking-widest sm:left-12 ${capa ? 'text-white/70' : 'text-success'}`}>{m.norma}</span>
      <span className="absolute right-6 top-5 h-2 w-16 rounded-full bg-success sm:right-12" aria-hidden />
      <h2 className={`font-bold leading-tight ${capa ? 'text-3xl sm:text-5xl' : 'text-2xl text-primary sm:text-4xl'}`}>{s.titulo}</h2>
      <ul className={`mt-4 space-y-2 sm:mt-8 sm:space-y-3 ${capa ? 'text-base text-white/90 sm:text-2xl' : 'text-base sm:text-2xl'}`}>
        {s.pontos.map((p) => (
          <li key={p} className="flex gap-3"><span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${capa ? 'bg-menta' : 'bg-success'}`} aria-hidden /><span>{p}</span></li>
        ))}
      </ul>
      <span className={`absolute bottom-4 right-6 text-xs sm:right-12 ${capa ? 'text-white/60' : 'text-text/40'}`}>{n + 1}/{m.slides.length}</span>
    </section>
  );
}

function Lista() {
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div>
        <Link href="/" className="text-sm text-primary">← Painel</Link>
        <h1 className="mt-2 text-2xl font-semibold text-primary">Material dos treinamentos</h1>
        <p className="text-sm text-text/60">Slides para apresentar no celular ou na TV, roteiro do instrutor e prova com gabarito. Depois de abrir esta tela uma vez com internet, ela funciona sem sinal no campo.</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MATERIAIS.map((m) => (
          <li key={m.codigo}>
            <a href={`/material#${m.codigo}`} className="flex h-full flex-col rounded-card border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40">
              <span className="flex items-center gap-2 text-sm font-bold text-success"><Icone nome="formatura" className="h-5 w-5" />{m.norma}</span>
              <span className="mt-1 text-lg font-semibold text-primary">{m.nome}</span>
              <span className="mt-2 flex-1 text-sm text-text/60">{m.slides.length} slides · prova com {m.prova.length} questões</span>
              <span className="mt-3 text-sm font-semibold text-primary">Abrir →</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="text-xs text-text/50">Mais NRs entram aos poucos. Todo material é uma base: revise e adapte à empresa antes de aplicar.</p>
    </main>
  );
}
