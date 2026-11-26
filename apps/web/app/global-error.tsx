'use client';

import { useEffect } from 'react';
import { avisarFalhaDaTela } from '@/lib/api';

// Quando até o contorno do site quebra (o Next mostraria "Application error" em inglês).
export default function ErroGeral({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { avisarFalhaDaTela(error.message || 'O site quebrou ao abrir.', error.stack); }, [error]);
  return (
    <html lang="pt-BR" translate="no">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#F5F7F8', color: '#1F2A30', margin: 0 }}>
        <main style={{ maxWidth: 480, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
          <h1 style={{ color: '#0E4A5B', fontSize: 24 }}>O Safety Nexo não abriu direito</h1>
          <p>Já avisamos a equipe. Tente de novo; se continuar, feche o navegador e abra outra vez daqui a pouco.</p>
          <button onClick={reset} style={{ background: '#0E4A5B', color: '#fff', border: 0, borderRadius: 8, padding: '10px 16px', fontWeight: 600, cursor: 'pointer' }}>Tentar de novo</button>
        </main>
      </body>
    </html>
  );
}
