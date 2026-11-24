'use client';

import { useEffect, useState } from 'react';
import { AreaTexto, Aviso, Botao } from '@/components/ui';
import { PedidoSuporte, suporte, TipoSuporte } from '@/lib/api';

const TIPOS: { id: TipoSuporte; nome: string; exemplo: string }[] = [
  { id: 'PROBLEMA', nome: 'Algo deu errado', exemplo: 'Ex.: cliquei em Gerar PDF do PGR e apareceu uma mensagem de erro.' },
  { id: 'DUVIDA', nome: 'Tenho uma dúvida', exemplo: 'Ex.: onde eu cadastro o médico do PCMSO?' },
  { id: 'SUGESTAO', nome: 'Sugestão', exemplo: 'Ex.: seria bom ter um campo para o turno do colaborador.' },
];
const SITUACAO: Record<PedidoSuporte['status'], { nome: string; cor: string }> = {
  ABERTO: { nome: 'Recebido, vamos olhar', cor: 'bg-warning/15 text-[#9a3412]' },
  RESPONDIDO: { nome: 'Respondido', cor: 'bg-primary/10 text-primary' },
  RESOLVIDO: { nome: 'Resolvido', cor: 'bg-success/15 text-success' },
};
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

// "Relatar problema": o cliente conta o que aconteceu. O aviso chega na hora no celular da equipe do Safety Nexo.
export default function SuportePage() {
  const [tipo, setTipo] = useState<TipoSuporte>('PROBLEMA');
  const [mensagem, setMensagem] = useState('');
  const [tela, setTela] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [meus, setMeus] = useState<PedidoSuporte[] | null>(null);

  useEffect(() => {
    // A tela em que a pessoa estava vem no endereço (?tela=) ou de onde ela veio.
    const daUrl = new URLSearchParams(window.location.search).get('tela');
    let deOnde = '';
    try { const r = document.referrer ? new URL(document.referrer) : null; if (r && r.origin === window.location.origin && r.pathname !== '/suporte') deOnde = r.pathname; } catch { /* sem origem */ }
    setTela((daUrl || deOnde).slice(0, 300));
    suporte.meus().then(setMeus).catch(() => setMeus([]));
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true); setAviso(null);
    try {
      const p = await suporte.enviar({ tipo, mensagem, tela: tela || undefined });
      setMeus((m) => [p, ...(m ?? [])]);
      setMensagem('');
      setAviso({ tipo: 'ok', texto: 'Recebemos! A equipe do Safety Nexo já foi avisada no celular. A resposta aparece aqui embaixo e no seu e-mail.' });
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    } finally { setEnviando(false); }
  }

  const escolhido = TIPOS.find((t) => t.id === tipo)!;
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <section className="fundo-destaque rounded-3xl p-6 text-white shadow-lg shadow-primary/20 md:p-8">
        <h1 className="text-2xl font-bold md:text-3xl">Relatar problema</h1>
        <p className="mt-2 max-w-2xl text-white/85">Deu algum erro, ficou com dúvida ou tem uma ideia? Conte aqui. O aviso chega na hora para a equipe do Safety Nexo.</p>
      </section>

      <form onSubmit={enviar} className="space-y-4 rounded-card border border-border bg-white p-5 shadow-sm">
        <div role="radiogroup" aria-label="O que aconteceu" className="grid gap-2 sm:grid-cols-3">
          {TIPOS.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={tipo === t.id} onClick={() => setTipo(t.id)}
              className={`rounded-card px-3 py-3 text-sm font-semibold ${tipo === t.id ? 'bg-primary text-white' : 'border border-border bg-white text-primary hover:border-primary'}`}>
              {t.nome}
            </button>
          ))}
        </div>
        <AreaTexto id="suporte-msg" rotulo="Conte o que aconteceu" rows={4} required minLength={5} maxLength={3000}
          value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder={escolhido.exemplo}
          dica={tela ? `Tela em que você estava: ${tela}` : 'Se puder, diga em qual tela foi e o que você tinha clicado.'} />
        <Botao type="submit" disabled={enviando || mensagem.trim().length < 5}>{enviando ? 'Enviando…' : 'Enviar para a equipe'}</Botao>
        {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-primary">O que você já mandou</h2>
        {meus === null && <p className="text-sm text-text/60">Carregando…</p>}
        {meus?.length === 0 && <p className="text-sm text-text/60">Nenhum pedido ainda.</p>}
        {meus?.map((p) => (
          <article key={p.id} className="rounded-card border border-border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 font-semibold ${SITUACAO[p.status].cor}`}>{SITUACAO[p.status].nome}</span>
              <span className="text-text/60">{TIPOS.find((t) => t.id === p.tipo)?.nome} · {quando(p.createdAt)}</span>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm">{p.mensagem}</p>
            {p.resposta && (
              <div className="mt-3 rounded-card border-l-4 border-primary bg-background p-3 text-sm">
                <p className="text-xs font-semibold text-primary">Resposta da equipe{p.respondidoEm ? ` · ${quando(p.respondidoEm)}` : ''}</p>
                <p className="mt-1 whitespace-pre-line">{p.resposta}</p>
              </div>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
