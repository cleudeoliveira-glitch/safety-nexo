'use client';

import { useEffect } from 'react';
import { enviarCapturas } from '@/lib/rosto-offline';
import { lerToken } from '@/lib/sessao';

// Liga o modo sem internet (service worker). Em desenvolvimento ele atrapalha a recarga, então só em produção.
// Quando a internet volta, envia as capturas de rosto guardadas no aparelho.
export function RegistrarSw() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    const enviar = () => { if (lerToken()) enviarCapturas().catch(() => undefined); };
    enviar();
    window.addEventListener('online', enviar);
    return () => window.removeEventListener('online', enviar);
  }, []);
  return null;
}
