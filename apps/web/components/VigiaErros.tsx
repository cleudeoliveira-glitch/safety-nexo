'use client';

import { useEffect } from 'react';
import { avisarFalhaDaTela } from '@/lib/api';

// Erros soltos do navegador (fora de uma tela que quebrou): também vão para o Diagnóstico.
// Ignora os de extensões do navegador e os de rede, que não são do sistema.
const IGNORAR = /ResizeObserver|extension:\/\/|Failed to fetch|NetworkError|Load failed|AbortError|ChunkLoadError|Loading chunk/i;
export function VigiaErros() {
  useEffect(() => {
    const erro = (ev: ErrorEvent) => {
      const msg = ev.message || String(ev.error ?? '');
      if (!msg || IGNORAR.test(msg) || IGNORAR.test(ev.filename ?? '')) return;
      avisarFalhaDaTela(msg, (ev.error as Error | undefined)?.stack);
    };
    const promessa = (ev: PromiseRejectionEvent) => {
      const r = ev.reason as (Error & { status?: number }) | undefined;
      if (r?.status) return; // resposta do motor: os erros graves (500) ele mesmo já anotou
      const msg = r?.message ?? String(ev.reason ?? '');
      if (!msg || IGNORAR.test(msg) || IGNORAR.test(r?.stack ?? '')) return;
      avisarFalhaDaTela(msg, r?.stack);
    };
    window.addEventListener('error', erro);
    window.addEventListener('unhandledrejection', promessa);
    return () => { window.removeEventListener('error', erro); window.removeEventListener('unhandledrejection', promessa); };
  }, []);
  return null;
}
