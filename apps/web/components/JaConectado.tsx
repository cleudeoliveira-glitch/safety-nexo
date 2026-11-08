'use client';

import { useEffect, useState } from 'react';
import { esquecerSessao, lerToken, lerUsuario } from '@/lib/sessao';

// Quem abre o link no mesmo navegador em que já entrou cai na própria conta.
// Este aviso mostra quem está conectado e deixa entrar com outra conta sem precisar procurar o "Sair".
export function JaConectado({ aoTrocar }: { aoTrocar?: () => void }) {
  const [nome, setNome] = useState<string | null>(null);
  useEffect(() => { if (lerToken()) setNome(lerUsuario()?.nome ?? 'uma conta'); }, []);
  if (!nome) return null;
  return (
    <div className="card-pendente space-y-2 rounded-card p-4 text-sm">
      <p>Este navegador já está conectado como <strong>{nome}</strong>.</p>
      <div className="flex flex-wrap gap-2">
        <a href="/" className="rounded-card bg-primary px-3 py-2 text-xs font-semibold text-white">Continuar como {nome.split(' ')[0]}</a>
        <button type="button" onClick={() => { esquecerSessao(); setNome(null); aoTrocar?.(); }} className="rounded-card border border-border bg-white px-3 py-2 text-xs font-semibold">
          Usar outra conta
        </button>
      </div>
    </div>
  );
}
