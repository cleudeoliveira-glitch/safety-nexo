'use client';

import { useEffect, useRef, useState } from 'react';
import { Botao } from './ui';

export type Localizacao = { latitude: number; longitude: number; precisao: number } | null;

// Pede a localização ao aparelho. Se a pessoa negar, a assinatura vale do mesmo jeito, só sem o local.
export function pedirLocalizacao(): Promise<Localizacao> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, precisao: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

// Quadro para assinar com o dedo (celular, tablet) ou com o mouse.
export function QuadroAssinatura({ onPronto, rotulo = 'Assine no quadro abaixo com o dedo ou o mouse' }: { onPronto: (imagem: string | null) => void; rotulo?: string }) {
  const tela = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const temTraco = useRef(false);
  const [vazio, setVazio] = useState(true);

  useEffect(() => {
    const c = tela.current!; const escala = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * escala; c.height = c.offsetHeight * escala;
    const ctx = c.getContext('2d')!; ctx.scale(escala, escala);
    ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111827';
  }, []);

  const ponto = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };
  const inicio = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId); desenhando.current = true;
    const ctx = e.currentTarget.getContext('2d')!; const [x, y] = ponto(e); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke();
  };
  const mover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!desenhando.current) return;
    const ctx = e.currentTarget.getContext('2d')!; const [x, y] = ponto(e); ctx.lineTo(x, y); ctx.stroke();
    temTraco.current = true; if (vazio) setVazio(false);
  };
  const fim = () => {
    if (!desenhando.current) return;
    desenhando.current = false;
    onPronto(temTraco.current ? tela.current!.toDataURL('image/png') : null);
  };
  const limpar = () => {
    const c = tela.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); temTraco.current = false; setVazio(true); onPronto(null);
  };

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">{rotulo}</p>
      <canvas ref={tela} aria-label="Quadro de assinatura" onPointerDown={inicio} onPointerMove={mover} onPointerUp={fim} onPointerLeave={fim}
        className="h-40 w-full touch-none rounded-card border-2 border-dashed border-border bg-white" />
      <div className="mt-1 flex justify-between text-xs text-text/60">
        <span>{vazio ? 'Ainda sem assinatura' : 'Assinatura feita'}</span>
        <Botao type="button" variante="secundario" className="!px-3 !py-1 text-xs" onClick={limpar}>Limpar</Botao>
      </div>
    </div>
  );
}
