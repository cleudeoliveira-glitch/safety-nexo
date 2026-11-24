'use client';

import { useEffect, useMemo, useState } from 'react';
import { ouvirPrevia, type AvisoAntes, type PedidoPrevia } from '@/lib/previa';

// No celular a folha A4 não cabe na tela: o texto se ajusta à largura e as tabelas largas
// ficam numa faixa que desliza para o lado, sem espremer as colunas nem cortar o texto.
// O PDF final não muda: continua em folha A4, igual ao do computador.
const CSS_CELULAR = `<style id="sn-celular">
@media (max-width: 700px) {
  html, body { max-width: 100% !important; overflow-x: hidden; }
  html body { margin: 14px !important; font-size: 13px; }
  h1 { font-size: 18px !important; }
  img { max-width: 100%; height: auto; }
  p, li, td, th, div, span { overflow-wrap: break-word; }
  .info, .assinaturas { grid-template-columns: 1fr !important; }
  .sn-rolar { overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 6px 0 12px; }
  .sn-larga { border-right: 3px solid #e2e8f0; }
  .sn-rolar > table { margin-top: 0; }
  .sn-rolar.sn-larga > table { min-width: 560px; }
  .sn-rolar > table.cronograma { min-width: 640px; }
  .sn-marca-teste span, .sn-previa span { font-size: 30px !important; }
}
</style>`;

function ajustarParaCelular(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('table').forEach((t) => {
      if (t.parentElement?.classList.contains('sn-rolar')) return;
      const faixa = doc.createElement('div');
      // Tabela de duas ou três colunas cabe na tela; só as largas ganham a faixa que desliza.
      const colunas = Math.max(0, ...Array.from(t.rows).slice(0, 3).map((r) => Array.from(r.cells).reduce((n, c) => n + (c.colSpan || 1), 0)));
      faixa.className = colunas > 3 ? 'sn-rolar sn-larga' : 'sn-rolar';
      t.replaceWith(faixa);
      faixa.appendChild(t);
    });
    doc.head.insertAdjacentHTML('beforeend', CSS_CELULAR);
    return '<!doctype html>' + doc.documentElement.outerHTML;
  } catch {
    return html;
  }
}

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

  const html = useMemo(() => (pedido ? ajustarParaCelular(pedido.html) : ''), [pedido]);

  if (!pedido) return null;

  const responder = (autorizou: boolean) => {
    pedido.responder(autorizou);
    setPedido(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/60 p-2 md:p-6" role="dialog" aria-modal="true" aria-label={`Pré-visualização: ${pedido.nome}`}>
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-card bg-white shadow-xl">
        <div className="border-b border-border px-4 py-2 md:py-3">
          <p className="text-base font-semibold text-primary">Confira o documento antes de gerar o PDF</p>
          <p className="hidden text-sm text-text/70 md:block">Leia com calma: {pedido.nome}. Se estiver tudo certo, autorize. Se não, volte e corrija.</p>
          <p className="mt-1 text-xs text-text/60 md:hidden">{pedido.nome}: leia com calma. Tabelas largas deslizam para o lado. O PDF sai em folha A4.</p>
        </div>
        {pedido.avisos.length > 0 && <AvisosAntes avisos={pedido.avisos} />}
        <iframe title={`Pré-visualização: ${pedido.nome}`} srcDoc={html} sandbox="" className="min-h-0 w-full flex-1 bg-background" />
        <div className="flex gap-2 border-t border-border p-3 sm:justify-end">
          <button type="button" onClick={() => responder(false)} className="flex-1 rounded-card border border-border bg-white px-3 py-3 text-sm font-semibold text-text hover:border-primary sm:flex-none sm:px-4">
            <span className="sm:hidden">Corrigir</span><span className="hidden sm:inline">Voltar e corrigir</span>
          </button>
          <button type="button" onClick={() => responder(true)} className="flex-1 rounded-card bg-primary px-3 py-3 text-sm font-semibold text-white hover:opacity-90 sm:flex-none sm:px-4">
            <span className="sm:hidden">Está certo, gerar</span><span className="hidden sm:inline">Está correto, gerar PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const COR_AVISO: Record<AvisoAntes['tipo'], [string, string]> = {
  FALTA: ['Falta', 'bg-danger text-white'],
  ATENCAO: ['Atenção', 'bg-[#c2410c] text-white'],
  INFO: ['Para saber', 'bg-primary/10 text-primary'],
};

// Conferência antes de gerar: o que falta no cadastro aparece aqui, sem precisar ler o documento inteiro.
// Abre sozinha quando falta algo; se for só informação, fica fechada numa linha.
function AvisosAntes({ avisos }: { avisos: AvisoAntes[] }) {
  const faltas = avisos.filter((a) => a.tipo === 'FALTA').length;
  const atencao = avisos.filter((a) => a.tipo === 'ATENCAO').length;
  const resumo = faltas || atencao
    ? [faltas && `${faltas} ${faltas === 1 ? 'coisa falta' : 'coisas faltam'}`, atencao && `${atencao} para conferir`].filter(Boolean).join(' e ')
    : 'nada falta, só informações';
  return (
    <details open={faltas + atencao > 0} className={`border-b border-border px-4 py-2 text-sm ${faltas ? 'bg-danger/5' : atencao ? 'bg-[#fff7ed]' : 'bg-background'}`}>
      <summary className="cursor-pointer font-semibold">Antes de gerar: {resumo}</summary>
      <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1 md:max-h-52">
        {avisos.map((a, i) => (
          <li key={i} className="flex gap-2">
            <span className={`h-fit shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${COR_AVISO[a.tipo][1]}`}>{COR_AVISO[a.tipo][0]}</span>
            <span>{a.texto} <span className="text-text/60">{a.corrigir}</span></span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-text/60">Dá para gerar assim mesmo. Se quiser corrigir antes, toque em &quot;Voltar e corrigir&quot;.</p>
    </details>
  );
}
