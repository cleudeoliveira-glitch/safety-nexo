'use client';

import { useEffect } from 'react';
import { avisarFalhaDaTela } from '@/lib/api';

// Quando uma tela quebra: mostra uma mensagem simples e anota o erro para o Diagnóstico do Painel ADM.
export default function ErroDaTela({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { avisarFalhaDaTela(error.message || 'A tela quebrou ao abrir.', error.stack); }, [error]);
  return (
    <main className="mx-auto max-w-lg space-y-4 p-10 text-center">
      <h1 className="text-2xl font-semibold text-primary">Algo deu errado nesta tela</h1>
      <p className="text-text/70">Já avisamos a equipe do Safety Nexo. Tente de novo; se continuar, volte daqui a pouco.</p>
      <button onClick={reset} className="rounded-card bg-primary px-4 py-2.5 text-sm font-semibold text-white">Tentar de novo</button>
    </main>
  );
}
