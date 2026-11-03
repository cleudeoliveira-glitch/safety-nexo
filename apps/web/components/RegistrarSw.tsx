'use client';

import { useEffect } from 'react';

// Liga o modo sem internet (service worker). Em desenvolvimento ele atrapalha a recarga, então só em produção.
export function RegistrarSw() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  return null;
}
