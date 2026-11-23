'use client';

import { useEffect, useState } from 'react';

// Telas do sistema passando sozinhas no topo da página inicial.
// Prints reais, tirados do sistema com uma empresa de exemplo (Padaria Pão Dourado). Ficam em public/vitrine/.
const TELAS = [
  { img: '/vitrine/tela-painel.webp', titulo: 'Painel do dia', texto: 'Abriu o sistema, já sabe o que fazer hoje' },
  { img: '/vitrine/tela-ghe.webp', titulo: 'GHE e riscos', texto: 'Cadastra uma vez e vai para PGR, PCMSO, LTCAT e OS' },
  { img: '/vitrine/tela-documentos.webp', titulo: 'Documentos', texto: 'Todos os programas e laudos num lugar só' },
  { img: '/vitrine/tela-slides.webp', titulo: 'Treinamentos', texto: 'Slides prontos para apresentar na hora' },
  { img: '/vitrine/tela-mapa-risco.webp', titulo: 'Mapa de risco', texto: 'Sai pronto do inventário, para afixar no setor' },
];

const TEMPO = 4500; // milissegundos em cada tela

export function CarrosselTelas() {
  const [atual, setAtual] = useState(0);
  const [parado, setParado] = useState(false);

  useEffect(() => {
    // Quem pediu ao sistema menos movimento vê as telas só quando toca nos pontinhos.
    const menosMovimento = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (parado || menosMovimento) return;
    const t = window.setTimeout(() => setAtual((a) => (a + 1) % TELAS.length), TEMPO);
    return () => window.clearTimeout(t);
  }, [atual, parado]);

  const tela = TELAS[atual];
  return (
    <div onMouseEnter={() => setParado(true)} onMouseLeave={() => setParado(false)} aria-roledescription="carrossel" aria-label="Telas do Safety Nexo">
      <div className="overflow-hidden rounded-xl border border-white/20 bg-white shadow-2xl shadow-black/40">
        <div className="flex items-center gap-1.5 bg-[#e9eef1] px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 truncate rounded-md bg-white px-3 py-0.5 text-[11px] text-text/55">safetynexo.com.br</span>
        </div>
        <div className="relative aspect-[16/10] bg-white">
          {TELAS.map((t, i) => (
            <img
              key={t.img}
              src={t.img}
              alt={`${t.titulo}: ${t.texto}`}
              aria-hidden={i !== atual}
              className={`absolute inset-0 h-full w-full object-cover object-left-top transition-opacity duration-700 ${i === atual ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between lg:pb-0 lg:pr-[25%]">
        <p className="min-h-[4.5rem] text-white sm:max-w-[75%]" aria-live="polite">
          <span className="block text-sm font-bold uppercase tracking-wider text-menta">{tela.titulo}</span>
          <span className="block text-base text-white/85">{tela.texto}</span>
        </p>
        <div className="flex gap-2">
          {TELAS.map((t, i) => (
            <button
              key={t.img}
              type="button"
              onClick={() => setAtual(i)}
              aria-label={`Ver ${t.titulo}`}
              aria-current={i === atual}
              className={`h-2.5 rounded-full transition-all ${i === atual ? 'w-7 bg-menta' : 'w-2.5 bg-white/40 hover:bg-white/70'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
