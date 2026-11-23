'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AbasAdm } from '@/components/AbasAdm';
import { DoutorNexo } from '@/components/DoutorNexo';
import { Aviso } from '@/components/ui';
import { admin, Diagnostico, ItemDiagnostico, SituacaoDiagnostico } from '@/lib/api';
import { lerToken } from '@/lib/sessao';

const PASSOS = ['Conferindo o motor', 'Conferindo o banco (Supabase)', 'Olhando os cadastros', 'Conferindo os pagamentos do Asaas', 'Lendo os erros recentes', 'Abrindo o site'];
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    // Navegador sem permissão de área de transferência: copia do jeito antigo.
    const area = document.createElement('textarea');
    area.value = texto;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

function Sinal({ situacao, resolvido }: { situacao: SituacaoDiagnostico; resolvido?: boolean }) {
  const cor = situacao === 'ok' ? 'bg-success' : situacao === 'atencao' ? 'bg-amber-500' : 'bg-danger';
  const marca = situacao === 'ok' ? '✓' : situacao === 'atencao' ? '!' : '✕';
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white ${cor} ${resolvido ? 'ring-4 ring-emerald-200' : ''}`} aria-label={situacao === 'ok' ? 'Funcionando' : situacao === 'atencao' ? 'Atenção' : 'Precisa de conserto'}>
      {marca}
    </span>
  );
}

function BotaoCopiar({ texto, rotulo, cheio = false }: { texto: string; rotulo: string; cheio?: boolean }) {
  const [feito, setFeito] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => { await copiar(texto); setFeito(true); setTimeout(() => setFeito(false), 2500); }}
      className={`whitespace-nowrap rounded-lg border border-primary px-3 py-2 text-sm font-semibold transition ${cheio || feito ? 'bg-primary text-white' : 'bg-white text-primary hover:bg-primary/5'}`}
    >
      {feito ? '✓ Copiado' : rotulo}
    </button>
  );
}

function Item({ item, aoResolver }: { item: ItemDiagnostico; aoResolver: (id: string) => void }) {
  const [verPedido, setVerPedido] = useState(false);
  const [verLista, setVerLista] = useState(false);
  const temLista = !!item.detalhes?.length;
  return (
    <article className="rounded-card border border-border bg-white p-4">
      <div className="flex gap-3">
        <Sinal situacao={item.situacao} resolvido={item.resolvido} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-semibold">{item.titulo}</h3>
            {item.resolvido && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Resolvido</span>}
            <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-text/50">{item.grupo}</span>
          </div>
          <p className="mt-0.5 text-sm text-text/70">{item.resumo}</p>

          {item.comoResolver && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"><strong>Você mesmo resolve:</strong> {item.comoResolver}</p>
          )}

          {temLista && (
            <div className="mt-2">
              <button type="button" onClick={() => setVerLista(!verLista)} className="text-sm font-semibold text-primary">
                {verLista ? 'Esconder a lista' : `Ver a lista (${item.detalhes!.length})`}
              </button>
              {verLista && (
                <ul className="mt-1 max-h-64 list-disc space-y-0.5 overflow-auto pl-5 text-sm text-text/70">
                  {item.detalhes!.map((d, i) => <li key={i} className="break-words">{d}</li>)}
                </ul>
              )}
            </div>
          )}

          {item.pedido && verPedido && (
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100">{item.pedido}</pre>
          )}

          {(item.pedido || item.falhaId) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.pedido && <BotaoCopiar texto={item.pedido} rotulo="Copiar pedido para o Claude" />}
              {item.pedido && (
                <button type="button" onClick={() => setVerPedido(!verPedido)} className="rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5">
                  {verPedido ? 'Esconder o pedido' : 'Ver o pedido'}
                </button>
              )}
              {item.falhaId && (
                <button type="button" onClick={() => aoResolver(item.falhaId!)} className="rounded-lg px-3 py-2 text-sm font-semibold text-success hover:bg-emerald-50">
                  ✓ Já foi resolvido
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// Diagnóstico do Painel ADM: a cada clique, o "Doutor Nexo" examina o sistema inteiro e lista o que está ok e o que precisa de conserto.
export default function DiagnosticoPage() {
  const [d, setD] = useState<Diagnostico | null>(null);
  const [rodando, setRodando] = useState(false);
  const [passo, setPasso] = useState(0);
  const [erro, setErro] = useState('');

  async function varrer() {
    setRodando(true);
    setErro('');
    setPasso(0);
    const relogio = setInterval(() => setPasso((p) => Math.min(p + 1, PASSOS.length - 1)), 700);
    try {
      setD(await admin.diagnostico());
    } catch (e) {
      setErro(`${(e as Error).message} Se o motor estiver desligado (o Render gratuito dorme sem uso), espere uns 40 segundos e clique de novo.`);
    } finally {
      clearInterval(relogio);
      setRodando(false);
    }
  }

  async function resolver(id: string) {
    try {
      await admin.resolverFalha(id);
    } catch (e) {
      setErro((e as Error).message);
    }
    varrer();
  }

  useEffect(() => {
    if (!lerToken()) { window.location.href = '/entrar'; return; }
    varrer();
  }, []);

  const por = (s: SituacaoDiagnostico) => (d?.itens ?? []).filter((i) => i.situacao === s);
  const funcionando = [...por('ok')].sort((a, b) => Number(!!b.resolvido) - Number(!!a.resolvido));
  const saude = d?.saude ?? 0;
  const corSaude = saude >= 85 ? '#10B981' : saude >= 60 ? '#f59e0b' : '#EF4444';

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-10">
      <div>
        <Link href="/" className="text-sm text-primary">← Voltar à minha consultoria</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Painel ADM da plataforma</h1>
        <p className="text-text/60">Só você vê esta tela.</p>
      </div>
      <AbasAdm />

      <section className="flex flex-col gap-5 rounded-2xl bg-gradient-to-br from-primary to-[#14697f] p-5 text-white md:flex-row md:items-center md:p-6">
        <DoutorNexo tamanho={76} batimento className={`shrink-0 ${rodando ? 'animate-pulse' : ''}`} />
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{rodando ? 'Doutor Nexo está examinando o sistema…' : d ? 'Doutor Nexo examinou o sistema' : 'Doutor Nexo'}</h2>
          <p className="mt-1 text-sm text-white/80">
            {rodando
              ? `${PASSOS[passo]}…`
              : d
                ? `Varredura de ${quando(d.feitoEm)}, levou ${(d.levouMs / 1000).toFixed(1)} s. Olhei o motor, o banco, os cadastros, os pagamentos, os erros das últimas 48 horas e o site.`
                : 'Clique em "Fazer varredura" para examinar o sistema.'}
          </p>
        </div>
        {d && !rodando && (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(${corSaude} 0 ${saude}%, rgba(255,255,255,.18) 0)` }}>
            <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-[#115567]">
              <span className="text-2xl font-extrabold leading-none">{saude}%</span>
              <span className="text-[10px] text-white/70">saúde</span>
            </div>
          </div>
        )}
        <button type="button" onClick={varrer} disabled={rodando} className="rounded-xl bg-success px-5 py-3 font-bold text-white shadow transition hover:opacity-90 disabled:opacity-60">
          {rodando ? 'Examinando…' : '⟳ Fazer varredura agora'}
        </button>
      </section>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {d && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
            {([
              ['falha', d.totais.falha, 'precisam de conserto', false],
              ['atencao', d.totais.atencao, 'pedem atenção', false],
              ['ok', d.totais.ok, 'estão funcionando', false],
              ['ok', d.totais.resolvidos, 'resolvidos desde a última vez', true],
            ] as const).map(([s, n, texto, resolvido]) => (
              <div key={texto} className="flex items-center gap-3 rounded-card border border-border bg-white px-4 py-3">
                <Sinal situacao={s} resolvido={resolvido} />
                <div><b className="block text-2xl leading-tight">{n}</b><span className="text-sm text-text/60">{texto}</span></div>
              </div>
            ))}
            <div className="flex items-center">
              {d.pedidoGeral
                ? <BotaoCopiar texto={d.pedidoGeral} rotulo="Copiar tudo para o Claude" cheio />
                : <p className="text-sm font-semibold text-success">Nada para mandar ao Claude agora.</p>}
            </div>
          </section>

          {!d.totais.falha && !d.totais.atencao && (
            <Aviso tipo="ok">Tudo funcionando. Nenhum problema encontrado nesta varredura.</Aviso>
          )}

          {[
            ['Precisa de conserto', por('falha')],
            ['Pede atenção', por('atencao')],
            ['Funcionando', funcionando],
          ].map(([titulo, lista]) => (lista as ItemDiagnostico[]).length ? (
            <section key={titulo as string} className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text/50">{titulo as string}</h2>
              {(lista as ItemDiagnostico[]).map((i) => <Item key={i.id} item={i} aoResolver={resolver} />)}
            </section>
          ) : null)}

          <p className="text-xs text-text/50">
            Como usar: copie o pedido do problema e cole numa conversa com o Claude. Depois que ele resolver, clique em &quot;Fazer varredura agora&quot;: o item fica verde com a etiqueta &quot;Resolvido&quot;.
            Nos erros que os clientes viram, clique em &quot;Já foi resolvido&quot; depois da correção. Se o erro voltar a acontecer, ele aparece de novo.
          </p>
        </>
      )}
    </main>
  );
}
