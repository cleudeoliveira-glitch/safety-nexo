'use client';

import { useEffect, useRef, useState } from 'react';

// Marcar a foto antes de salvar: círculo, seta ou traço livre em vermelho, para mostrar onde está o problema.
// A foto marcada substitui a original e sai assim no PDF.
type Ferramenta = 'circulo' | 'seta' | 'livre';
type Desenho = { tipo: Ferramenta; pontos: { x: number; y: number }[] };

export function MarcarFoto({ foto, pronto, cancelar }: { foto: Blob; pronto: (b: Blob) => void; cancelar: () => void }) {
  const tela = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [ferramenta, setFerramenta] = useState<Ferramenta>('circulo');
  const [desenhos, setDesenhos] = useState<Desenho[]>([]);
  const atual = useRef<Desenho | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(foto);
    const i = new Image();
    i.onload = () => setImg(i);
    i.src = url;
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  // Redesenha a foto e todas as marcas.
  const pintar = (extra?: Desenho | null) => {
    const c = tela.current;
    if (!c || !img) return;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const grossura = Math.max(4, Math.round(Math.max(c.width, c.height) / 140));
    ctx.strokeStyle = '#ef0000'; ctx.lineWidth = grossura; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const d of [...desenhos, ...(extra ? [extra] : [])]) {
      const p = d.pontos;
      if (p.length < 2) continue;
      const [a, b] = [p[0], p[p.length - 1]];
      ctx.beginPath();
      if (d.tipo === 'livre') { ctx.moveTo(p[0].x, p[0].y); p.slice(1).forEach((q) => ctx.lineTo(q.x, q.y)); }
      else if (d.tipo === 'circulo') ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2 || 1, Math.abs(b.y - a.y) / 2 || 1, 0, 0, Math.PI * 2);
      else {
        // Seta: do ponto onde começou até onde soltou, com a ponta no fim.
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        const ang = Math.atan2(b.y - a.y, b.x - a.x), ponta = grossura * 4;
        ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - ponta * Math.cos(ang - 0.5), b.y - ponta * Math.sin(ang - 0.5));
        ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - ponta * Math.cos(ang + 0.5), b.y - ponta * Math.sin(ang + 0.5));
      }
      ctx.stroke();
    }
  };

  useEffect(() => {
    const c = tela.current;
    if (!c || !img) return;
    if (c.width !== img.width) { c.width = img.width; c.height = img.height; }
    pintar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, desenhos]);

  const ponto = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * e.currentTarget.width, y: ((e.clientY - r.top) / r.height) * e.currentTarget.height };
  };

  function salvar() {
    tela.current?.toBlob((b) => b && pronto(b), 'image/jpeg', 0.88);
  }

  const botao = (f: Ferramenta, nome: string) => (
    <button type="button" onClick={() => setFerramenta(f)} aria-pressed={ferramenta === f}
      className={`min-h-[44px] rounded-full px-4 text-sm font-semibold ${ferramenta === f ? 'bg-danger text-white' : 'bg-white/15 text-white'}`}>{nome}</button>
  );

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black p-3" role="dialog" aria-label="Marcar a foto">
      <p className="mb-2 text-center text-sm text-white/80">Arraste o dedo na foto para marcar onde está o problema.</p>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <canvas ref={tela} className="max-h-full max-w-full touch-none rounded-lg bg-black"
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); atual.current = { tipo: ferramenta, pontos: [ponto(e)] }; }}
          onPointerMove={(e) => { if (!atual.current) return; atual.current.pontos.push(ponto(e)); pintar(atual.current); }}
          onPointerUp={() => { const d = atual.current; atual.current = null; if (d && d.pontos.length > 1) setDesenhos((x) => [...x, d]); }} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {botao('circulo', '◯ Círculo')}{botao('seta', '➜ Seta')}{botao('livre', '✎ Livre')}
        <button type="button" onClick={() => setDesenhos((x) => x.slice(0, -1))} disabled={!desenhos.length}
          className="min-h-[44px] rounded-full bg-white/15 px-4 text-sm font-semibold text-white disabled:opacity-40">↶ Desfazer</button>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={cancelar} className="min-h-[52px] flex-1 rounded-card bg-white/15 font-semibold text-white">Cancelar</button>
        <button type="button" onClick={salvar} disabled={!img} className="min-h-[52px] flex-1 rounded-card bg-white font-semibold text-primary">Pronto</button>
      </div>
    </div>
  );
}
