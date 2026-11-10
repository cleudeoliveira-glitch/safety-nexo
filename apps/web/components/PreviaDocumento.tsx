'use client';

import { useEffect, useState } from 'react';
import { ouvirPrevia, type PedidoPrevia } from '@/lib/previa';

// Janela da pré-visualização: mostra o documento inteiro antes de gerar o PDF.
export function PreviaDocumento() {
  const [pedido, setPedido] = useState<PedidoPrevia | null>(null);

  useEffect(() => {
    ouvirPrevia(setPedido);
    return () => ouvirPrevia(null);
  }, []);

  useEffect(() => {
    if (!pedido) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = antes; };
  }, [pedido]);

  if (!pedido) return null;

  const responder = (autorizou: boolean) => {
    pedido.responder(autorizou);
    setPedido(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/60 p-2 md:p-6" role="dialog" aria-modal="true" aria-label={`Pré-visualização: ${pedido.nome}`}>
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-card bg-white shadow-xl">
        <div className="border-b border-border px-4 py-3">
          <p className="text-base font-semibold text-primary">Confira o documento antes de gerar o PDF</p>
          <p className="text-sm text-text/70">Leia com calma: {pedido.nome}. Se estiver tudo certo, autorize. Se não, volte e corrija.</p>
        </div>
        <iframe title={`Pré-visualização: ${pedido.nome}`} srcDoc={pedido.html} sandbox="" className="min-h-0 w-full flex-1 bg-background" />
        <div className="flex flex-col-reverse gap-2 border-t border-border p-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => responder(false)} className="rounded-card border border-border bg-white px-4 py-3 text-sm font-semibold text-text hover:border-primary">
            Voltar e corrigir
          </button>
          <button type="button" onClick={() => responder(true)} className="rounded-card bg-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-90">
            Está correto, gerar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
