'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buscarEmTudo, Colaborador, Empresa, listarColaboradores, ResultadoBusca } from '@/lib/api';
import { DOCUMENTOS } from '@/lib/documentos';
import { enderecoDoItem, TELAS_DO_MENU } from '@/lib/menu';
import { salvarFoco } from '@/lib/empresaFoco';

// Lupa no topo: uma busca só para achar telas, documentos, empresas e pessoas.
// Ex.: "extintor", "João", "NR-35", "CAT". Na consultoria, procura também funcionários, GHEs e terceirizadas de todas as empresas.
const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
type Achado = { chave: string; grupo: string; titulo: string; detalhe?: string; href: string; empresa?: string };

export function BuscaGeral({ empresaId, empresas, cliente, claro = false }: { empresaId: string; empresas: Empresa[] | null; cliente: boolean; claro?: boolean }) {
  const [aberta, setAberta] = useState(false);
  const [texto, setTexto] = useState('');
  const [pessoas, setPessoas] = useState<Colaborador[]>([]);
  const [deTodas, setDeTodas] = useState<ResultadoBusca | null>(null);
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

  // Busca nas outras empresas depois de uma pausa na digitação (3 letras ou mais).
  useEffect(() => {
    if (!aberta || cliente || texto.trim().length < 3) { setDeTodas(null); return; }
    const t = setTimeout(() => { buscarEmTudo(texto.trim()).then(setDeTodas).catch(() => setDeTodas(null)); }, 350);
    return () => clearTimeout(t);
  }, [aberta, cliente, texto]);

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
    const ja = new Set(lista.map((a) => a.chave));
    for (const p of deTodas?.pessoas ?? []) {
      if (ja.has(`p-${p.id}`)) continue;
      lista.push({ chave: `p-${p.id}`, grupo: 'Pessoas', titulo: p.nome, detalhe: `${p.cargo} · ${p.empresa}${p.desligado ? ' · desligado' : ''}`, href: `/empresas/${p.empresaId}/colaboradores?busca=${encodeURIComponent(p.nome)}`, empresa: p.empresaId });
    }
    for (const g of deTodas?.ghes ?? []) lista.push({ chave: `g-${g.id}`, grupo: 'GHEs', titulo: g.nome, detalhe: `${g.setor ? `${g.setor} · ` : ''}${g.empresa}`, href: `/empresas/${g.empresaId}#ghes`, empresa: g.empresaId });
    for (const t of deTodas?.terceiros ?? []) lista.push({ chave: `c-${t.id}`, grupo: 'Terceirizadas', titulo: t.nome, detalhe: t.empresa, href: `/empresas/${t.empresaId}/conectores#terceiros`, empresa: t.empresaId });
    return lista.slice(0, 50);
  }, [texto, empresaId, empresas, pessoas, cliente, deTodas]);

  const grupos = ['Telas', 'Documentos', 'Empresas', 'Pessoas', 'GHEs', 'Terceirizadas'].map((g) => [g, achados.filter((a) => a.grupo === g)] as const).filter(([, l]) => l.length);
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
              {!texto.trim() && <p className="p-2 text-sm text-text/60">Procure por tela, documento, empresa{cliente ? ' ou funcionário' : ', funcionário, GHE ou terceirizada de qualquer empresa'}.</p>}
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
