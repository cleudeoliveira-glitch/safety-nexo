'use client';

import { useEffect, useRef, useState } from 'react';
import { carregarFaceApi, configRosto, DetectorPiscada, distancia, fotografar, lerRosto, localizacao, media } from '@/lib/rosto';
import { Botao } from './ui';

export type CapturaRosto = { descritor: number[]; descritores: number[][]; foto: string; fotoItem?: string; latitude?: number; longitude?: number; precisao?: number; provaDeVida: boolean };

type Props = {
  titulo: string;
  // cadastro: guarda 3 leituras · unico: confere uma pessoa e fecha · continuo: vai reconhecendo um após o outro
  modo: 'cadastro' | 'unico' | 'continuo';
  pedirFotoItem?: boolean;
  onCaptura: (c: CapturaRosto) => Promise<string>;
  // Sem internet na hora de enviar: guarda no aparelho e envia depois.
  guardarOffline?: (c: CapturaRosto) => Promise<string>;
  onFechar: () => void;
};

type Fase = 'carregando' | 'procurando' | 'segure' | 'pisque' | 'fotoItem' | 'enviando' | 'feito' | 'erro';
const PISCAR_MS = 15000;
const LEITURAS = 3;
const SEGURAR_MS = 1800;

export function CameraRosto({ titulo, modo, pedirFotoItem, onCaptura, guardarOffline, onFechar }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const ativo = useRef(true);
  const pausa = useRef(false);
  const [fase, setFase] = useState<Fase>('carregando');
  const [texto, setTexto] = useState('Abrindo a câmera e preparando o reconhecimento…');
  const [progresso, setProgresso] = useState(0);
  const [registros, setRegistros] = useState<string[]>([]);
  const pendente = useRef<CapturaRosto | null>(null);
  const geo = useRef<{ latitude?: number; longitude?: number; precisao?: number }>({});

  async function enviar(c: CapturaRosto) {
    setFase('enviando'); setTexto('Conferindo…');
    try {
      const comGeo = { ...c, ...geo.current };
      let msg: string;
      try { msg = await onCaptura(comGeo); } catch (e) {
        if (!(e instanceof TypeError) || !guardarOffline) throw e;
        msg = await guardarOffline(comGeo); // sem conexão
      }
      if (modo === 'continuo') {
        setRegistros((r) => [msg, ...r]); setFase('feito'); setTexto(msg);
        setTimeout(() => { if (ativo.current) { pausa.current = false; setFase('procurando'); setTexto('Próxima pessoa: olhe para a câmera.'); } }, 2500);
      } else { setFase('feito'); setTexto(msg); }
    } catch (e) {
      setFase('erro'); setTexto((e as Error).message);
    }
  }

  function tentarDeNovo() { pausa.current = false; setProgresso(0); setFase('procurando'); setTexto('Olhe para a câmera.'); }

  useEffect(() => {
    ativo.current = true;
    let fluxo: MediaStream | null = null;
    let exigirPiscada = false;
    localizacao().then((g) => { geo.current = g; });
    (async () => {
      try {
        fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
        if (!video.current) return;
        video.current.srcObject = fluxo;
        await video.current.play();
        await carregarFaceApi();
        exigirPiscada = modo !== 'cadastro' && (await configRosto()).provaDeVida;
      } catch (e) {
        setFase('erro');
        setTexto((e as Error).name === 'NotAllowedError' ? 'A câmera não foi liberada. Libere a câmera no navegador e abra de novo.' : `Não foi possível abrir a câmera: ${(e as Error).message}`);
        return;
      }
      setFase('procurando'); setTexto('Olhe para a câmera, de frente e com boa luz.');
      let lidas: number[][] = [];
      let inicio = 0;
      let piscada: DetectorPiscada | null = null;
      let piscadaDesde = 0;
      let segura: number[][] = [];
      const recomecar = (msg: string) => { lidas = []; piscada = null; setProgresso(0); setFase('procurando'); setTexto(msg); };
      while (ativo.current) {
        if (pausa.current || !video.current) { await new Promise((r) => setTimeout(r, 200)); continue; }
        const l = await lerRosto(video.current).catch(() => null);
        if (!ativo.current || pausa.current) continue;
        if (l === 'varios') recomecar('Há mais de um rosto na imagem. Fique só uma pessoa na frente da câmera.');
        else if (!l || l.confianca < 0.6) { if (!piscada) recomecar('Olhe para a câmera, de frente e com boa luz.'); }
        else if (piscada) {
          // Prova de vida: o mesmo rosto precisa piscar (foto impressa ou na tela não pisca).
          if (distancia(media(segura), l.descritor) > 0.5) recomecar('O rosto mudou. Olhe para a câmera de novo.');
          else if (piscada.ler(l.olhos)) {
            const c: CapturaRosto = { descritor: media(segura), descritores: segura, foto: fotografar(video.current), provaDeVida: true };
            await concluir(c); piscada = null; continue;
          } else if (Date.now() - piscadaDesde > PISCAR_MS) {
            piscada = null; pausa.current = true; setFase('erro'); setTexto('Não vimos a piscada. Toque em "Tentar de novo" e pisque devagar, olhando para a câmera.'); continue;
          }
          await new Promise((r) => setTimeout(r, 40)); continue; // leitura rápida para não perder a piscada
        } else {
          // Leituras seguidas precisam ser do mesmo rosto (evita trocar de pessoa no meio).
          if (lidas.length && distancia(lidas[lidas.length - 1], l.descritor) > 0.45) lidas = [];
          if (!lidas.length) inicio = Date.now();
          lidas.push(l.descritor);
          const t = Math.min(1, (Date.now() - inicio) / SEGURAR_MS);
          setProgresso(t); setFase('segure'); setTexto('Rosto encontrado. Fique parado…');
          if (lidas.length >= LEITURAS && t >= 1) {
            segura = lidas.slice(-LEITURAS); lidas = [];
            if (exigirPiscada) { piscada = new DetectorPiscada(); piscada.ler(l.olhos); piscadaDesde = Date.now(); setFase('pisque'); setTexto('Agora pisque os olhos devagar, uma vez.'); continue; }
            await concluir({ descritor: media(segura), descritores: segura, foto: fotografar(video.current), provaDeVida: false });
            continue;
          }
        }
        await new Promise((r) => setTimeout(r, 250));
      }
    })();
    async function concluir(c: CapturaRosto) {
      pausa.current = true; setProgresso(1);
      if (pedirFotoItem) { pendente.current = c; setFase('fotoItem'); setTexto('Rosto lido. Agora mostre o EPI para a câmera e toque em "Fotografar o EPI", ou conclua sem a foto.'); }
      else await enviar(c);
    }
    return () => { ativo.current = false; fluxo?.getTracks().forEach((t) => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cor = fase === 'erro' ? 'border-danger' : fase === 'feito' ? 'border-success' : fase === 'segure' || fase === 'pisque' ? 'border-[#10B981]' : 'border-border';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="w-full max-w-lg rounded-card bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-primary">{titulo}</h2>
          <button className="text-sm text-text/60 underline" onClick={onFechar}>Fechar</button>
        </div>
        <div className={`relative mt-3 overflow-hidden rounded-card border-4 ${cor} bg-black`}>
          <video ref={video} className="aspect-[4/3] w-full -scale-x-100 object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-3/4 w-1/2 rounded-[50%] border-2 border-dashed border-white/70" />
          </div>
          {(fase === 'segure' || fase === 'enviando') && <div className="absolute bottom-0 left-0 h-1.5 bg-[#10B981] transition-all" style={{ width: `${progresso * 100}%` }} />}
        </div>
        <p className={`mt-3 text-sm ${fase === 'erro' ? 'text-danger' : fase === 'feito' ? 'font-semibold text-success' : ''}`} role="status" aria-live="polite">{texto}</p>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          {fase === 'fotoItem' && pendente.current && (
            <>
              <Botao variante="secundario" onClick={() => enviar(pendente.current!)}>Concluir sem foto do EPI</Botao>
              <Botao onClick={() => video.current && enviar({ ...pendente.current!, fotoItem: fotografar(video.current) })}>Fotografar o EPI</Botao>
            </>
          )}
          {fase === 'erro' && <Botao onClick={tentarDeNovo}>Tentar de novo</Botao>}
          {fase === 'feito' && modo !== 'continuo' && <Botao onClick={onFechar}>Fechar</Botao>}
        </div>
        {modo === 'continuo' && registros.length > 0 && (
          <ul className="mt-3 max-h-32 space-y-1 overflow-auto border-t border-border pt-2 text-sm">{registros.map((r, i) => <li key={i}>✓ {r}</li>)}</ul>
        )}
        <p className="mt-3 text-xs text-text/50">O reconhecimento roda neste aparelho. A foto do cadastro não é guardada, só um código numérico do rosto.</p>
      </div>
    </div>
  );
}
