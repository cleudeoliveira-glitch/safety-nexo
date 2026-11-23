'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Colaborador, Empresa, listarColaboradores } from '@/lib/api';
import { DOCUMENTOS } from '@/lib/documentos';
import { enderecoDoItem, TELAS_DO_MENU } from '@/lib/menu';
import { salvarFoco } from '@/lib/empresaFoco';

// Lupa no topo: uma busca só para achar telas, documentos, empresas e pessoas.
// Ex.: "extintor", "João", "NR-35", "CAT". Procura só no que já está no aparelho e nos funcionários da empresa em foco.
const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
type Achado = { chave: string; grupo: string; titulo: string; detalhe?: string; href: string; empresa?: string };

export function BuscaGeral({ empresaId, empresas, cliente, claro = false }: { empresaId: string; empresas: Empresa[] | null; cliente: boolean; claro?: boolean }) {
  const [aberta, setAberta] = useState(false);
  const [texto, setTexto] = useState('');
  const [pessoas, setPessoas] = useState<Colaborador[]>([]);
  const campo = useRef<HTMLInputElement>(null);

  // Ctrl+K ou "/" abre a busca no computador (só a lupa do menu lateral escuta, para não abrir duas).
  useEffect(() => {
    if (!claro) return;
    const tecla = (e: KeyboardEvent) => {
      const digitando = (e.target as HTMLElement)?.closest('input, textarea, select, [contenteditable]');
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !digitando)) { e.preventDefault(); setAberta(true); }
      if (e.key === 'Escape') setAberta(false);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [claro]);

  useEffect(() => {
    if (!aberta) return;
    setTimeout(() => campo.current?.focus(), 50);
    if (empresaId) listarColaboradores(empresaId).then(setPessoas).catch(() => setPessoas([]));
  }, [aberta, empresaId]);

  const achados = useMemo<Achado[]>(() => {
    const termos = semAcento(texto).split(/\s+/).filter(Boolean);
    if (!termos.length) return [];
    const bate = (...partes: (string | null | undefined)[]) => { const alvo = semAcento(partes.filter(Boolean).join(' ')); return termos.every((t) => alvo.includes(t)); };
    const lista: Achado[] = [];
    for (const t of TELAS_DO_MENU) {
      if (cliente && t.soConsultoria) continue;
      if (bate(t.nome, t.rota.replace(/[/#-]/g, ' '))) lista.push({ chave: `t-${t.nome}-${t.rota}`, grupo: 'Telas', titulo: t.nome, href: enderecoDoItem(t, empresaId) });
    }
    for (const d of DOCUMENTOS) {
      if (cliente && d.soConsultoria) continue;
      if (bate(d.sigla, d.nome, d.norma, d.buscar)) lista.push({ chave: `d-${d.sigla}`, grupo: 'Documentos', titulo: `${d.sigla}: ${d.nome}`, detalhe: d.norma, href: d.geral ? d.rota : empresaId ? `/empresas/${empresaId}${d.rota}` : '/emitir' });
    }
    for (const e of empresas ?? []) {
      if (bate(e.razaoSocial, e.cnpj)) lista.push({ chave: `e-${e.id}`, grupo: 'Empresas', titulo: e.razaoSocial, detalhe: e.cnpj ?? undefined, href: `/?empresa=${e.id}`, empresa: e.id });
    }
    for (const p of pessoas) {
      if (bate(p.nome, p.cargo, p.matricula, p.cpf)) lista.push({ chave: `p-${p.id}`, grupo: 'Pessoas', titulo: p.nome, detalhe: p.cargo, href: `/empresas/${empresaId}/colaboradores?busca=${encodeURIComponent(p.nome)}` });
    }
    return lista.slice(0, 30);
  }, [texto, empresaId, empresas, pessoas, cliente]);

  const grupos = ['Telas', 'Documentos', 'Empresas', 'Pessoas'].map((g) => [g, achados.filter((a) => a.grupo === g)] as const).filter(([, l]) => l.length);
  const fechar = () => { setAberta(false); setTexto(''); };

  return (
    <>
      <button type="button" onClick={() => setAberta(true)} aria-label="Procurar no sistema" title="Procurar (Ctrl+K)"
        className={claro
          ? 'flex w-full items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-left text-sm text-white/70 ring-1 ring-white/10 hover:bg-white/15'
          : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg hover:bg-white/25'}>
        <span aria-hidden="true">🔍</span>{claro && <span>Procurar… <span className="text-white/40">(Ctrl+K)</span></span>}
      </button>
      {aberta && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-0 md:p-10" onClick={fechar}>
          <div role="dialog" aria-label="Procurar no sistema" onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full flex-col bg-white text-text shadow-2xl md:h-auto md:max-h-[80vh] md:max-w-xl md:rounded-2xl">
            <div className="flex items-center gap-2 border-b border-border p-3">
              <input ref={campo} type="search" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="O que você procura?"
                placeholder="Ex.: extintor, João, NR-35, CAT" className="campo-sn min-h-[48px] flex-1 px-3 text-base" />
              <button type="button" onClick={fechar} className="min-h-[48px] px-3 text-sm font-semibold text-primary">Fechar</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {!texto.trim() && <p className="p-2 text-sm text-text/60">Procure por tela, documento, empresa ou funcionário{empresaId ? ' da empresa em foco' : ''}.</p>}
              {texto.trim() && !achados.length && <p className="p-2 text-sm text-text/60">Nada com &quot;{texto}&quot;. Tente outra palavra.</p>}
              {grupos.map(([g, lista]) => (
                <div key={g} className="mb-3">
                  <p className="px-2 text-xs font-semibold uppercase tracking-wider text-text/50">{g}</p>
                  <ul>
                    {lista.map((a) => (
                      <li key={a.chave}>
                        <Link href={a.href} onClick={() => { if (a.empresa) salvarFoco(a.empresa); fechar(); }}
                          className="flex min-h-[48px] flex-col justify-center rounded-lg px-2 py-1.5 hover:bg-primary/5">
                          <span className="font-semibold">{a.titulo}</span>
                          {a.detalhe && <span className="text-xs text-text/60">{a.detalhe}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
