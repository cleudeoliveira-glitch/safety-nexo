'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconeSlide, SeloTema, Trabalhador } from '@/components/SlideArte';
import type { IconeSlide as NomeIconeSlide } from '@/components/SlideArte';
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
            <button onClick={() => ir(-1)} disabled={n === 0} className="rounded-card border border-border bg-white px-4 py-3 text-sm font-semibold disabled:opacity-40 sm:px-5">← Voltar</button>
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
              {s.errado && <p className="mt-2 text-xs font-bold uppercase tracking-wider text-success">Faça assim</p>}
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{s.pontos.map((p) => <li key={p}>{p}</li>)}</ul>
              {s.errado && (<>
                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-danger">Nunca faça</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{s.errado.map((p) => <li key={p}>{p}</li>)}</ul>
              </>)}
              {s.exemplo && <p className="mt-3 text-sm"><strong>No dia a dia:</strong> {s.exemplo}</p>}
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

// Mesmas cores dos documentos em PDF (apps/api/src/documentos/layout.ts: COR e DEGRADE),
// para slide e documento terem a mesma cara de Safety Nexo.
const COR_DOC = { petroleo: '#0E4A5B', agua: '#13808A', menta: '#34D399' };
const DEGRADE_DOC = `linear-gradient(90deg, ${COR_DOC.petroleo} 0%, ${COR_DOC.agua} 55%, ${COR_DOC.menta} 100%)`;
const FUNDO_CAPA = `radial-gradient(70% 120% at 100% 0%, rgba(52, 211, 153, 0.30), transparent 60%), linear-gradient(120deg, ${COR_DOC.petroleo} 0%, ${COR_DOC.petroleo} 25%, ${COR_DOC.agua} 100%)`;

function SlideTela({ m, n }: { m: Material; n: number }) {
  const s = m.slides[n];
  const total = m.slides.length;
  const tema: NomeIconeSlide = m.icone ?? 'escudo';
  const capa = n === 0;
  const fim = n === total - 1 && /^resumo/i.test(s.titulo);
  // No celular e no tablet o slide cresce com o texto (nada fica cortado). No computador, formato de TV,
  // mas sem overflow escondido: se o texto passar, o slide cresce em vez de cortar.
  const base = 'relative flex w-full flex-col rounded-2xl p-5 sm:p-8 xl:aspect-video xl:p-10';

  if (capa) return (
    <section className={`${base} min-h-[60vh] text-white sm:min-h-[420px]`} style={{ background: FUNDO_CAPA }}>
      <Enfeite claro />
      <div className="relative flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/80">
        <span className="rounded-full bg-white/15 px-3 py-1">{m.tipo === 'palestra' ? 'Palestra' : 'Treinamento'}</span>
        <span className="rounded-full bg-menta px-3 py-1 text-primary-escuro">{m.norma}</span>
      </div>
      <div className="relative flex flex-1 flex-col-reverse items-center gap-6 py-6 sm:flex-row sm:gap-10">
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-3xl font-extrabold leading-tight sm:text-4xl xl:text-5xl">{m.nome}</h2>
          <ul className="mt-5 space-y-2 text-base text-white/90 sm:text-lg xl:text-xl">
            {s.pontos.map((p) => (
              <li key={p} className="flex gap-3"><IconeSlide nome="check" className="mt-0.5 h-6 w-6 shrink-0 text-menta" /><span className="min-w-0 break-words">{p}</span></li>
            ))}
          </ul>
        </div>
        <div className="relative w-40 shrink-0 sm:w-56 xl:w-72">
          <Trabalhador className="w-full" />
          <div className="absolute -right-3 -top-3 w-16 sm:w-20 xl:w-24"><SeloTema nome={tema} claro className="w-full" /></div>
        </div>
      </div>
      <Rodape m={m} n={n} claro />
    </section>
  );

  if (fim) return (
    <section className={`${base} min-h-[60vh] border border-border bg-white sm:min-h-[420px]`}>
      <Enfeite />
      <Topo m={m} n={n} s={s} icone="check" />
      <div className="relative flex flex-1 flex-col items-center gap-6 py-5 sm:flex-row">
        <ul className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
          {s.pontos.map((p) => (
            <li key={p} className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/5 p-3 text-base sm:text-lg xl:text-xl">
              <IconeSlide nome="check" className="mt-0.5 h-6 w-6 shrink-0 text-success" /><span className="min-w-0 break-words font-medium">{p}</span>
            </li>
          ))}
        </ul>
        <div className="w-36 shrink-0 text-center sm:w-44 xl:w-56">
          <Trabalhador joia className="w-full" />
          <p className="mt-2 text-sm font-bold text-primary sm:text-base">Ficou alguma dúvida? Pergunte agora.</p>
        </div>
      </div>
      <Rodape m={m} n={n} />
    </section>
  );

  const icone: NomeIconeSlide = s.icone ?? tema;
  return (
    <section className={`${base} min-h-[60vh] border border-border bg-white sm:min-h-[420px]`}>
      <Enfeite />
      <Topo m={m} n={n} s={s} icone={icone} />
      <div className={`relative grid flex-1 content-center gap-4 py-5 ${s.exemplo ? 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-6' : ''}`}>
        <div className="min-w-0">
          {s.errado ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Coluna titulo="Faça assim" itens={s.pontos} certo />
              <Coluna titulo="Nunca faça" itens={s.errado} />
            </div>
          ) : s.passos ? (
            <ol className="space-y-2.5">
              {s.pontos.map((p, i) => (
                <li key={p} className="flex items-center gap-3 text-base sm:text-lg xl:text-xl">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-menta sm:h-9 sm:w-9">{i + 1}</span>
                  <span className="min-w-0 break-words">{p.replace(/^\d+\.\s*/, '')}</span>
                </li>
              ))}
            </ol>
          ) : (
            <ul className={`grid gap-2.5 ${s.pontos.length > 3 && !s.exemplo ? 'sm:grid-cols-2' : ''}`}>
              {s.pontos.map((p) => (
                <li key={p} className="flex items-start gap-3 rounded-xl bg-background p-3 text-base sm:text-lg xl:text-xl">
                  <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full border-[3px] border-success" aria-hidden /><span className="min-w-0 break-words">{p}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {s.exemplo && (
          <aside className="relative flex flex-col justify-center overflow-hidden rounded-2xl bg-primary p-5 text-white">
            <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-menta/20" aria-hidden />
            <p className="relative flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-menta"><IconeSlide nome="lampada" className="h-5 w-5" />No dia a dia</p>
            <p className="relative mt-2 break-words text-base leading-relaxed sm:text-lg">{s.exemplo}</p>
          </aside>
        )}
      </div>
      <Rodape m={m} n={n} />
    </section>
  );
}

function Topo({ m, n, s, icone }: { m: Material; n: number; s: Material['slides'][number]; icone: NomeIconeSlide }) {
  return (
    <div className="relative flex items-center gap-3 sm:gap-4 sm:pr-28 xl:pr-36">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-extrabold text-menta shadow-md sm:h-14 sm:w-14 sm:text-xl xl:h-16 xl:w-16 xl:text-2xl">
        {String(n + 1).padStart(2, '0')}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: COR_DOC.agua }}>{m.norma} · {m.nome}</p>
        <h2 className="break-words text-xl font-bold leading-tight text-primary sm:text-3xl xl:text-4xl">{s.titulo}</h2>
        <span className="mt-2 block h-1 w-16 rounded-full sm:w-20" style={{ background: DEGRADE_DOC }} aria-hidden />
      </div>
      {icone !== 'check' && <div className="absolute -right-2 -top-2 hidden w-24 sm:block xl:w-32"><SeloTema nome={icone} className="w-full" /></div>}
    </div>
  );
}

function Coluna({ titulo, itens, certo = false }: { titulo: string; itens: string[]; certo?: boolean }) {
  return (
    <div className={`rounded-2xl border-2 p-4 ${certo ? 'border-success/40 bg-success/5' : 'border-danger/30 bg-danger/5'}`}>
      <p className={`flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider ${certo ? 'text-success' : 'text-danger'}`}>
        <IconeSlide nome={certo ? 'check' : 'proibido'} className="h-6 w-6" />{titulo}
      </p>
      <ul className="mt-3 space-y-2 text-base sm:text-lg">
        {itens.map((t) => (
          <li key={t} className="flex gap-2"><span className={`font-bold ${certo ? 'text-success' : 'text-danger'}`} aria-hidden>{certo ? '✓' : '✕'}</span><span className="min-w-0 break-words">{t}</span></li>
        ))}
      </ul>
    </div>
  );
}

function Rodape({ m, n, claro = false }: { m: Material; n: number; claro?: boolean }) {
  const total = m.slides.length;
  return (
    <div className="relative flex items-center gap-3 pt-2">
      <span className={`text-xs font-bold ${claro ? 'text-white/80' : 'text-primary'}`}>Safety Nexo</span>
      <div className={`h-1.5 flex-1 overflow-hidden rounded-full ${claro ? 'bg-white/20' : 'bg-border'}`}>
        <div className="h-full rounded-full" style={{ width: `${((n + 1) / total) * 100}%`, background: DEGRADE_DOC }} />
      </div>
      <span className={`text-xs ${claro ? 'text-white/70' : 'text-text/50'}`}>{n + 1}/{total}</span>
    </div>
  );
}

// Formas de fundo (círculos menta e pêssego). Ficam numa camada recortada para não empurrar nem cortar o texto.
function Enfeite({ claro = false }: { claro?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
      <span className={`absolute -right-16 -top-16 h-48 w-48 rounded-full ${claro ? 'bg-white/5' : 'bg-success/5'}`} />
      <span className={`absolute -bottom-20 -left-10 h-40 w-40 rounded-full ${claro ? 'bg-menta/10' : 'bg-warning/5'}`} />
      {!claro && <span className="absolute left-0 right-0 top-0 h-1.5" style={{ background: DEGRADE_DOC }} />}
    </div>
  );
}

function Lista() {
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div>
        <Link href="/" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-primary">← Voltar</Link>
        <h1 className="mt-2 text-2xl font-semibold text-primary">Slides para aplicar</h1>
        <p className="text-sm text-text/60">Slides para apresentar no celular ou na TV, roteiro do instrutor e prova com gabarito. Depois de abrir esta tela uma vez com internet, ela funciona sem sinal no campo.</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MATERIAIS.map((m) => (
          <li key={m.codigo}>
            <a href={`/material#${m.codigo}`} className="flex h-full flex-col rounded-card border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40">
              <span className="flex items-center gap-2 text-sm font-bold text-success"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-menta"><IconeSlide nome={m.icone ?? 'escudo'} className="h-5 w-5" /></span>{m.norma}{m.tipo === 'palestra' && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Palestra</span>}</span>
              <span className="mt-1 text-lg font-semibold text-primary">{m.nome}</span>
              <span className="mt-2 flex-1 text-sm text-text/60">{m.slides.length} slides · prova com {m.prova.length} questões</span>
              <span className="mt-3 text-sm font-semibold text-primary">Abrir →</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="text-xs text-text/50">Curso: a NR pede capacitação. Palestra: a NR pede que o trabalhador seja informado, sem carga fixa. Mais NRs entram aos poucos. Todo material é uma base: revise e adapte à empresa antes de aplicar.</p>
    </main>
  );
}
