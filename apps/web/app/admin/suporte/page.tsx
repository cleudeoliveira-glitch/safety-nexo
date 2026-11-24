'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AbasAdm } from '@/components/AbasAdm';
import { Aviso, Botao } from '@/components/ui';
import { admin, PedidoSuporteAdm, StatusSuporte } from '@/lib/api';

const TIPO = { PROBLEMA: 'Algo deu errado', DUVIDA: 'Dúvida', SUGESTAO: 'Sugestão' } as const;
const SITUACAO: Record<StatusSuporte, { nome: string; cor: string }> = {
  ABERTO: { nome: 'Sem resposta', cor: 'bg-warning/15 text-[#9a3412]' },
  RESPONDIDO: { nome: 'Respondido', cor: 'bg-primary/10 text-primary' },
  RESOLVIDO: { nome: 'Resolvido', cor: 'bg-success/15 text-success' },
};
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

// Painel ADM: o que os clientes mandaram pelo botão "Relatar problema". Cada pedido novo também avisa no celular.
export default function AdminSuportePage() {
  const [itens, setItens] = useState<PedidoSuporteAdm[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'abertos' | 'todos'>('abertos');

  useEffect(() => { admin.suporte().then(setItens).catch((e: Error) => setErro(e.message)); }, []);

  const trocar = (p: PedidoSuporteAdm) => setItens((l) => (l ?? []).map((x) => (x.id === p.id ? { ...x, ...p } : x)));
  const abertos = (itens ?? []).filter((p) => p.status === 'ABERTO');
  const mostrar = filtro === 'abertos' ? abertos : itens ?? [];

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-10">
      <div>
        <Link href="/" className="text-sm text-primary">← Voltar à minha consultoria</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Painel ADM da plataforma</h1>
        <p className="text-text/60">O que os clientes mandaram pelo botão “Relatar problema”. Cada pedido novo também chega no seu celular.</p>
      </div>
      <AbasAdm />
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <div className="flex gap-2">
        {([['abertos', `Sem resposta (${abertos.length})`], ['todos', `Todos (${itens?.length ?? 0})`]] as const).map(([v, n]) => (
          <button key={v} type="button" onClick={() => setFiltro(v)}
            className={`rounded-card px-4 py-2 text-sm font-semibold ${filtro === v ? 'bg-primary text-white' : 'border border-border bg-white text-primary'}`}>{n}</button>
        ))}
      </div>

      {itens === null && !erro && <p className="text-sm text-text/60">Carregando…</p>}
      {itens && mostrar.length === 0 && (
        <p className="rounded-card border border-border bg-white p-5 text-sm text-text/70">{filtro === 'abertos' ? 'Nenhum pedido esperando resposta. Tudo em dia!' : 'Nenhum cliente mandou pedido ainda.'}</p>
      )}
      <div className="space-y-3">
        {mostrar.map((p) => <Pedido key={p.id} p={p} aoMudar={trocar} />)}
      </div>
    </main>
  );
}

function Pedido({ p, aoMudar }: { p: PedidoSuporteAdm; aoMudar: (p: PedidoSuporteAdm) => void }) {
  const [resposta, setResposta] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(d: { resposta?: string; status?: StatusSuporte }) {
    setOcupado(true); setErro(null);
    try {
      const r = await admin.responderSuporte(p.id, d);
      aoMudar({ ...p, ...r });
      setResposta('');
    } catch (e) { setErro((e as Error).message); } finally { setOcupado(false); }
  }

  return (
    <article className="rounded-card border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-semibold ${SITUACAO[p.status].cor}`}>{SITUACAO[p.status].nome}</span>
        <span className="font-semibold">{TIPO[p.tipo]}</span>
        <span className="text-text/60">{quando(p.createdAt)}</span>
      </div>
      <p className="mt-2 text-sm font-semibold">
        {p.usuario?.nome ?? 'Usuário apagado'} · {p.consultoria ?? '—'}
        {p.usuario?.papel === 'EMPRESA' && <span className="font-normal text-text/60"> (empresa cliente da consultoria)</span>}
      </p>
      {p.usuario?.email && <a href={`mailto:${p.usuario.email}`} className="text-xs text-primary underline">{p.usuario.email}</a>}
      {p.tela && <p className="mt-1 text-xs text-text/60">Tela: {p.tela}</p>}
      <p className="mt-2 whitespace-pre-line rounded-card bg-background p-3 text-sm">{p.mensagem}</p>
      {p.resposta && (
        <p className="mt-2 whitespace-pre-line border-l-4 border-primary pl-3 text-sm"><b>Sua resposta:</b> {p.resposta}</p>
      )}
      <div className="mt-3 space-y-2">
        <label htmlFor={`resp-${p.id}`} className="sr-only">Responder</label>
        <textarea id={`resp-${p.id}`} rows={2} value={resposta} onChange={(e) => setResposta(e.target.value)} maxLength={3000}
          placeholder="Escreva a resposta. O cliente vê no sistema e recebe por e-mail." className="campo-sn block w-full" />
        <div className="flex flex-wrap gap-2">
          <Botao onClick={() => salvar({ resposta })} disabled={ocupado || !resposta.trim()}>Responder</Botao>
          {p.status !== 'RESOLVIDO'
            ? <Botao variante="secundario" onClick={() => salvar({ status: 'RESOLVIDO' })} disabled={ocupado}>Marcar resolvido</Botao>
            : <Botao variante="secundario" onClick={() => salvar({ status: 'ABERTO' })} disabled={ocupado}>Reabrir</Botao>}
        </div>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
      </div>
    </article>
  );
}
