'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Icone } from '@/components/Icone';
import { DOCUMENTOS, filtrarDocumentos, GRUPOS_DOCUMENTO } from '@/lib/documentos';
import { aoMudarFoco, empresasDaConta, escolherFoco } from '@/lib/empresaFoco';
import { enderecoDoItem } from '@/lib/menu';
import { ehEmpresa, lerToken } from '@/lib/sessao';

// Emitir documento: todos os documentos do sistema num lugar só, com busca e grupos.
// Cada cartão leva à tela onde o documento é montado, já com os dados da empresa em foco.
export default function EmitirDocumento() {
  const [busca, setBusca] = useState('');
  const [grupo, setGrupo] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [cliente, setCliente] = useState(false);

  useEffect(() => {
    if (!lerToken()) { window.location.href = '/entrar'; return; }
    setCliente(ehEmpresa());
    empresasDaConta().then((lista) => {
      const id = escolherFoco(lista);
      setEmpresaId(id);
      setNomeEmpresa(lista.find((e) => e.id === id)?.razaoSocial ?? '');
    }).catch(() => undefined);
    return aoMudarFoco((id) => {
      setEmpresaId(id);
      empresasDaConta().then((lista) => setNomeEmpresa(lista.find((e) => e.id === id)?.razaoSocial ?? '')).catch(() => undefined);
    });
  }, []);

  const disponiveis = useMemo(() => DOCUMENTOS.filter((d) => !(cliente && d.soConsultoria)), [cliente]);
  const achados = filtrarDocumentos(disponiveis, busca, grupo);
  const grupos = GRUPOS_DOCUMENTO.filter((g) => disponiveis.some((d) => d.grupo === g));

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Emitir documento</h1>
        <p className="text-sm text-text/60">
          {disponiveis.length} modelos num lugar só. Escolha um e o sistema abre a tela dele
          {nomeEmpresa ? <> já com os dados de <strong>{nomeEmpresa}</strong></> : ''}: riscos, GHEs, EPIs e colaboradores entram sozinhos.
        </p>
      </div>

      <div className="space-y-3 rounded-card border border-border bg-white p-4 shadow-sm">
        <label htmlFor="busca-doc" className="sr-only">Buscar documento</label>
        <div className="flex items-center gap-2 rounded-card border border-border bg-background px-3.5">
          <Icone nome="lupa" className="h-5 w-5 text-text/40" />
          <input id="busca-doc" autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite o nome, a sigla ou a NR. Ex.: altura, PCMSO, NR-12"
            className="w-full bg-transparent py-3 outline-none" />
          {busca && <button type="button" onClick={() => setBusca('')} className="text-sm text-text/50 hover:text-primary">Limpar</button>}
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Grupos de documentos">
          {['', ...grupos].map((g) => (
            <button key={g || 'todos'} type="button" role="tab" aria-selected={grupo === g} onClick={() => setGrupo(g)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${grupo === g ? 'bg-primary text-white' : 'border border-border bg-white text-text/80 hover:border-primary'}`}>
              {g || 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {!empresaId && (
        <p className="rounded-card border border-warning/40 bg-white px-4 py-3 text-sm text-[#c2410c]">
          Cadastre uma empresa primeiro: os documentos saem com os dados dela. <Link href="/empresas/nova" className="font-semibold underline">Cadastrar empresa</Link>
        </p>
      )}

      {achados.length === 0 ? (
        <p className="rounded-card border border-border bg-white px-4 py-6 text-center text-sm text-text/60">Nenhum documento com &quot;{busca}&quot;. Tente outra palavra.</p>
      ) : (
        (grupo ? [grupo] : grupos).map((g) => {
          const doGrupo = achados.filter((d) => d.grupo === g);
          if (!doGrupo.length) return null;
          return (
            <section key={g}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text/50">{g}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {doGrupo.map((d) => (
                  <Link key={`${d.sigla}-${d.nome}`} href={d.geral || empresaId ? enderecoDoItem(d, empresaId) : '/empresas/nova'}
                    className="group flex gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#168a7f] text-white shadow-sm">
                      <Icone nome={d.icone} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">{d.sigla}</span>
                        <span className="text-xs text-text/50">{d.norma}</span>
                      </span>
                      <span className="mt-1 block font-semibold text-text group-hover:text-primary">{d.nome}</span>
                      <span className="block text-xs text-text/60">{d.texto}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })
      )}
    </main>
  );
}
