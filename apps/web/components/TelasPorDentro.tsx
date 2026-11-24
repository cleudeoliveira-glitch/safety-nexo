'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Carro-chefe da página inicial: os diferenciais do Safety Nexo mostrados em telas reais e documentos gerados, um por vez.
// O painel do dia já aparece no topo, por isso não entra aqui.
// Prints reais, tirados do sistema com empresas de exemplo. Computador: tela-*.webp; celular, sem a barra do sistema: topo-*-celular.webp.
// Regra da vitrine: o texto fica embaixo do print, nunca por cima. Uma ideia por tela, sem repetir frase.
// Passa sozinho o tempo todo (pedido do Rodrigo em 24/11). Para enquanto o mouse está em cima; clicar nas setinhas,
// nos pontinhos ou arrastar no celular recomeça a contagem. Quem pediu menos movimento no aparelho não tem a passagem automática.
const TEMPO_TELA = 5000;
const TELAS: { nome: string; titulo: string; texto: string; documentos?: string[] }[] = [
  { nome: 'ghe', titulo: 'Preenche uma vez, vale para tudo', texto: 'Os riscos de cada setor e função vão sozinhos para PGR, PCMSO, LTCAT e OS.' },
  { nome: 'pdf', titulo: 'Documento com a sua marca', texto: 'Logo do cliente e da sua consultoria, com QR code para conferir.', documentos: ['/vitrine/pgr-capa.webp', '/vitrine/doc-pcmso.webp', '/vitrine/doc-ltcat.webp'] },
  { nome: 'documentos', titulo: '36 modelos num lugar só', texto: 'Escolha o documento e ele já abre com os dados da empresa.' },
  { nome: 'slides', titulo: 'Treinamento pronto', texto: 'Slides das NRs, roteiro do instrutor e prova, prontos para aplicar.' },
]

export function TelasPorDentro() {
  const [atual, setAtual] = useState(0);
  const toque = useRef<number | null>(null);
  const [parado, setParado] = useState(false);
  const [mexeu, setMexeu] = useState(0);
  const ir = useCallback((i: number) => {
    setMexeu((m) => m + 1);
    setAtual(((i % TELAS.length) + TELAS.length) % TELAS.length);
  }, []);

  useEffect(() => {
    if (parado || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setTimeout(() => setAtual((a) => (a + 1) % TELAS.length), TEMPO_TELA);
    return () => window.clearTimeout(t);
  }, [atual, parado, mexeu]);
  const t = TELAS[atual];

  return (
    <div
      aria-roledescription="carrossel"
      aria-label="Telas do Safety Nexo"
      onMouseEnter={() => setParado(true)}
      onMouseLeave={() => setParado(false)}
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
      <div className="overflow-hidden">
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${atual * 100}%)` }}>
          {TELAS.map((x, k) => (
            <div key={x.nome} className={`flex w-full shrink-0 justify-center px-1 transition-opacity duration-500 ${atual === k ? 'opacity-100' : 'opacity-0'}`} aria-hidden={atual !== k}>
              {x.documentos ? (
                <div className="flex w-full max-w-4xl items-start justify-center gap-3 py-2 sm:gap-6">
                  {x.documentos.map((d, i) => (
                    <img key={d} src={d} alt={`${x.titulo}: página ${i + 1}`} loading="lazy" className={`w-[31%] max-w-[260px] rounded-md bg-white shadow-xl ring-1 ring-black/10 ${i === 1 ? 'mt-6' : ''}`} />
                  ))}
                </div>
              ) : (
                <>
                  <div className="hidden w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_30px_60px_-25px_rgba(8,47,58,0.4)] md:block">
                    <div className="flex items-center gap-1.5 border-b border-border bg-[#F4F6F8] px-3 py-2" aria-hidden>
                      <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" />
                    </div>
                    <img src={`/vitrine/tela-${x.nome}.webp`} alt={`${x.titulo}: ${x.texto}`} loading="lazy" className="block w-full" />
                  </div>
                  <img
                    src={`/vitrine/topo-${x.nome}-celular.webp`}
                    alt={`${x.titulo}: ${x.texto}`}
                    loading="lazy"
                    className="block max-h-[62svh] w-auto max-w-full rounded-2xl border border-black/10 bg-white shadow-[0_20px_40px_-18px_rgba(8,47,58,0.45)] md:hidden"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-xl text-center text-base text-text/75 sm:text-lg" aria-live="polite">
        <strong className="text-primary-escuro">{t.titulo}.</strong> {t.texto}
      </p>

      <div className="mt-5 flex items-center justify-center gap-3">
        <BotaoSeta lado="esquerda" onClick={() => ir(atual - 1)} />
        <div className="flex gap-2">
          {TELAS.map((x, i) => (
            <button
              key={x.nome}
              type="button"
              onClick={() => ir(i)}
              aria-label={`Ver ${x.titulo}`}
              aria-current={i === atual}
              className={`h-2.5 rounded-full transition-all ${i === atual ? 'w-8 bg-primary' : 'w-2.5 bg-primary/25 hover:bg-primary/50'}`}
            />
          ))}
        </div>
        <BotaoSeta lado="direita" onClick={() => ir(atual + 1)} />
      </div>
    </div>
  );
}

function BotaoSeta({ lado, onClick }: { lado: 'esquerda' | 'direita'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={lado === 'esquerda' ? 'Tela anterior' : 'Próxima tela'}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary/70 ring-1 ring-primary/15 transition hover:text-primary hover:ring-primary/40"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {lado === 'esquerda' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 6l6 6-6 6" />}
      </svg>
    </button>
  );
}
