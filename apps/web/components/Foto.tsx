'use client';

import { useEffect, useRef, useState } from 'react';
import { AnaliseFotoIa } from '@/lib/api';

// Diminui a foto do celular (que pode ter 10 MB) para no máximo 1600 px, em JPG. Fica leve para enviar no 4G.
export async function reduzirFoto(arquivo: File, max = 1600): Promise<Blob> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = url; });
    const escala = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * escala); canvas.height = Math.round(img.height * escala);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((ok) => canvas.toBlob((b) => ok(b ?? arquivo), 'image/jpeg', 0.85));
  } catch {
    return arquivo;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Botão de foto: no celular abre a câmera; no computador, escolhe o arquivo. Mostra a miniatura.
export function EscolherFoto({ foto, mudar, rotulo = 'Tirar foto' }: { foto: Blob | null; mudar: (b: Blob | null) => void; rotulo?: string }) {
  const [previa, setPrevia] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!foto) { setPrevia(null); return; }
    const u = URL.createObjectURL(foto); setPrevia(u);
    return () => URL.revokeObjectURL(u);
  }, [foto]);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input ref={entrada} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={async (e) => { const f = e.target.files?.[0]; if (f) mudar(await reduzirFoto(f)); e.target.value = ''; }} />
      <button type="button" onClick={() => entrada.current?.click()} className="rounded-card border border-border bg-white px-4 py-2.5 text-sm font-semibold hover:border-primary">
        📷 {foto ? 'Trocar foto' : rotulo}
      </button>
      {previa && (<>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previa} alt="Foto escolhida" className="h-16 w-16 rounded-card object-cover" />
        <button type="button" className="text-xs text-danger" onClick={() => mudar(null)}>Tirar a foto</button>
      </>)}
    </div>
  );
}

type Reconhecimento = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

// Falar em vez de digitar. Usa o reconhecimento de voz do próprio navegador (Chrome e Android).
// Onde não existe, mostra a dica de usar o microfone do teclado do celular.
export function Ditado({ acrescentar }: { acrescentar: (texto: string) => void }) {
  const [ouvindo, setOuvindo] = useState(false);
  const [suporta, setSuporta] = useState(true);
  const rec = useRef<Reconhecimento | null>(null);
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Reconhecimento; webkitSpeechRecognition?: new () => Reconhecimento };
    if (!(w.SpeechRecognition ?? w.webkitSpeechRecognition)) setSuporta(false);
  }, []);
  function alternar() {
    if (ouvindo) { rec.current?.stop(); return; }
    const w = window as unknown as { SpeechRecognition?: new () => Reconhecimento; webkitSpeechRecognition?: new () => Reconhecimento };
    const Classe = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Classe) { setSuporta(false); return; }
    const r = new Classe();
    r.lang = 'pt-BR'; r.interimResults = false; r.continuous = true;
    r.onresult = (e) => { const ultimo = e.results[e.results.length - 1]; if (ultimo?.[0]?.transcript) acrescentar(ultimo[0].transcript.trim()); };
    r.onend = () => setOuvindo(false);
    r.onerror = () => setOuvindo(false);
    rec.current = r; r.start(); setOuvindo(true);
  }
  if (!suporta) return <p className="text-xs text-text/60">Dica: para falar em vez de digitar, toque no 🎤 do teclado do celular.</p>;
  return (
    <button type="button" onClick={alternar} className={`rounded-card px-4 py-2 text-sm font-semibold ${ouvindo ? 'bg-danger text-white' : 'border border-border bg-white hover:border-primary'}`}>
      🎤 {ouvindo ? 'Ouvindo… toque para parar' : 'Falar em vez de digitar'}
    </button>
  );
}

// Foto que precisa de login para abrir (relato, evidência). Só carrega quando a pessoa pede.
export function FotoProtegida({ carregar, rotulo = 'Ver foto' }: { carregar: () => Promise<string>; rotulo?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  if (url) return (
    // eslint-disable-next-line @next/next/no-img-element
    <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Foto" className="mt-2 max-h-64 rounded-card border border-border" /></a>
  );
  return (<>
    <button type="button" className="text-xs font-semibold text-primary underline" onClick={() => carregar().then(setUrl).catch((e: Error) => setErro(e.message))}>📷 {rotulo}</button>
    {erro && <span className="ml-2 text-xs text-danger">{erro}</span>}
  </>);
}

// Matriz 5x5: probabilidade x severidade.
export function nivelRisco(p: number, s: number) {
  const v = p * s;
  if (v >= 15) return { rotulo: 'Alto', cor: 'bg-danger text-white', prioridade: 'ALTA' as const };
  if (v >= 8) return { rotulo: 'Médio', cor: 'bg-warning text-white', prioridade: 'MEDIA' as const };
  return { rotulo: 'Baixo', cor: 'bg-success text-white', prioridade: 'BAIXA' as const };
}

// Resultado da IA sobre uma foto, com o botão para virar ações do plano.
export function ResultadoIa({ analise, criarAcoes }: { analise: AnaliseFotoIa; criarAcoes?: (acoes: { descricao: string; prioridade: 'ALTA' | 'MEDIA' | 'BAIXA'; nr: string | null }[]) => void }) {
  const todas = analise.perigos.flatMap((p) => p.acoes.map((a) => ({ descricao: a, prioridade: nivelRisco(p.probabilidade, p.severidade).prioridade, nr: p.nr })));
  return (
    <div className="space-y-3 rounded-card border border-primary/30 bg-primary/5 p-4 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">✨ Sugestão da IA · confira antes de usar</p>
      <p>{analise.resumo}</p>
      {analise.perigos.length > 0 && (
        <ul className="space-y-2">
          {analise.perigos.map((p, i) => {
            const n = nivelRisco(p.probabilidade, p.severidade);
            return (
              <li key={i} className="rounded-card bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${n.cor}`}>Risco {n.rotulo} ({p.probabilidade}×{p.severidade})</span>
                  {p.nr && <span className="rounded-full bg-background px-2.5 py-0.5 text-xs font-semibold">{p.nr}</span>}
                  <strong>{p.descricao}</strong>
                </div>
                {p.acoes.length > 0 && <ul className="mt-1 list-disc pl-5 text-text/80">{p.acoes.map((a, j) => <li key={j}>{a}</li>)}</ul>}
              </li>
            );
          })}
        </ul>
      )}
      {analise.boasPraticas.length > 0 && <p className="text-success"><strong>O que está certo:</strong> {analise.boasPraticas.join('; ')}</p>}
      {criarAcoes && todas.length > 0 && (
        <button type="button" className="rounded-card bg-primary px-4 py-2 text-sm font-semibold text-white" onClick={() => criarAcoes(todas)}>Levar {todas.length} ação(ões) ao plano de ação</button>
      )}
    </div>
  );
}
