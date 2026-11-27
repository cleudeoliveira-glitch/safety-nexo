'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { carregarAgenda, ItemAgenda } from '@/lib/api';
import { resolverEm } from '@/lib/menu';
import { salvarFoco } from '@/lib/empresaFoco';

// Calendário do mês: o que vence ou tem prazo em cada dia, em todas as empresas.
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const COR: Record<ItemAgenda['tipo'], string> = { Documento: 'bg-primary', ASO: 'bg-success', 'Ação do plano': 'bg-warning', Treinamento: 'bg-[#7C3AED]' };
const doisDig = (n: number) => String(n).padStart(2, '0');

export function CalendarioMes() {
  const hoje = new Date();
  const [mes, setMes] = useState({ ano: hoje.getFullYear(), m: hoje.getMonth() });
  const [itens, setItens] = useState<ItemAgenda[] | null>(null);
  const [erro, setErro] = useState('');
  const [dia, setDia] = useState<string | null>(null);
  const hojeIso = `${hoje.getFullYear()}-${doisDig(hoje.getMonth() + 1)}-${doisDig(hoje.getDate())}`;

  useEffect(() => {
    const ultimo = new Date(mes.ano, mes.m + 1, 0).getDate();
    const de = `${mes.ano}-${doisDig(mes.m + 1)}-01`, ate = `${mes.ano}-${doisDig(mes.m + 1)}-${doisDig(ultimo)}`;
    setItens(null); setErro(''); setDia(null);
    carregarAgenda(de, ate).then(setItens).catch((e: Error) => setErro(e.message));
  }, [mes]);

  const porDia = useMemo(() => {
    const m = new Map<string, ItemAgenda[]>();
    for (const i of itens ?? []) m.set(i.data, [...(m.get(i.data) ?? []), i]);
    return m;
  }, [itens]);

  const primeiro = new Date(mes.ano, mes.m, 1).getDay();
  const total = new Date(mes.ano, mes.m + 1, 0).getDate();
  const casas: (number | null)[] = [...Array(primeiro).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  const iso = (d: number) => `${mes.ano}-${doisDig(mes.m + 1)}-${doisDig(d)}`;
  const andar = (n: number) => setMes(({ ano, m }) => { const x = new Date(ano, m + n, 1); return { ano: x.getFullYear(), m: x.getMonth() }; });
  const lista = dia ? porDia.get(dia) ?? [] : itens ?? [];

  return (
    <section className="rounded-card border border-border bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-primary">Calendário de {MESES[mes.m]} de {mes.ano}</h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => andar(-1)} className="min-h-[44px] rounded-card border border-border px-3 text-sm font-semibold text-primary">← Anterior</button>
          <button type="button" onClick={() => setMes({ ano: hoje.getFullYear(), m: hoje.getMonth() })} className="min-h-[44px] rounded-card border border-border px-3 text-sm font-semibold text-primary">Hoje</button>
          <button type="button" onClick={() => andar(1)} className="min-h-[44px] rounded-card border border-border px-3 text-sm font-semibold text-primary">Próximo →</button>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-text/70">
        {(Object.keys(COR) as ItemAgenda['tipo'][]).map((t) => <span key={t} className="flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded-full ${COR[t]}`} />{t === 'Treinamento' ? 'Reciclagem de treinamento' : t === 'ASO' ? 'Exame (ASO)' : t === 'Documento' ? 'Documento vence' : t}</span>)}
      </div>
      {erro && <p className="text-sm text-danger">{erro}</p>}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {SEMANA.map((s) => <div key={s} className="py-1 font-semibold uppercase text-text/50">{s}</div>)}
        {casas.map((d, k) => {
          if (d === null) return <div key={`v${k}`} />;
          const doDia = porDia.get(iso(d)) ?? [];
          const tipos = [...new Set(doDia.map((i) => i.tipo))];
          const escolhido = dia === iso(d);
          return (
            <button key={d} type="button" onClick={() => setDia(escolhido ? null : iso(d))} aria-label={`${d} de ${MESES[mes.m]}: ${doDia.length} item(ns)`}
              className={`flex min-h-[52px] flex-col items-center justify-start rounded-lg border p-1 ${escolhido ? 'border-primary bg-primary/10' : 'border-border'} ${iso(d) === hojeIso ? 'font-bold text-primary' : ''}`}>
              <span>{d}</span>
              {doDia.length > 0 && (
                <span className="mt-1 flex flex-wrap justify-center gap-0.5">
                  {tipos.map((t) => <span key={t} className={`h-2 w-2 rounded-full ${COR[t]}`} />)}
                  {doDia.length > 1 && <span className="text-[10px] text-text/60">{doDia.length}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold text-text/70">{dia ? `Dia ${dia.split('-').reverse().join('/')}` : 'Tudo deste mês'}{itens ? ` · ${lista.length} item(ns)` : ''}</p>
        {!itens && !erro && <div className="h-16 animate-pulse rounded-card bg-background" />}
        {itens && !lista.length && <p className="text-sm text-text/60">Nada vence {dia ? 'neste dia' : 'neste mês'}.</p>}
        <ul className="divide-y divide-border text-sm">
          {lista.map((i, k) => {
            const href = resolverEm(i.rota, i.empresaId, false);
            const atrasado = i.data < hojeIso;
            return (
              <li key={k} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="flex items-start gap-2">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${COR[i.tipo]}`} />
                  <span>
                    <span className="font-semibold">{i.titulo}</span>
                    <span className="block text-xs text-text/60">{i.empresa} · {i.data.split('-').reverse().join('/')}{atrasado ? ' · já passou' : ''}</span>
                  </span>
                </span>
                {href && <Link href={href} onClick={() => salvarFoco(i.empresaId)} className="text-xs font-semibold text-primary hover:underline">Abrir</Link>}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
