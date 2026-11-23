'use client';

import { useEffect, useRef, useState } from 'react';

// Ditado por voz grátis: quando a pessoa toca num campo de texto comprido (textarea), aparece o botão
// "Falar" logo abaixo do campo (no rodapé ficaria escondido atrás do teclado do celular). Usa o reconhecimento de voz do próprio celular ou navegador (sem custo, sem IA paga).
// O que for dito entra no fim do texto do campo. Se o aparelho não tiver esse recurso, o botão não aparece.

type Reconhecedor = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void;
  onresult: ((ev: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null; onerror: ((ev: { error: string }) => void) | null;
};

function criarReconhecedor(): Reconhecedor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Reconhecedor; webkitSpeechRecognition?: new () => Reconhecedor };
  const Classe = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Classe ? new Classe() : null;
}

// Escreve no campo do jeito que o React percebe (o formulário atualiza o estado normalmente).
function acrescentar(el: HTMLTextAreaElement, fala: string) {
  const atual = el.value;
  const junta = atual && !/\s$/.test(atual) ? ' ' : '';
  const texto = fala.trim();
  const frase = !atual.trim() || /[.!?]\s*$/.test(atual) ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(el, atual + junta + frase);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

export function DitadoVoz() {
  const [campo, setCampo] = useState<HTMLTextAreaElement | null>(null);
  const [ouvindo, setOuvindo] = useState(false);
  const [erro, setErro] = useState('');
  const [temVoz, setTemVoz] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const rec = useRef<Reconhecedor | null>(null);
  const alvo = useRef<HTMLTextAreaElement | null>(null);
  const ouvindoRef = useRef(false);

  useEffect(() => { setTemVoz(!!criarReconhecedor()); }, []);

  useEffect(() => {
    if (!temVoz) return;
    const entrou = (ev: FocusEvent) => {
      const el = ev.target;
      if (el instanceof HTMLTextAreaElement && el.closest('main') && !el.readOnly && !el.disabled && !el.closest('[data-sem-ditado]')) { setCampo(el); setErro(''); }
    };
    const saiu = (ev: FocusEvent) => {
      if (ev.target instanceof HTMLTextAreaElement && !ouvindoRef.current) setTimeout(() => {
        if (!(document.activeElement instanceof HTMLTextAreaElement)) setCampo(null);
      }, 150);
    };
    document.addEventListener('focusin', entrou);
    document.addEventListener('focusout', saiu);
    return () => { document.removeEventListener('focusin', entrou); document.removeEventListener('focusout', saiu); };
  }, [temVoz]);

  useEffect(() => { ouvindoRef.current = ouvindo; }, [ouvindo]);

  // Acompanha o campo: o botão fica colado embaixo dele, mesmo quando o texto cresce.
  useEffect(() => {
    const el = ouvindo ? alvo.current : campo;
    if (!el) { setPos(null); return; }
    const medir = () => {
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 6, right: Math.max(8, document.documentElement.clientWidth - r.right) });
    };
    medir();
    el.addEventListener('input', medir);
    window.addEventListener('resize', medir);
    return () => { el.removeEventListener('input', medir); window.removeEventListener('resize', medir); };
  }, [campo, ouvindo]);
  useEffect(() => () => rec.current?.stop(), []);

  function comecar() {
    const r = criarReconhecedor();
    if (!r || !campo) return;
    alvo.current = campo;
    r.lang = 'pt-BR'; r.continuous = true; r.interimResults = false;
    r.onresult = (ev) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (res.isFinal && alvo.current) acrescentar(alvo.current, res[0].transcript);
      }
    };
    r.onerror = (ev) => setErro(ev.error === 'not-allowed' || ev.error === 'service-not-allowed'
      ? 'O celular não deixou usar o microfone. Libere o microfone para este site nas configurações do navegador.'
      : ev.error === 'no-speech' ? 'Não ouvi nada. Toque em Falar e fale perto do celular.' : 'O ditado parou. Toque em Falar de novo.');
    r.onend = () => setOuvindo(false);
    rec.current = r;
    try { r.start(); setOuvindo(true); setErro(''); } catch { setErro('O ditado não começou. Toque de novo.'); }
  }
  function parar() { rec.current?.stop(); setOuvindo(false); alvo.current?.focus({ preventScroll: true }); }

  if (!temVoz || (!campo && !ouvindo) || !pos) return null;
  return (
    <div style={{ position: 'absolute', top: pos.top, right: pos.right }} className="z-40 flex max-w-[90vw] flex-col items-end gap-1">
      {erro && <p className="rounded-lg bg-white px-3 py-1.5 text-xs text-danger shadow">{erro}</p>}
      <button type="button"
        // Segura o foco no campo: tocar no botão não fecha o teclado nem perde o campo escolhido.
        onPointerDown={(e) => e.preventDefault()}
        onClick={ouvindo ? parar : comecar}
        className={`flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-semibold text-white shadow-lg ${ouvindo ? 'animate-pulse bg-danger' : 'bg-primary'}`}>
        <span aria-hidden="true">{ouvindo ? '■' : '🎤'}</span>
        {ouvindo ? 'Parar de ouvir' : 'Falar'}
      </button>
    </div>
  );
}
