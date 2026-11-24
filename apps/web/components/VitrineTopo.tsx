'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

// Topo da página inicial em tela inteira. O banner principal (verde) é o foco: é nele que a página abre e é para ele que sempre volta.
// Na primeira visita, as telas do sistema passam uma vez sozinhas e o topo volta ao banner principal e para ali.
// Depois disso, só passa quando o visitante clica nas setinhas ou nos pontinhos (ou arrasta no celular).
// Prints reais, tirados do sistema com uma empresa de exemplo (Padaria Pão Dourado). Versão computador (tela-*.webp) e versão
// celular sem a barra do sistema (topo-*-celular.webp) em public/vitrine/.
// Regra da vitrine: o texto fica AO LADO do print (computador) ou EMBAIXO dele (celular), nunca por cima. Uma ideia por tela, sem repetir frase.
const TELAS = [
  { nome: 'painel', titulo: 'Painel do dia', frase: 'Seu dia começa organizado', texto: 'Ao abrir o sistema você vê o que venceu, o que está perto de vencer e o que falta em cada empresa.' },
  { nome: 'ghe', titulo: 'GHE e riscos', frase: 'Setor e função cadastrados uma vez', texto: 'Os riscos de cada grupo vão para o PGR, o PCMSO, o LTCAT e a ordem de serviço sem digitar de novo.' },
  { nome: 'documentos', titulo: 'Documentos', frase: '36 modelos já com os dados da empresa', texto: 'Escolha o documento e ele abre com riscos, GHEs, EPIs e colaboradores preenchidos.' },
  { nome: 'slides', titulo: 'Treinamentos', frase: 'Treinamento pronto para apresentar', texto: 'Slides das NRs, roteiro do instrutor e prova, direto do sistema.' },
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

  const noBanner = atual === 0;

  return (
    <section
      className="relative h-[calc(100svh-65px)] min-h-[600px] w-full overflow-hidden bg-[#EEF5F5]"
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
        <div className="fundo-destaque relative flex h-full w-full shrink-0 items-center overflow-hidden" aria-hidden={atual !== 0}>
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(70%_70%_at_70%_40%,black,transparent)]" />
          <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 sm:px-10">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-menta backdrop-blur sm:text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-menta" aria-hidden />
              Gestão inteligente de SST
            </p>
            <h1 className="fonte-titulo mt-6 max-w-4xl text-[2.35rem] font-extrabold leading-[1.06] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Toda a SST dos seus clientes num{"\u00a0"}lugar{"\u00a0"}só.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85 sm:text-xl">
              Menos digitação, documentos sempre atualizados e cada vencimento sob controle, inclusive no campo.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
                className="flex min-h-[3.5rem] items-center justify-center whitespace-nowrap rounded-xl border border-white/40 bg-white/5 px-8 py-3.5 text-lg font-semibold text-white transition hover:bg-white hover:text-primary-escuro"
              >
                Ver o que ele faz
              </button>
            </div>
            <p className="mt-4 text-sm text-white/75">14 dias com tudo liberado, sem falar com ninguém.</p>
          </div>
        </div>

        {/* Telas do sistema: texto de um lado, print inteiro do outro (no celular, texto em cima e print embaixo). */}
        {TELAS.map((t, k) => (
          <div key={t.nome} className="relative h-full w-full shrink-0" aria-hidden={atual !== k + 1}>
            <div className="mx-auto grid h-full w-full max-w-7xl grid-rows-[auto_minmax(0,1fr)] gap-4 px-4 pb-16 pt-5 sm:px-8 sm:pt-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:grid-rows-1 lg:items-center lg:gap-12 lg:pb-20 lg:pt-10">
              <div className="lg:pb-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 sm:text-sm">
                  {String(k + 1).padStart(2, '0')} · {t.titulo}
                </p>
                <h2 className="fonte-titulo mt-1.5 text-[1.4rem] font-bold leading-tight tracking-tight text-primary-escuro sm:mt-3 sm:text-3xl lg:text-4xl">{t.frase}</h2>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-text/70 sm:mt-4 sm:text-lg">{t.texto}</p>
                <Link
                  href="/cadastro?plano=FREE"
                  tabIndex={atual === k + 1 ? 0 : -1}
                  className="mt-7 hidden min-h-[3rem] items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-escuro lg:inline-flex"
                >
                  Começar grátis
                </Link>
              </div>
              <div className="flex min-h-0 items-center justify-center">
                {/* Computador: janela de navegador com o print inteiro. */}
                <div className="hidden w-full max-h-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_30px_60px_-20px_rgba(8,47,58,0.35)] md:block">
                  <div className="flex items-center gap-1.5 border-b border-border bg-[#F4F6F8] px-3 py-2" aria-hidden>
                    <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" />
                    <span className="ml-3 rounded-md bg-white px-3 py-0.5 text-[11px] text-text/45">safetynexo.com.br</span>
                  </div>
                  <img
                    src={`/vitrine/tela-${t.nome}.webp`}
                    alt={`${t.titulo}: ${t.texto}`}
                    loading={k === 0 ? 'eager' : 'lazy'}
                    className="block aspect-[16/10] max-h-[calc(100svh-230px)] w-full object-contain object-top"
                  />
                </div>
                {/* Celular: print da tela do celular, sem a barra do sistema, inteiro dentro do cartão. */}
                <img
                  src={`/vitrine/topo-${t.nome}-celular.webp`}
                  alt={`${t.titulo}: ${t.texto}`}
                  loading={k === 0 ? 'eager' : 'lazy'}
                  className="block h-full max-h-full w-auto max-w-full rounded-2xl border border-black/10 bg-white object-contain shadow-[0_20px_40px_-18px_rgba(8,47,58,0.45)] md:hidden"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Setinhas discretas e pontinhos, sempre embaixo e no centro: nunca ficam em cima do print nem do texto. */}
      <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-3 sm:bottom-5">
        <BotaoSeta lado="esquerda" claro={noBanner} onClick={() => ir(atual - 1)} />
        <div className="flex gap-2">
          {Array.from({ length: TOTAL }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => ir(i)}
              aria-label={i === 0 ? 'Voltar ao início' : `Ver ${TELAS[i - 1].titulo}`}
              aria-current={i === atual}
              className={`h-2.5 rounded-full transition-all ${
                i === atual ? (noBanner ? 'w-8 bg-menta' : 'w-8 bg-primary') : noBanner ? 'w-2.5 bg-white/45 hover:bg-white/80' : 'w-2.5 bg-primary/25 hover:bg-primary/50'
              }`}
            />
          ))}
        </div>
        <BotaoSeta lado="direita" claro={noBanner} onClick={() => ir(atual + 1)} />
      </div>
    </section>
  );
}

function BotaoSeta({ lado, onClick, claro }: { lado: 'esquerda' | 'direita'; onClick: () => void; claro: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={lado === 'esquerda' ? 'Tela anterior' : 'Próxima tela'}
      className={`flex h-10 w-10 items-center justify-center rounded-full ring-1 backdrop-blur-sm transition ${
        claro ? 'bg-black/15 text-white/75 ring-white/25 hover:bg-black/40 hover:text-white' : 'bg-white/70 text-primary/70 ring-primary/15 hover:bg-white hover:text-primary'
      }`}
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
