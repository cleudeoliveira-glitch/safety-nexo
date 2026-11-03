'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Cartao } from '@/components/ui';
import { Empresa, listarEmpresas, MesSsma, PainelSsma, salvarArquivo, ssma } from '@/lib/api';
import { ehEmpresa } from '@/lib/sessao';

// Cores dos gráficos conferidas no validador de paleta (contraste e daltonismo).
const S1 = '#0a8fae'; const S2 = '#eb6834';
const n = (v: number | null, d = 2) => (v == null ? '-' : v.toLocaleString('pt-BR', { maximumFractionDigits: d }));
const real = (v: number | null) => (v == null ? '-' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const rotMes = (m: string) => { const [a, mm] = m.split('-'); return `${mm}/${a.slice(2)}`; };
const mesAtual = () => new Date().toISOString().slice(0, 7);

function Anel({ valor }: { valor: number | null }) {
  const r = 70, c = 2 * Math.PI * r, f = (valor ?? 0) / 100;
  return (
    <svg viewBox="0 0 180 180" className="h-44 w-44" role="img" aria-label={`Saúde da empresa ${valor ?? '-'}%`}>
      <circle cx="90" cy="90" r={r} fill="none" stroke="#e5e7eb" strokeWidth="16" />
      <circle cx="90" cy="90" r={r} fill="none" stroke="#10B981" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${f * c} ${c}`} transform="rotate(-90 90 90)" />
      <text x="90" y="92" textAnchor="middle" className="fill-text text-4xl font-semibold">{valor == null ? '-' : `${valor}%`}</text>
      <text x="90" y="116" textAnchor="middle" className="fill-text/60 text-xs">em dia</text>
    </svg>
  );
}

function Variacao({ v }: { v: number | null }) {
  if (v == null) return <span className="text-xs text-text/50">sem mês anterior para comparar</span>;
  if (v === 0) return <span className="text-xs text-text/60">igual ao mês anterior</span>;
  // Para acidente, subir é ruim: vermelho com ▲; cair é bom: verde com ▼.
  return <span className={`text-xs font-semibold ${v > 0 ? 'text-danger' : 'text-success'}`}>{v > 0 ? '▲' : '▼'} {n(Math.abs(v), 1)}% vs. mês anterior</span>;
}

function Linha({ titulo, serie, campo }: { titulo: string; serie: MesSsma[]; campo: 'tf' | 'tg' }) {
  const [foco, setFoco] = useState<number | null>(null);
  const W = 520, H = 200, x0 = 44, y0 = 14, w = 460, h = 150;
  const vals = serie.map((s) => s[campo]);
  const max = Math.max(1, ...vals.map((v) => v ?? 0)) * 1.15;
  const x = (i: number) => x0 + (i * w) / Math.max(1, serie.length - 1);
  const y = (v: number) => y0 + h - (v / max) * h;
  const ult = serie.length - 1;
  return (
    <figure>
      <figcaption className="mb-2 text-sm font-semibold">{titulo}</figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setFoco(null)} role="img" aria-label={titulo}>
          {[0, 0.5, 1].map((t) => <g key={t}><line x1={x0} x2={x0 + w} y1={y((max * t) / 1.15)} y2={y((max * t) / 1.15)} stroke="#eef0f2" /><text x={x0 - 6} y={y((max * t) / 1.15) + 4} fontSize="10" textAnchor="end" fill="#52514e">{n((max * t) / 1.15, 0)}</text></g>)}
          {serie.map((s, i) => <text key={s.mes} x={x(i)} y={H - 8} fontSize="10" textAnchor="middle" fill="#52514e">{i % 2 === ult % 2 ? rotMes(s.mes) : ''}</text>)}
          <polyline fill="none" stroke={S1} strokeWidth="2" points={vals.map((v, i) => (v == null ? '' : `${x(i)},${y(v)}`)).join(' ')} />
          {foco != null && <line x1={x(foco)} x2={x(foco)} y1={y0} y2={y0 + h} stroke="#c3c2b7" strokeDasharray="3 3" />}
          {vals.map((v, i) => v == null ? null : <circle key={i} cx={x(i)} cy={y(v)} r={foco === i ? 5 : 3.5} fill={S1} stroke="#fff" strokeWidth="2" />)}
          {vals[ult] != null && <text x={x(ult) - 6} y={y(vals[ult] as number) - 10} fontSize="11" textAnchor="end" fill="#0b0b0b">{n(vals[ult])}</text>}
          {serie.map((_, i) => <rect key={i} x={x(i) - w / serie.length / 2} y={y0} width={w / serie.length} height={h} fill="transparent" onMouseEnter={() => setFoco(i)} />)}
        </svg>
        {foco != null && (
          <div className="pointer-events-none absolute top-0 rounded-card border border-border bg-white px-3 py-2 text-xs shadow" style={{ left: `${(x(foco) / W) * 100}%`, transform: foco > ult / 2 ? 'translateX(-105%)' : 'translateX(5%)' }}>
            <p className="font-semibold">{rotMes(serie[foco].mes)}</p>
            <p>{campo.toUpperCase()}: {n(serie[foco][campo])}</p>
            <p className="text-text/60">{serie[foco].acidentes} acidente(s) · {serie[foco].diasPerdidos} dia(s) perdidos</p>
            <p className="text-text/60">HHT {n(serie[foco].hht, 0)}{serie[foco].hhtEstimado ? ' (estimado)' : ''}</p>
          </div>
        )}
      </div>
    </figure>
  );
}

function Rosquinha({ com, sem }: { com: number; sem: number }) {
  const total = com + sem, r = 54, c = 2 * Math.PI * r, f = total ? com / total : 0;
  if (!total) return <p className="text-sm text-text/60">Nenhum acidente nos 12 meses.</p>;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-36 w-36" role="img" aria-label={`${com} com afastamento e ${sem} sem afastamento`}>
        <circle cx="70" cy="70" r={r} fill="none" stroke={S1} strokeWidth="20"><title>Sem afastamento: {sem}</title></circle>
        {com > 0 && <circle cx="70" cy="70" r={r} fill="none" stroke={S2} strokeWidth="20" strokeDasharray={`${f * c - (sem ? 2 : 0)} ${c}`} transform="rotate(-90 70 70)"><title>Com afastamento: {com}</title></circle>}
        <text x="70" y="76" textAnchor="middle" fontSize="22" fontWeight="600" fill="#0b0b0b">{total}</text>
      </svg>
      <ul className="space-y-2 text-sm">
        <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ background: S2 }} />Com afastamento: <strong>{com}</strong></li>
        <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ background: S1 }} />Sem afastamento: <strong>{sem}</strong></li>
      </ul>
    </div>
  );
}

function Barras({ itens }: { itens: { nome: string; acidentes: number }[] }) {
  if (!itens.length) return <p className="text-sm text-text/60">Nenhum acidente nos 12 meses.</p>;
  const max = Math.max(...itens.map((i) => i.acidentes));
  return (
    <ul className="space-y-2">
      {itens.map((i) => (
        <li key={i.nome} className="grid grid-cols-[140px_1fr] items-center gap-3 text-sm" title={`${i.nome}: ${i.acidentes} acidente(s)`}>
          <span className="truncate">{i.nome}</span>
          <span className="flex items-center gap-2"><span className="h-3 rounded" style={{ width: `${Math.max(2, (i.acidentes / max) * 100)}%`, background: S1 }} />{i.acidentes}</span>
        </li>
      ))}
    </ul>
  );
}

export default function SsmaPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const router = useRouter();
  const [d, setD] = useState<PainelSsma | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cliente, setCliente] = useState(false);
  const [fim, setFim] = useState(mesAtual());
  const [gheId, setGheId] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  const [verTabela, setVerTabela] = useState(false);

  const carregar = useCallback(async () => {
    try { setD(await ssma.montar(empresaId, { fim, gheId })); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }, [empresaId, fim, gheId]);
  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { const c = ehEmpresa(); setCliente(c); if (!c) listarEmpresas().then(setEmpresas).catch(() => undefined); }, []);

  const agir = async (f: () => Promise<string>) => { try { setAviso({ tipo: 'ok', texto: await f() }); await carregar(); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); } };

  if (!d) return <main className="p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando…'}</main>;
  const a = d.atual, e = d.estrategico;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <div>
        <Link href={`/?empresa=${empresaId}`} className="text-sm text-primary">← Voltar ao painel</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Painel SSMA</h1>
        <p className="text-text/60">Indicadores de segurança e saúde, calculados com o que está registrado no sistema.</p>
      </div>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <div className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-white p-4">
        {!cliente && empresas.length > 1 && (
          <label className="text-sm font-semibold">Empresa
            <select className="mt-1 block rounded-card border border-border bg-background px-3 py-2 text-sm font-normal" value={empresaId} onChange={(ev) => router.push(`/empresas/${ev.target.value}/ssma`)}>
              {empresas.map((x) => <option key={x.id} value={x.id}>{x.razaoSocial}</option>)}
            </select>
          </label>
        )}
        <label className="text-sm font-semibold">Setor (GHE)
          <select className="mt-1 block rounded-card border border-border bg-background px-3 py-2 text-sm font-normal" value={gheId} onChange={(ev) => setGheId(ev.target.value)}>
            <option value="">Todos</option>{d.setores.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Até o mês
          <input type="month" className="mt-1 block rounded-card border border-border bg-background px-3 py-2 text-sm font-normal" value={fim} max={mesAtual()} onChange={(ev) => ev.target.value && setFim(ev.target.value)} />
        </label>
        <span className="pb-2 text-xs text-text/60">mostra os 12 meses até o mês escolhido</span>
        <div className="ml-auto"><Botao variante="secundario" onClick={() => agir(async () => { salvarArquivo(await ssma.pdf(empresaId, { fim, gheId }), 'SSMA-painel.pdf'); return 'PDF baixado. Uma cópia ficou no arquivo de documentos.'; })}>Baixar PDF</Botao></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <Cartao titulo="Saúde da empresa">
          <div className="flex flex-col items-center"><Anel valor={d.saude} /><p className="mt-2 max-w-[200px] text-center text-xs text-text/60">Média dos itens em dia ao lado. Item sem registro fica de fora.</p></div>
        </Cartao>
        <Cartao titulo="O que está em dia hoje">
          <ul className="space-y-3">
            {d.emDia.map((x) => (
              <li key={x.item} className="grid grid-cols-[180px_1fr_70px] items-center gap-3 text-sm">
                <span>{x.item}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-border/60">{x.pct != null && <span className="block h-full rounded-full" style={{ width: `${x.pct}%`, background: x.pct >= 90 ? '#10B981' : x.pct >= 60 ? '#eda100' : '#EF4444' }} />}</span>
                <span className="text-right">{x.pct == null ? <span className="text-text/50">sem registro</span> : <><strong>{x.pct}%</strong> <span className="text-xs text-text/50">{x.ok}/{x.de}</span></>}</span>
              </li>
            ))}
          </ul>
        </Cartao>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Cartao titulo={`Taxa de frequência (${rotMes(a.mes)})`}><p className="text-4xl font-semibold">{n(a.tf)}</p><Variacao v={a.variacaoTf} /><p className="mt-2 text-xs text-text/60">{a.acidentes} acidente(s) × 1.000.000 ÷ {n(a.hht, 0)} h{a.hhtEstimado ? ' (estimado)' : ''}</p></Cartao>
        <Cartao titulo={`Taxa de gravidade (${rotMes(a.mes)})`}><p className="text-4xl font-semibold">{n(a.tg)}</p><Variacao v={a.variacaoTg} /><p className="mt-2 text-xs text-text/60">{a.diasPerdidos} dia(s) perdidos × 1.000.000 ÷ {n(a.hht, 0)} h</p></Cartao>
        <Cartao titulo="Efeito do FAP na folha">
          {e.fap?.diferencaMensal != null ? (<><p className={`text-4xl font-semibold ${e.fap.diferencaMensal <= 0 ? 'text-success' : 'text-danger'}`}>{real(Math.abs(e.fap.diferencaMensal))}</p><p className="text-xs text-text/60">{e.fap.diferencaMensal <= 0 ? 'de economia' : 'a mais'} por mês · FAP {n(e.fap.fap, 4)} ({e.fap.ano})</p></>)
            : <p className="text-sm text-text/60">Informe o FAP e a folha em <Link className="text-primary underline" href={`/empresas/${empresaId}/fap`}>FAP e RAT</Link>.</p>}
        </Cartao>
      </div>

      <Cartao titulo="Evolução em 12 meses" acao={<button className="text-sm text-primary underline" onClick={() => setVerTabela(!verTabela)}>{verTabela ? 'Ver gráficos' : 'Ver como tabela'}</button>}>
        {verTabela ? (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-text/60"><th className="py-1">Mês</th><th>Acidentes</th><th>Com afast.</th><th>Dias perdidos</th><th>HHT</th><th>TF</th><th>TG</th></tr></thead>
            <tbody className="divide-y divide-border">{d.serie.map((s) => <tr key={s.mes}><td className="py-1">{rotMes(s.mes)}</td><td>{s.acidentes}</td><td>{s.comAfastamento}</td><td>{s.diasPerdidos}</td><td>{n(s.hht, 0)}{s.hhtEstimado ? '*' : ''}</td><td>{n(s.tf)}</td><td>{n(s.tg)}</td></tr>)}</tbody>
          </table><p className="mt-1 text-xs text-text/50">* horas estimadas</p></div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2"><Linha titulo="Taxa de frequência (TF)" serie={d.serie} campo="tf" /><Linha titulo="Taxa de gravidade (TG)" serie={d.serie} campo="tg" /></div>
        )}
      </Cartao>

      <div className="grid gap-6 md:grid-cols-2">
        <Cartao titulo="Acidentes com e sem afastamento (12 meses)"><Rosquinha com={d.afastamento.com} sem={d.afastamento.sem} /></Cartao>
        <Cartao titulo="Setores que mais acidentam (12 meses)"><Barras itens={d.ranking} /></Cartao>
      </div>

      <Cartao titulo="Estratégico">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-card bg-background p-4"><p className="text-xs text-text/60">Absenteísmo no mês</p><p className="text-2xl font-semibold">{e.custoAbsenteismoMes != null ? real(e.custoAbsenteismoMes) : `${e.diasAtestadoMes} dia(s)`}</p><p className="text-xs text-text/60">{e.diasAtestadoMes} dia(s) de atestado</p></div>
          <div className="rounded-card bg-background p-4"><p className="text-xs text-text/60">Absenteísmo em 12 meses</p><p className="text-2xl font-semibold">{e.custoAbsenteismo12 != null ? real(e.custoAbsenteismo12) : `${e.diasAtestado12} dia(s)`}</p><p className="text-xs text-text/60">{e.cids.length ? `Mais dias: ${e.cids.slice(0, 3).map((c) => `${c.cid} (${c.dias})`).join(', ')}` : 'sem CID informado'}</p></div>
          <div className="rounded-card bg-background p-4"><p className="text-xs text-text/60">Dias pagos pelo INSS (12 meses)</p><p className="text-2xl font-semibold">{e.diasInss12}</p><p className="text-xs text-text/60">a partir do 16º dia de cada afastamento</p></div>
          <div className="rounded-card bg-background p-4"><p className="text-xs text-text/60">Setor com mais acidentes</p><p className="text-2xl font-semibold">{e.setorMaisCat?.nome ?? '-'}</p><p className="text-xs text-text/60">{e.setorMaisCat ? `${e.setorMaisCat.acidentes} acidente(s)` : 'nenhum no período'}</p></div>
        </div>
        {e.custoAbsenteismoMes == null && <p className="mt-3 text-xs text-warning">Para ver o absenteísmo em reais, informe o custo médio de um dia de falta abaixo.</p>}
      </Cartao>

      {!cliente && (
        <Cartao titulo="Dados para o cálculo">
          <div className="grid gap-6 md:grid-cols-2">
            <form className="flex flex-wrap items-end gap-3" onSubmit={(ev) => { ev.preventDefault(); const v = String(new FormData(ev.currentTarget).get('custo') ?? '').trim();
              agir(async () => { const num = v ? Number(v.replace(/\./g, '').replace(',', '.')) : null; if (num != null && Number.isNaN(num)) throw new Error('Valor inválido. Ex.: 185,50'); await ssma.config(empresaId, num); return 'Custo do dia de falta guardado.'; }); }}>
              <label className="text-sm font-semibold">Custo médio de um dia de falta (R$)
                <input name="custo" inputMode="decimal" defaultValue={d.empresa.custoDiaFalta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) ?? ''} placeholder="Ex.: 185,50" className="mt-1 block rounded-card border border-border bg-background px-3 py-2 text-sm font-normal" />
              </label>
              <Botao type="submit" variante="secundario">Guardar</Botao>
              <p className="w-full text-xs text-text/60">Salário com encargos dividido pelos dias de trabalho, ou o valor que a empresa usar.</p>
            </form>
            <form className="flex flex-wrap items-end gap-3" onSubmit={(ev) => { ev.preventDefault(); const fd = new FormData(ev.currentTarget); const mes = String(fd.get('mes')); const v = String(fd.get('horas') ?? '').trim();
              agir(async () => { const num = v ? Number(v.replace(/\./g, '').replace(',', '.')) : null; if (num != null && Number.isNaN(num)) throw new Error('Horas inválidas.'); await ssma.horas(empresaId, mes, num); return num == null ? `Horas de ${rotMes(mes)} voltaram a ser estimadas.` : `Horas de ${rotMes(mes)} guardadas.`; }); }}>
              <label className="text-sm font-semibold">Mês<input name="mes" type="month" defaultValue={fim} className="mt-1 block rounded-card border border-border bg-background px-3 py-2 text-sm font-normal" /></label>
              <label className="text-sm font-semibold">Horas trabalhadas (HHT)<input name="horas" inputMode="decimal" placeholder="Ex.: 17.600" className="mt-1 block w-36 rounded-card border border-border bg-background px-3 py-2 text-sm font-normal" /></label>
              <Botao type="submit" variante="secundario">Guardar</Botao>
              <p className="w-full text-xs text-text/60">Sem as horas do mês, o sistema estima: funcionários × jornada de {n(d.empresa.jornadaDiariaHoras, 1)} h × dias úteis. Deixe vazio e guarde para voltar à estimativa.</p>
            </form>
          </div>
        </Cartao>
      )}
    </main>
  );
}
