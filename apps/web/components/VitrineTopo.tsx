'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

// Topo da página inicial em tela inteira. O banner principal (verde) é o foco: é nele que a página abre e é para ele que sempre volta.
// Na primeira visita, as telas do sistema passam uma vez sozinhas e o topo volta ao banner principal e para ali.
// Depois disso, só passa quando o visitante clica nas setinhas ou nos pontinhos (ou arrasta no celular).
// Prints reais, tirados do sistema com uma empresa de exemplo (Padaria Pão Dourado). Versão computador e versão celular em public/vitrine/.
const TELAS = [
  { nome: 'painel', titulo: 'Painel do dia', texto: 'Abriu o sistema, já sabe o que fazer hoje em cada empresa.' },
  { nome: 'ghe', titulo: 'GHE e riscos', texto: 'Cadastra uma vez e vai sozinho para PGR, PCMSO, LTCAT e OS.' },
  { nome: 'documentos', titulo: 'Documentos', texto: 'Todos os programas e laudos num lugar só, com os dados da empresa.' },
  { nome: 'slides', titulo: 'Treinamentos', texto: 'Slides prontos das NRs para apresentar na hora.' },
];

const TOTAL = TELAS.length + 1; // banner principal + telas
const TEMPO_BANNER = 4000; // na primeira visita, quanto tempo o banner fica antes de começar a passar
const TEMPO_TELA = 4500; // quanto tempo cada tela fica na primeira visita
const VOLTA_SOZINHO = 20000; // parado numa tela, volta ao banner principal depois disso
const CHAVE_VISTA = 'safety-nexo:vitrine-vista';

export function VitrineTopo() {
  const [atual, setAtual] = useState(0);
  const [passeio, setPasseio] = useState(false); // passando sozinho (só na primeira visita)
  const [mexeu, setMexeu] = useState(0); // muda a cada clique, para recomeçar a contagem da volta ao banner
  const toque = useRef<number | null>(null);

  // Primeira visita: passa as telas uma vez. Quem pediu menos movimento no aparelho não tem passeio.
  useEffect(() => {
    let vista = true;
    try {
      vista = localStorage.getItem(CHAVE_VISTA) === '1';
      localStorage.setItem(CHAVE_VISTA, '1');
    } catch {
      vista = false;
    }
    const menosMovimento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!vista && !menosMovimento) setPasseio(true);
  }, []);

  // Passeio automático: banner → telas → volta ao banner e para.
  useEffect(() => {
    if (!passeio) return;
    const t = window.setTimeout(
      () => {
        if (atual === TOTAL - 1) {
          setAtual(0);
          setPasseio(false);
        } else setAtual(atual + 1);
      },
      atual === 0 ? TEMPO_BANNER : TEMPO_TELA,
    );
    return () => window.clearTimeout(t);
  }, [passeio, atual]);

  // Regra: fora do passeio, se ficar parado numa tela, volta sozinho ao banner principal.
  useEffect(() => {
    if (passeio || atual === 0) return;
    const t = window.setTimeout(() => setAtual(0), VOLTA_SOZINHO);
    return () => window.clearTimeout(t);
  }, [passeio, atual, mexeu]);

  const ir = useCallback((i: number) => {
    setPasseio(false);
    setMexeu((m) => m + 1);
    setAtual(((i % TOTAL) + TOTAL) % TOTAL);
  }, []);

  return (
    <section
      className="relative h-[calc(100svh-65px)] min-h-[560px] w-full overflow-hidden bg-primary-escuro"
      aria-roledescription="carrossel"
      aria-label="Apresentação do Safety Nexo"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') ir(atual + 1);
        if (e.key === 'ArrowLeft') ir(atual - 1);
      }}
      onTouchStart={(e) => (toque.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (toque.current === null) return;
        const dx = e.changedTouches[0].clientX - toque.current;
        toque.current = null;
        if (Math.abs(dx) > 50) ir(atual + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="flex h-full transition-transform duration-700 ease-out" style={{ transform: `translateX(-${atual * 100}%)` }}>
        {/* Banner principal: o foco da página. */}
        <div className="fundo-destaque relative flex h-full w-full shrink-0 items-center" aria-hidden={atual !== 0}>
          <div className="mx-auto w-full max-w-6xl px-6 sm:px-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-menta">Gestão inteligente de SST</p>
            <h1 className="mt-4 max-w-4xl text-[2.4rem] font-bold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Toda a SST dos seus clientes num lugar só.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85 sm:text-2xl">
              Cadastre uma vez e PGR, PCMSO, LTCAT e OS saem atualizados juntos. Funciona no campo sem internet.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/cadastro?plano=FREE"
                tabIndex={atual === 0 ? 0 : -1}
                className="flex min-h-[3.5rem] items-center justify-center whitespace-nowrap rounded-xl bg-menta px-8 py-4 text-lg font-bold text-primary-escuro shadow-lg shadow-black/20 transition hover:brightness-95"
              >
                Começar grátis
              </Link>
              <button
                type="button"
                tabIndex={atual === 0 ? 0 : -1}
                onClick={() => ir(1)}
                className="flex min-h-[3.5rem] items-center justify-center whitespace-nowrap rounded-xl border-2 border-white/60 px-8 py-3.5 text-lg font-semibold text-white transition hover:bg-white hover:text-primary-escuro"
              >
                Ver o que ele faz
              </button>
            </div>
            <p className="mt-3 text-sm text-white/75">14 dias com tudo liberado, sem falar com ninguém.</p>
          </div>
        </div>

        {/* Telas do sistema, cada uma na tela inteira (formato computador ou celular). */}
        {TELAS.map((t, k) => (
          <div key={t.nome} className="relative h-full w-full shrink-0 bg-white" aria-hidden={atual !== k + 1}>
            <picture>
              <source media="(max-width: 767px)" srcSet={`/vitrine/tela-${t.nome}-celular.webp`} />
              <img
                src={`/vitrine/tela-${t.nome}.webp`}
                alt={`${t.titulo}: ${t.texto}`}
                loading={k === 0 ? 'eager' : 'lazy'}
                className="h-full w-full object-cover object-top"
              />
            </picture>
            <div className="absolute inset-x-0 bottom-0 bg-primary-escuro/95 px-6 pb-20 pt-5 sm:bg-transparent sm:bg-gradient-to-t sm:from-primary-escuro sm:via-primary-escuro/80 sm:to-transparent sm:px-10 sm:pb-16 sm:pt-20">
              <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-menta">{t.titulo}</p>
                  <p className="mt-1 max-w-xl text-base font-semibold text-white sm:text-2xl">{t.texto}</p>
                </div>
                <Link
                  href="/cadastro?plano=FREE"
                  tabIndex={atual === k + 1 ? 0 : -1}
                  className="hidden min-h-[3rem] shrink-0 items-center justify-center self-start rounded-xl sm:inline-flex bg-menta px-6 py-3 font-bold text-primary-escuro hover:brightness-95 sm:self-auto"
                >
                  Começar grátis
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Setinhas discretas: quase transparentes, mas dá para ver e clicar.
          No computador ficam nas laterais; no celular ficam embaixo, dos dois lados dos pontinhos, para não cobrir o texto. */}
      <BotaoSeta lado="esquerda" onClick={() => ir(atual - 1)} className="absolute left-4 top-1/2 hidden -translate-y-1/2 sm:flex" />
      <BotaoSeta lado="direita" onClick={() => ir(atual + 1)} className="absolute right-4 top-1/2 hidden -translate-y-1/2 sm:flex" />

      <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-3 sm:bottom-6">
        <BotaoSeta lado="esquerda" onClick={() => ir(atual - 1)} className="flex sm:hidden" />
        <div className="flex gap-2">
          {Array.from({ length: TOTAL }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => ir(i)}
              aria-label={i === 0 ? 'Voltar ao início' : `Ver ${TELAS[i - 1].titulo}`}
              aria-current={i === atual}
              className={`h-2.5 rounded-full transition-all ${i === atual ? 'w-8 bg-menta' : 'w-2.5 bg-white/45 hover:bg-white/80'}`}
            />
          ))}
        </div>
        <BotaoSeta lado="direita" onClick={() => ir(atual + 1)} className="flex sm:hidden" />
      </div>
    </section>
  );
}

function BotaoSeta({ lado, onClick, className }: { lado: 'esquerda' | 'direita'; onClick: () => void; className: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={lado === 'esquerda' ? 'Tela anterior' : 'Próxima tela'}
      className={`h-10 w-10 items-center justify-center rounded-full bg-black/15 text-white/70 ring-1 ring-white/25 backdrop-blur-sm transition hover:bg-black/40 hover:text-white sm:h-12 sm:w-12 ${className}`}
    >
      <Seta lado={lado} />
    </button>
  );
}

function Seta({ lado }: { lado: 'esquerda' | 'direita' }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {lado === 'esquerda' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  );
}
