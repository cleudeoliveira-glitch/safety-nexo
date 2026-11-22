'use client';

import { useEffect, useState } from 'react';
import { ehEmpresa } from '@/lib/sessao';

// Botão "Excluir" das listas de documentos. Pergunta antes de apagar e some para o login da empresa cliente.
export function BotaoExcluir({ pergunta, excluir, aoTerminar, aoErrar, rotulo = 'Excluir' }: {
  pergunta: string;
  excluir: () => Promise<unknown>;
  aoTerminar: () => void | Promise<void>;
  aoErrar: (mensagem: string) => void;
  rotulo?: string;
}) {
  const [cliente, setCliente] = useState(true);
  const [apagando, setApagando] = useState(false);
  useEffect(() => setCliente(ehEmpresa()), []);
  if (cliente) return null;
  return (
    <button type="button" disabled={apagando}
      className="rounded-card px-2 py-2 text-sm font-semibold text-danger hover:underline disabled:opacity-50"
      onClick={async () => {
        if (!window.confirm(`${pergunta}\n\nIsso não tem volta.`)) return;
        setApagando(true);
        try { await excluir(); await aoTerminar(); }
        catch (e) { aoErrar((e as Error).message); }
        finally { setApagando(false); }
      }}>
      {apagando ? 'Excluindo…' : rotulo}
    </button>
  );
}
