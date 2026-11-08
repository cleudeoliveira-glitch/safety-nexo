'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icone, NomeIcone } from '@/components/Icone';
import { Campo, CardNumero, Selecao } from '@/components/ui';
import { dimensionarCipa } from '@/lib/calculos/cipa';
import { dimensionarBrigada, TABELA_A1, CARGA_HORARIA } from '@/lib/calculos/brigada';
import { dimensionarSesmt } from '@/lib/calculos/sesmt';

// Calculadoras de SST: tudo é feito no próprio aparelho, então funciona até sem internet depois de aberto uma vez.
type Calc = 'cipa' | 'sesmt' | 'brigada' | 'ruido' | 'calor' | 'taxas';
const CALCS: { id: Calc; nome: string; norma: string; icone: NomeIcone }[] = [
  { id: 'cipa', nome: 'CIPA', norma: 'NR-05', icone: 'votar' },
  { id: 'sesmt', nome: 'SESMT', norma: 'NR-04', icone: 'pessoas' },
  { id: 'brigada', nome: 'Brigada de incêndio', norma: 'IT-17', icone: 'fogo' },
  { id: 'ruido', nome: 'Dose de ruído', norma: 'NR-15 e NHO-01', icone: 'sinal' },
  { id: 'calor', nome: 'Calor (IBUTG)', norma: 'NR-15 e NHO-06', icone: 'alerta' },
  { id: 'taxas', nome: 'Taxas de acidente', norma: 'NBR 14280', icone: 'grafico' },
];

const num = (v: string) => { const n = Number(v.replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const fmt = (n: number, casas = 2) => n.toLocaleString('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: 0 });

export default function Calculadoras() {
  const [aba, setAba] = useState<Calc>('cipa');
  const atual = CALCS.find((c) => c.id === aba)!;
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div>
        <Link href="/" className="text-sm text-primary">← Painel</Link>
        <h1 className="mt-2 text-2xl font-semibold text-primary">Calculadoras de SST</h1>
        <p className="text-sm text-text/60">Contas rápidas do dia a dia. Funcionam no celular e, depois de abrir uma vez, até sem internet.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" role="tablist">
        {CALCS.map((c) => (
          <button key={c.id} role="tab" aria-selected={aba === c.id} onClick={() => setAba(c.id)}
            className={`flex flex-col items-start gap-2 rounded-2xl p-4 text-left shadow-sm transition ${aba === c.id ? 'bg-primary text-white' : 'border border-border bg-white hover:border-primary/40'}`}>
            <Icone nome={c.icone} className="h-6 w-6" />
            <span className="font-semibold leading-tight">{c.nome}</span>
            <span className={`text-xs ${aba === c.id ? 'text-white/70' : 'text-text/50'}`}>{c.norma}</span>
          </button>
        ))}
      </div>
      <section className="rounded-card border border-border bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-primary">{atual.nome} <span className="text-sm font-normal text-text/50">· {atual.norma}</span></h2>
        {aba === 'cipa' && <CalcCipa />}
        {aba === 'sesmt' && <CalcSesmt />}
        {aba === 'brigada' && <CalcBrigada />}
        {aba === 'ruido' && <CalcRuido />}
        {aba === 'calor' && <CalcCalor />}
        {aba === 'taxas' && <CalcTaxas />}
      </section>
      <p className="text-xs text-text/50">As contas seguem as normas citadas em cada calculadora. Confira sempre com o texto da norma em vigor antes de usar num documento.</p>
    </main>
  );
}

function Grau({ valor, mudar, id }: { valor: string; mudar: (v: string) => void; id: string }) {
  return (
    <Selecao id={id} rotulo="Grau de risco (NR-04, pelo CNAE)" value={valor} onChange={(e) => mudar(e.target.value)}>
      {[1, 2, 3, 4].map((g) => <option key={g} value={g}>Grau {g}</option>)}
    </Selecao>
  );
}

function Resultado({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 space-y-3">{children}</div>;
}

function CalcCipa() {
  const [grau, setGrau] = useState('3');
  const [n, setN] = useState('');
  const empregados = Math.floor(num(n));
  const r = n && empregados >= 0 ? dimensionarCipa(Number(grau), empregados) : null;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Grau id="cipa-grau" valor={grau} mudar={setGrau} />
        <Campo id="cipa-n" rotulo="Número de empregados no estabelecimento" type="number" inputMode="numeric" min={0} value={n} onChange={(e) => setN(e.target.value)} placeholder="Ex.: 85" />
      </div>
      {r && (
        <Resultado>
          {r.situacao === 'CIPA' && (
            <div className="grid grid-cols-2 gap-3">
              <CardNumero tom="ok" rotulo="Efetivos" valor={r.efetivos} detalhe="eleitos pelos empregados" icone="pessoas" />
              <CardNumero tom="total" rotulo="Suplentes" valor={r.suplentes} detalhe="eleitos pelos empregados" icone="pessoas" />
            </div>
          )}
          {r.situacao === 'CIPA' && <p className="text-sm">A empresa indica o mesmo número de efetivos e suplentes (paridade). Total da CIPA: <strong>{(r.efetivos + r.suplentes) * 2} pessoas</strong>.</p>}
          {r.situacao === 'REPRESENTANTE' && <div className="card-pendente rounded-card p-4 text-sm">Não precisa montar CIPA. A empresa nomeia <strong>1 representante da NR-05</strong> (item 5.4.13). A CIPA passa a ser obrigatória a partir de {r.minimoParaCipa} empregados neste grau.</div>}
        </Resultado>
      )}
    </>
  );
}

function CalcSesmt() {
  const [grau, setGrau] = useState('3');
  const [n, setN] = useState('');
  const empregados = Math.floor(num(n));
  const r = n && empregados >= 0 ? dimensionarSesmt(Number(grau), empregados) : null;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Grau id="sesmt-grau" valor={grau} mudar={setGrau} />
        <Campo id="sesmt-n" rotulo="Número de empregados" type="number" inputMode="numeric" min={0} value={n} onChange={(e) => setN(e.target.value)} placeholder="Ex.: 600" />
      </div>
      {r && (
        <Resultado>
          {r.situacao === 'SEM_SESMT' ? (
            <div className="card-ok rounded-card p-4 text-sm">Nesta faixa ({r.faixa} empregados) o SESMT próprio não é obrigatório. A empresa pode usar SESMT compartilhado ou contratar a consultoria.</div>
          ) : (
            <>
              <p className="text-sm text-text/60">Faixa: {r.faixa} empregados</p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {r.equipe.map((p) => (
                  <li key={p.profissional} className="card-total flex items-center justify-between rounded-card p-4">
                    <span className="text-sm font-semibold">{p.nome}{p.parcial && <span className="block text-xs font-normal text-text/60">tempo parcial (mín. 3 h por dia)</span>}</span>
                    <span className="text-2xl font-bold">{p.quantidade}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="text-xs text-text/50">Base: NR-04, Anexo II. Confira o quadro da norma em vigor antes de usar num documento.</p>
        </Resultado>
      )}
    </>
  );
}

function CalcBrigada() {
  const [linha, setLinha] = useState(String(TABELA_A1.findIndex((l) => l.divisao === 'I-2')));
  const [pavimentos, setPavimentos] = useState<string[]>(['']);
  const l = TABELA_A1[Number(linha)];
  const pops = pavimentos.map((p) => Math.max(0, Math.floor(num(p) || 0)));
  const r = l && pops.some((p) => p > 0) ? dimensionarBrigada(l.divisao, l.risco, pops) : null;
  const risco = { BAIXO: 'baixo', MEDIO: 'médio', ALTO: 'alto' };
  return (
    <>
      <Selecao id="brig-div" rotulo="Ocupação (divisão e risco)" value={linha} onChange={(e) => setLinha(e.target.value)}>
        {TABELA_A1.map((x, i) => <option key={i} value={i}>{x.divisao} · {x.descricao} (risco {risco[x.risco]})</option>)}
      </Selecao>
      <div className="mt-3 space-y-2">
        <p className="text-sm font-semibold">População fixa em cada pavimento</p>
        {pavimentos.map((p, i) => (
          <div key={i} className="flex items-end gap-2">
            <Campo id={`brig-p${i}`} rotulo={`Pavimento ${i + 1}`} type="number" inputMode="numeric" min={0} value={p} className="flex-1"
              onChange={(e) => setPavimentos((xs) => xs.map((x, k) => (k === i ? e.target.value : x)))} placeholder="Pessoas" />
            {pavimentos.length > 1 && <button onClick={() => setPavimentos((xs) => xs.filter((_, k) => k !== i))} className="mb-1 rounded-card border border-border px-3 py-3 text-sm">Tirar</button>}
          </div>
        ))}
        <button onClick={() => setPavimentos((xs) => [...xs, ''])} className="rounded-card border border-border bg-white px-4 py-2 text-sm font-semibold">+ Outro pavimento</button>
      </div>
      {r && (
        <Resultado>
          {r.total === null ? <div className="card-pendente rounded-card p-4 text-sm">{r.observacao}</div> : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <CardNumero tom="ok" rotulo="Brigadistas" valor={r.total} detalhe={r.porPavimento.length > 1 ? `por pavimento: ${r.porPavimento.join(' + ')}` : 'no pavimento'} icone="fogo" />
                <CardNumero tom="total" rotulo="Treinamento" valor={r.nivel in CARGA_HORARIA ? `${CARGA_HORARIA[r.nivel as keyof typeof CARGA_HORARIA]} h` : '—'} detalhe={r.nivelTexto} icone="formatura" />
              </div>
              {r.observacao && <p className="text-sm text-text/70">{r.observacao}</p>}
            </>
          )}
          <p className="text-xs text-text/50">Base: IT 17/2025 do Corpo de Bombeiros de SP. Outros estados têm instrução própria: confira com a norma local.</p>
        </Resultado>
      )}
    </>
  );
}

function CalcRuido() {
  const [q, setQ] = useState<'5' | '3'>('5');
  const [linhas, setLinhas] = useState<{ nivel: string; horas: string }[]>([{ nivel: '', horas: '' }]);
  const fator = Number(q);
  // Tempo máximo por dia para cada nível: 8 h a 85 dB(A), dividido por 2 a cada "q" dB a mais.
  const tMax = (db: number) => 8 / 2 ** ((db - 85) / fator);
  const validas = linhas.map((l) => ({ db: num(l.nivel), h: num(l.horas) })).filter((l) => l.db > 0 && l.h > 0);
  const dose = validas.reduce((s, l) => s + l.h / tMax(l.db), 0);
  const horas = validas.reduce((s, l) => s + l.h, 0);
  // Nível equivalente para a jornada de 8 h a partir da dose.
  const ne = dose > 0 ? 85 + (fator / Math.log10(2)) * Math.log10(dose) : null;
  const tom = dose > 1 ? 'nao' : dose >= 0.5 ? 'pendente' : 'ok';
  return (
    <>
      <Selecao id="ruido-q" rotulo="Critério" value={q} onChange={(e) => setQ(e.target.value as '5' | '3')}>
        <option value="5">NR-15, Anexo 1 (dobra a cada 5 dB): insalubridade</option>
        <option value="3">NHO-01 da Fundacentro (dobra a cada 3 dB): PGR e LTCAT</option>
      </Selecao>
      <div className="mt-3 space-y-2">
        {linhas.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <Campo id={`ru-n${i}`} rotulo="Nível dB(A)" type="number" inputMode="decimal" value={l.nivel} placeholder="Ex.: 90"
              onChange={(e) => setLinhas((xs) => xs.map((x, k) => (k === i ? { ...x, nivel: e.target.value } : x)))} />
            <Campo id={`ru-h${i}`} rotulo="Horas no dia" type="number" inputMode="decimal" value={l.horas} placeholder="Ex.: 2"
              onChange={(e) => setLinhas((xs) => xs.map((x, k) => (k === i ? { ...x, horas: e.target.value } : x)))} />
            {linhas.length > 1 ? <button onClick={() => setLinhas((xs) => xs.filter((_, k) => k !== i))} className="mb-1 rounded-card border border-border px-3 py-3 text-sm">Tirar</button> : <span />}
          </div>
        ))}
        <button onClick={() => setLinhas((xs) => [...xs, { nivel: '', horas: '' }])} className="rounded-card border border-border bg-white px-4 py-2 text-sm font-semibold">+ Outro nível</button>
      </div>
      {validas.length > 0 && (
        <Resultado>
          <div className="grid grid-cols-2 gap-3">
            <CardNumero tom={tom} rotulo="Dose diária" valor={`${fmt(dose * 100, 0)}%`} detalhe={dose > 1 ? 'acima do limite' : dose >= 0.5 ? 'acima do nível de ação (50%)' : 'abaixo do nível de ação'} icone="sinal" />
            <CardNumero tom="total" rotulo="Nível equivalente (8 h)" valor={ne ? `${fmt(ne, 1)} dB(A)` : '—'} detalhe={`em ${fmt(horas, 1)} h de exposição`} icone="numero" />
          </div>
          <ul className="text-sm text-text/70">
            {validas.map((l, i) => <li key={i}>{fmt(l.db, 1)} dB(A): pode ficar até {fmt(tMax(l.db), 2)} h por dia</li>)}
          </ul>
          {q === '5' && validas.some((l) => l.db > 115) && <p className="card-nao rounded-card p-3 text-sm">Acima de 115 dB(A) sem proteção é risco grave e iminente (NR-15, Anexo 1).</p>}
        </Resultado>
      )}
    </>
  );
}

function CalcCalor() {
  const [sol, setSol] = useState<'nao' | 'sim'>('nao');
  const [tbn, setTbn] = useState('');
  const [tg, setTg] = useState('');
  const [tbs, setTbs] = useState('');
  const a = num(tbn), b = num(tg), c = num(tbs);
  const ibutg = sol === 'nao' ? (a > 0 && b > 0 ? 0.7 * a + 0.3 * b : null) : a > 0 && b > 0 && c > 0 ? 0.7 * a + 0.2 * b + 0.1 * c : null;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Selecao id="calor-sol" rotulo="Local" value={sol} onChange={(e) => setSol(e.target.value as 'nao' | 'sim')}>
          <option value="nao">Sem sol direto (interno ou à sombra)</option>
          <option value="sim">Com sol direto (externo)</option>
        </Selecao>
        <Campo id="calor-tbn" rotulo="Bulbo úmido natural (tbn) °C" type="number" inputMode="decimal" value={tbn} onChange={(e) => setTbn(e.target.value)} />
        <Campo id="calor-tg" rotulo="Globo (tg) °C" type="number" inputMode="decimal" value={tg} onChange={(e) => setTg(e.target.value)} />
        {sol === 'sim' && <Campo id="calor-tbs" rotulo="Bulbo seco (tbs) °C" type="number" inputMode="decimal" value={tbs} onChange={(e) => setTbs(e.target.value)} />}
      </div>
      {ibutg !== null && (
        <Resultado>
          <CardNumero tom="total" rotulo="IBUTG" valor={`${fmt(ibutg, 1)} °C`} detalhe={sol === 'nao' ? '0,7 × tbn + 0,3 × tg' : '0,7 × tbn + 0,2 × tg + 0,1 × tbs'} icone="alerta" />
          <p className="text-sm text-text/70">Compare com o limite do Anexo 3 da NR-15 para a taxa metabólica da atividade (quanto mais pesado o trabalho, menor o limite).</p>
        </Resultado>
      )}
    </>
  );
}

function CalcTaxas() {
  const [acid, setAcid] = useState('');
  const [dias, setDias] = useState('');
  const [hht, setHht] = useState('');
  const [func, setFunc] = useState('');
  const [horasMes, setHorasMes] = useState('176');
  const h = num(hht) > 0 ? num(hht) : num(func) > 0 && num(horasMes) > 0 ? num(func) * num(horasMes) : NaN;
  const tf = h > 0 && num(acid) >= 0 ? (num(acid) * 1_000_000) / h : null;
  const tg = h > 0 && num(dias) >= 0 ? (num(dias) * 1_000_000) / h : null;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo id="tx-ac" rotulo="Acidentes com afastamento no período" type="number" inputMode="numeric" value={acid} onChange={(e) => setAcid(e.target.value)} />
        <Campo id="tx-dias" rotulo="Dias perdidos e debitados" type="number" inputMode="numeric" value={dias} onChange={(e) => setDias(e.target.value)} />
        <Campo id="tx-hht" rotulo="Horas-homem trabalhadas (se souber)" type="number" inputMode="numeric" value={hht} onChange={(e) => setHht(e.target.value)} />
        {!(num(hht) > 0) && <>
          <Campo id="tx-func" rotulo="Ou: número de funcionários" type="number" inputMode="numeric" value={func} onChange={(e) => setFunc(e.target.value)} />
          <Campo id="tx-hm" rotulo="Horas de cada um no período" type="number" inputMode="numeric" value={horasMes} onChange={(e) => setHorasMes(e.target.value)} dica="176 h é um mês comum" />
        </>}
      </div>
      {h > 0 && (
        <Resultado>
          <div className="grid grid-cols-2 gap-3">
            <CardNumero tom={tf ? 'nao' : 'ok'} rotulo="Taxa de frequência" valor={tf === null ? '—' : fmt(tf)} detalhe="acidentes por milhão de horas" icone="grafico" />
            <CardNumero tom={tg ? 'pendente' : 'ok'} rotulo="Taxa de gravidade" valor={tg === null ? '—' : fmt(tg, 0)} detalhe="dias por milhão de horas" icone="calendario" />
          </div>
          <p className="text-xs text-text/50">Horas-homem usadas: {fmt(h, 0)}. Base: NBR 14280.</p>
        </Resultado>
      )}
    </>
  );
}
