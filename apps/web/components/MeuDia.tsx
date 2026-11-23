'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Dds, estoque, Inspecao, listarDds, listarInspecoes, listarPermissoes, Permissao, sugestoesDds, SugestoesDds, TrocasEpi } from '@/lib/api';

// "Meu dia": o que precisa de atenção hoje nesta empresa, com um botão que já abre o formulário certo.
// Junta: PT aberta ou vencendo, o DDS do dia (com o tema sugerido pelos riscos), inspeções marcadas
// para os próximos 7 dias e EPI para trocar. Cada parte que não carregar simplesmente não aparece.
type Linha = { chave: string; icone: string; titulo: string; detalhe: string; botao: string; href: string; urgente?: boolean };

const hojeIso = () => new Date().toLocaleDateString('sv-SE'); // AAAA-MM-DD no fuso do aparelho
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dia = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' });

export function MeuDia({ empresaId }: { empresaId: string }) {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);

  useEffect(() => {
    let vivo = true;
    setLinhas(null);
    const ou = <T,>(p: Promise<T>) => p.catch(() => null);
    Promise.all([
      ou(listarPermissoes(empresaId)), ou(listarDds(empresaId)), ou(sugestoesDds(empresaId)),
      ou(listarInspecoes(empresaId)), ou(estoque.trocas(empresaId, 7)),
    ]).then(([pts, dds, sug, insp, trocas]) => { if (vivo) setLinhas(montar(pts, dds, sug, insp, trocas)); });
    return () => { vivo = false; };
  }, [empresaId]);

  const base = `/empresas/${empresaId}`;
  return (
    <section className="mb-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Meu dia nesta empresa</h2>
      <p className="text-sm text-text/60">O que pede atenção hoje. Toque no botão e o formulário já abre.</p>
      {linhas === null && <p className="mt-3 text-sm text-text/50">Buscando o que tem para hoje…</p>}
      {linhas?.length === 0 && <p className="mt-3 rounded-xl bg-success/10 px-4 py-3 text-sm text-success">Nada pendente para hoje em campo. 🎉</p>}
      <ul className="mt-3 space-y-2">
        {linhas?.map((l) => (
          <li key={l.chave} className={`flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 ${l.urgente ? 'border-danger/40 bg-danger/5' : 'border-border'}`}>
            <span className="text-xl" aria-hidden="true">{l.icone}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{l.titulo}</p>
              <p className="text-sm text-text/60">{l.detalhe}</p>
            </div>
            <Link href={`${base}${l.href}`} className="inline-flex min-h-[44px] items-center rounded-card bg-primary px-4 text-sm font-semibold text-white">{l.botao}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function montar(pts: Permissao[] | null, dds: Dds[] | null, sug: SugestoesDds | null, insp: Inspecao[] | null, trocas: TrocasEpi | null): Linha[] {
  const linhas: Linha[] = [];
  const agora = Date.now();
  const hoje = hojeIso();

  for (const p of pts ?? []) {
    if (p.encerradaEm) continue;
    const fim = new Date(p.fim).getTime();
    if (fim <= agora) linhas.push({ chave: `pt-${p.id}`, icone: '⛔', titulo: `PT nº ${p.numero} venceu às ${hora(p.fim)}`, detalhe: `${p.atividade} · ${p.local}. Encerre a permissão.`, botao: 'Encerrar', href: '/operacao#pt', urgente: true });
    else if (fim - agora <= 12 * 3600000) linhas.push({ chave: `pt-${p.id}`, icone: '⏱️', titulo: `PT nº ${p.numero} aberta até ${hora(p.fim)}`, detalhe: `${p.atividade} · ${p.local}`, botao: 'Ver PT', href: '/operacao#pt', urgente: fim - agora <= 30 * 60000 });
  }

  if (dds && !dds.some((d) => d.data.slice(0, 10) === hoje)) {
    const s = sug?.sugestoes[0];
    linhas.push(s
      ? { chave: 'dds', icone: '🗣️', titulo: `DDS de hoje: ${s.tema}`, detalhe: s.motivo, botao: 'Fazer o DDS', href: `/operacao?tema=${encodeURIComponent(s.tema)}#dds` }
      : { chave: 'dds', icone: '🗣️', titulo: 'Ainda não teve DDS hoje', detalhe: 'Escolha um tema e colha as assinaturas.', botao: 'Fazer o DDS', href: '/operacao#dds' });
  }

  const limite = new Date(Date.now() + 7 * 86400000).toLocaleDateString('sv-SE');
  // Para cada local, só a inspeção mais recente decide quando voltar.
  const ultimaPorLocal = new Map<string, Inspecao>();
  for (const i of insp ?? []) {
    const k = `${i.modelo}|${(i.local ?? '').toLowerCase()}`;
    const atual = ultimaPorLocal.get(k);
    if (!atual || i.data > atual.data) ultimaPorLocal.set(k, i);
  }
  for (const i of ultimaPorLocal.values()) {
    const prox = i.proximaInspecao?.slice(0, 10);
    if (!prox || prox > limite) continue;
    const atrasada = prox < hoje;
    linhas.push({ chave: `insp-${i.id}`, icone: '🔎', titulo: `${atrasada ? 'Inspeção atrasada' : 'Inspeção marcada'}: ${i.titulo}`, detalhe: `${i.local ? `${i.local} · ` : ''}${atrasada ? 'era para' : 'para'} ${dia(i.proximaInspecao!)}`, botao: 'Inspecionar', href: '/operacao#checklist', urgente: atrasada });
  }

  const paraTrocar = trocas?.trocas ?? [];
  if (paraTrocar.length) {
    const atrasadas = paraTrocar.filter((t) => t.atrasada).length;
    const pessoas = new Set(paraTrocar.map((t) => t.colaboradorId)).size;
    linhas.push({ chave: 'epi', icone: '🦺', titulo: `Trocar EPI de ${pessoas} pessoa${pessoas > 1 ? 's' : ''}`, detalhe: atrasadas ? `${atrasadas} troca(s) já passaram do prazo.` : 'Trocas previstas para os próximos 7 dias.', botao: 'Ver trocas', href: '/almoxarifado', urgente: atrasadas > 0 });
  }

  return linhas.sort((a, b) => Number(!!b.urgente) - Number(!!a.urgente));
}
