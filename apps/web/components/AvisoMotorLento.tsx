'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EVENTO_MOTOR_LENTO } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101';
// Telas por onde a pessoa chega: já acordam o motor enquanto ela lê ou digita a senha.
const TELAS_DE_CHEGADA = ['/', '/entrar', '/cadastro', '/planos'];

// O motor fica num servidor gratuito que "dorme" quando passa um tempo parado e leva até 1 minuto para ligar.
// Em vez de a tela parecer travada, aparece um aviso enquanto ele liga.
export function AvisoMotorLento() {
  const caminho = usePathname();
  const [lentas, setLentas] = useState(0);

  useEffect(() => {
    const ouvir = (e: Event) => setLentas((e as CustomEvent<number>).detail);
    window.addEventListener(EVENTO_MOTOR_LENTO, ouvir);
    return () => window.removeEventListener(EVENTO_MOTOR_LENTO, ouvir);
  }, []);

  useEffect(() => {
    if (TELAS_DE_CHEGADA.includes(caminho)) globalThis.fetch(`${API_URL}/health`).catch(() => undefined);
  }, [caminho]);

  if (lentas <= 0) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-4 z-50 mx-auto w-[calc(100%-2rem)] max-w-md rounded-card border border-border bg-white p-4 text-sm shadow-lg print:hidden">
      <p className="font-semibold text-primary">Estamos ligando o sistema…</p>
      <p className="mt-1 text-text/70">No primeiro acesso depois de um tempo parado, pode levar até 1 minuto. Não precisa clicar de novo.</p>
    </div>
  );
}
