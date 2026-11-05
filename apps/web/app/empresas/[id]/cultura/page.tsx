'use client';

import Link from 'next/link';
import { useAbaDoEndereco } from '@/lib/abaDoEndereco';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import { Auditoria5s, buscarEmpresa, cincoS, Colaborador, Empresa, Ghe, listarColaboradores, listarGhes, salvarArquivo, Senso, Sipat, sipat } from '@/lib/api';

type Aba = 'sipat' | '5s';
type Agir = (f: () => Promise<string>) => Promise<void>;
const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const texto = (d: FormData, c: string) => String(d.get(c) ?? '').trim();

function AbaSipat({ empresaId, colaboradores, agir, baixar }: { empresaId: string; colaboradores: Colaborador[]; agir: Agir; baixar: (g: () => Promise<Blob>, n: string) => void }) {
  const [lista, setLista] = useState<Sipat[]>([]);
  const [presenca, setPresenca] = useState<{ sipat: string; ativ: string; marcados: Set<string> } | null>(null);
  const [chave, setChave] = useState(0);
  const carregar = useCallback(async () => setLista(await sipat.listar(empresaId)), [empresaId]);
  useEffect(() => { carregar().catch(() => undefined); }, [carregar]);
  const fazer: Agir = async (f) => { await agir(async () => { const m = await f(); setChave((k) => k + 1); await carregar(); return m; }); };

  return (
    <div className="space-y-6">
      <Cartao titulo="Nova SIPAT">
        <p className="mb-4 text-sm text-text/60">A Semana Interna de Prevenção de Acidentes do Trabalho é organizada todo ano pela CIPA. Monte a programação, imprima o cartaz e marque quem participou.</p>
        <form key={chave} className="grid gap-4 md:grid-cols-4" onSubmit={(ev) => {
          ev.preventDefault(); const d = new FormData(ev.currentTarget);
          fazer(async () => { await sipat.criar(empresaId, { ano: Number(texto(d, 'inicio').slice(0, 4)), tema: texto(d, 'tema'), inicio: texto(d, 'inicio'), fim: texto(d, 'fim') }); return 'SIPAT criada. Agora inclua as atividades.'; });
        }}>
          <Campo id="sp-tema" name="tema" rotulo="Tema" required className="md:col-span-2" placeholder="Ex.: Segurança começa por você" />
          <Campo id="sp-ini" name="inicio" type="date" rotulo="Primeiro dia" required />
          <Campo id="sp-fim" name="fim" type="date" rotulo="Último dia" required />
          <div className="flex justify-end md:col-span-4"><Botao type="submit">Criar SIPAT</Botao></div>
        </form>
      </Cartao>

      {lista.map((s) => (
        <Cartao key={s.id} titulo={`SIPAT ${s.ano} · ${s.tema}`} acao={
          <div className="flex flex-wrap gap-2">
            <Botao variante="secundario" onClick={() => baixar(() => sipat.programacao(empresaId, s.id), `SIPAT-${s.ano}-programacao`)}>Programação (PDF)</Botao>
            <Botao variante="secundario" onClick={() => baixar(() => sipat.relatorio(empresaId, s.id), `SIPAT-${s.ano}-relatorio`)}>Relatório (PDF)</Botao>
          </div>}>
          <p className="mb-3 text-sm text-text/60">De {data(s.inicio)} a {data(s.fim)} · {s.atividades.length} atividade(s) · {new Set(s.atividades.flatMap((a) => a.presentes)).size} de {colaboradores.length} funcionário(s) participaram</p>
          {s.atividades.length > 0 && (
            <ul className="mb-4 divide-y divide-border text-sm">
              {s.atividades.map((a) => (
                <li key={a.id} className="py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span><strong>{data(a.data)} {a.horario}</strong> · {a.titulo} · {a.responsavel} · {a.local}</span>
                    <span className="flex flex-wrap gap-3">
                      <button className="text-primary underline" onClick={() => setPresenca(presenca?.ativ === a.id ? null : { sipat: s.id, ativ: a.id, marcados: new Set(a.presentes) })}>Presença ({a.presentes.length})</button>
                      <button className="text-primary underline" onClick={() => baixar(() => sipat.lista(empresaId, s.id, a.id), 'SIPAT-lista-de-presenca')}>Lista para assinar</button>
                      <button className="text-danger underline" onClick={() => fazer(async () => { await sipat.removerAtividade(empresaId, s.id, a.id); return 'Atividade tirada.'; })}>Tirar</button>
                    </span>
                  </div>
                  {presenca?.ativ === a.id && (
                    <div className="mt-2 rounded-card border border-border bg-background p-3">
                      <div className="grid gap-1 sm:grid-cols-2 md:grid-cols-3">
                        {colaboradores.map((c) => (
                          <label key={c.id} className="flex items-center gap-2">
                            <input type="checkbox" checked={presenca.marcados.has(c.id)} onChange={(e) => { const m = new Set(presenca.marcados); if (e.target.checked) m.add(c.id); else m.delete(c.id); setPresenca({ ...presenca, marcados: m }); }} />
                            {c.nome}
                          </label>
                        ))}
                      </div>
                      <div className="mt-2 flex justify-end"><Botao onClick={() => fazer(async () => { const r = await sipat.presenca(empresaId, s.id, a.id, [...presenca.marcados]); setPresenca(null); return `${r.presentes} presença(s) registrada(s).`; })}>Salvar presença</Botao></div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <form className="grid gap-3 md:grid-cols-6" onSubmit={(ev) => {
            ev.preventDefault(); const d = new FormData(ev.currentTarget);
            fazer(async () => { await sipat.atividade(empresaId, s.id, { data: texto(d, 'data'), horario: texto(d, 'horario'), titulo: texto(d, 'titulo'), responsavel: texto(d, 'resp'), local: texto(d, 'local'), duracaoMin: Number(texto(d, 'dur') || 60) }); return 'Atividade incluída.'; });
          }}>
            <Campo id={`sa-data-${s.id}`} name="data" type="date" rotulo="Dia" required min={s.inicio.slice(0, 10)} max={s.fim.slice(0, 10)} />
            <Campo id={`sa-hora-${s.id}`} name="horario" type="time" rotulo="Horário" required />
            <Campo id={`sa-tit-${s.id}`} name="titulo" rotulo="Atividade" required className="md:col-span-2" placeholder="Ex.: Palestra sobre ergonomia" />
            <Campo id={`sa-resp-${s.id}`} name="resp" rotulo="Com quem" required />
            <Campo id={`sa-local-${s.id}`} name="local" rotulo="Local" required />
            <Campo id={`sa-dur-${s.id}`} name="dur" type="number" min={5} rotulo="Duração (min)" defaultValue={60} />
            <div className="flex items-end justify-end md:col-span-5"><Botao type="submit" variante="secundario">Incluir atividade</Botao></div>
          </form>
        </Cartao>
      ))}
    </div>
  );
}

function Aba5s({ empresaId, ghes, agir, baixar }: { empresaId: string; ghes: Ghe[]; agir: Agir; baixar: (g: () => Promise<Blob>, n: string) => void }) {
  const [sensos, setSensos] = useState<Senso[]>([]);
  const [escala, setEscala] = useState<{ valor: number; rotulo: string }[]>([]);
  const [lista, setLista] = useState<Auditoria5s[]>([]);
  const [notas, setNotas] = useState<Record<string, number>>({});
  const [chave, setChave] = useState(0);
  const carregar = useCallback(async () => setLista(await cincoS.listar(empresaId)), [empresaId]);
  useEffect(() => { cincoS.checklist(empresaId).then((c) => { setSensos(c.sensos); setEscala(c.escala); }).catch(() => undefined); carregar().catch(() => undefined); }, [empresaId, carregar]);
  const total = sensos.reduce((n, s) => n + s.itens.length, 0);
  const setores = [...new Set(lista.map((a) => a.setor))];

  return (
    <div className="space-y-6">
      {setores.length > 0 && (
        <Cartao titulo="Evolução por setor">
          <div className="space-y-4">
            {setores.map((setor) => {
              const doSetor = lista.filter((a) => a.setor === setor);
              return (
                <div key={setor}>
                  <p className="mb-1 text-sm font-semibold">{setor}</p>
                  <div className="flex items-end gap-2">
                    {doSetor.map((a) => (
                      <div key={a.id} className="flex w-16 flex-col items-center gap-1">
                        <span className="text-xs font-semibold">{a.resultado.total}%</span>
                        <div className="w-full rounded-t bg-primary" style={{ height: `${Math.max(a.resultado.total, 2) * 0.8}px` }} />
                        <span className="text-[10px] text-text/60">{data(a.data)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Cartao>
      )}

      <Cartao titulo="Nova auditoria 5S">
        <form key={chave} className="space-y-5" onSubmit={(ev) => {
          ev.preventDefault(); const d = new FormData(ev.currentTarget);
          agir(async () => {
            if (Object.keys(notas).length < total) throw new Error(`Dê nota a todos os itens. Faltam ${total - Object.keys(notas).length}.`);
            await cincoS.criar(empresaId, { setor: texto(d, 'setor'), data: texto(d, 'data'), auditor: texto(d, 'auditor'), notas, observacoes: texto(d, 'obs') || undefined });
            setNotas({}); setChave((k) => k + 1); await carregar(); return 'Auditoria registrada.';
          });
        }}>
          <div className="grid gap-4 md:grid-cols-3">
            <Selecao id="a5-setor" name="setor" rotulo="Setor" required><option value="">Escolha</option>{ghes.map((g) => <option key={g.id}>{g.nome}</option>)}</Selecao>
            <Campo id="a5-data" name="data" type="date" rotulo="Data" required defaultValue={hoje()} />
            <Campo id="a5-aud" name="auditor" rotulo="Quem auditou" required />
          </div>
          {sensos.map((s) => (
            <div key={s.id}>
              <h3 className="mb-2 font-semibold text-primary">{s.nome}</h3>
              <ul className="space-y-2">
                {s.itens.map((item, i) => {
                  const k = `${s.id}-${i + 1}`;
                  return (
                    <li key={k} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 flex-1">{item}</span>
                      <span className="flex gap-1" role="radiogroup" aria-label={item}>
                        {escala.map((o) => (
                          <button key={o.valor} type="button" title={o.rotulo} role="radio" aria-checked={notas[k] === o.valor} onClick={() => setNotas({ ...notas, [k]: o.valor })}
                            className={`h-8 w-8 rounded-full text-xs font-semibold ${notas[k] === o.valor ? 'bg-primary text-white' : 'border border-border bg-white'}`}>{o.valor}</button>
                        ))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <p className="text-xs text-text/60">{escala.map((o) => `${o.valor} = ${o.rotulo}`).join(' · ')}</p>
          <Campo id="a5-obs" name="obs" rotulo="Observações" />
          <div className="flex justify-end"><Botao type="submit">Registrar auditoria</Botao></div>
        </form>
      </Cartao>

      {lista.length > 0 && (
        <Cartao titulo="Auditorias">
          <ul className="divide-y divide-border text-sm">
            {[...lista].reverse().map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span><strong>{a.setor}</strong> · {data(a.data)} · {a.auditor} · nota {a.resultado.total}%</span>
                <span className="flex gap-3">
                  <button className="text-primary underline" onClick={() => baixar(() => cincoS.pdf(empresaId, a.id), `Auditoria-5S-${a.setor}`)}>PDF</button>
                  <button className="text-danger underline" onClick={() => confirm('Apagar esta auditoria?') && agir(async () => { await cincoS.remover(empresaId, a.id); await carregar(); return 'Auditoria apagada.'; })}>Apagar</button>
                </span>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </div>
  );
}

export default function CulturaPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [aba, setAba] = useState<Aba>('sipat');
  useAbaDoEndereco<Aba>(['sipat', '5s'], setAba);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [ghes, setGhes] = useState<Ghe[]>([]);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  useEffect(() => {
    Promise.all([buscarEmpresa(empresaId), listarColaboradores(empresaId), listarGhes(empresaId)]).then(([e, c, g]) => { setEmpresa(e); setColaboradores(c); setGhes(g); }).catch((e: Error) => setAviso({ tipo: 'erro', texto: e.message }));
  }, [empresaId]);
  const agir: Agir = async (f) => { try { setAviso({ tipo: 'ok', texto: await f() }); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); } };
  const baixar = (g: () => Promise<Blob>, n: string) => agir(async () => { salvarArquivo(await g(), `${n}.pdf`); return 'PDF baixado. Uma cópia ficou no arquivo de documentos.'; });

  if (!empresa) return <main className="p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando…'}</main>;
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div>
        <Link href={`/?empresa=${empresaId}`} className="text-sm text-primary">← Voltar ao painel</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">SIPAT e 5S</h1>
        <p className="text-text/60">{empresa.razaoSocial} · <Link href={`/empresas/${empresaId}/treinamentos`} className="text-primary hover:underline">Treinamentos →</Link> · <Link href={`/empresas/${empresaId}/cipa`} className="text-primary hover:underline">CIPA →</Link></p>
      </div>
      <div role="tablist" className="flex flex-wrap gap-2">
        {([['sipat', 'SIPAT'], ['5s', 'Auditoria 5S']] as [Aba, string][]).map(([v, n]) => (
          <button key={v} role="tab" aria-selected={aba === v} onClick={() => { setAba(v); setAviso(null); history.replaceState(null, '', `#${v}`); }}
            className={`rounded-card px-4 py-2 text-sm font-semibold ${aba === v ? 'bg-primary text-white' : 'border border-border bg-white'}`}>{n}</button>
        ))}
      </div>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      {aba === 'sipat' ? <AbaSipat empresaId={empresaId} colaboradores={colaboradores} agir={agir} baixar={baixar} /> : <Aba5s empresaId={empresaId} ghes={ghes} agir={agir} baixar={baixar} />}
    </main>
  );
}
