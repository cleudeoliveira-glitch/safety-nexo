'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import { AvaliacaoPs, buscarEmpresa, DimensaoPs, Empresa, LinhaPs, psicossocial, QuestionarioPs, ResultadoPs } from '@/lib/api';

const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const Etiqueta = ({ cor, children }: { cor: string; children: React.ReactNode }) => <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cor}`}>{children}</span>;
const fmt = (d: DimensaoPs, v: number | null | undefined) => (v === null || v === undefined ? '—' : d.tipo === 'casos' ? `${v.toLocaleString('pt-BR')}%` : v.toLocaleString('pt-BR'));

// Intensidade da cor proporcional ao valor (0 a 100% nos casos). Não classifica em "baixo/alto":
// faixas de risco só entram quando o questionário validado trouxer as dele.
function corCelula(d: DimensaoPs, v: number | null | undefined) {
  if (v === null || v === undefined) return { background: '#F3F4F6' };
  const frac = d.tipo === 'casos' ? v / 100 : 0.5;
  const f = d.maiorEPior ? frac : 1 - frac;
  return { background: `rgba(239, 68, 68, ${0.08 + f * 0.6})` };
}

function Resultado({ empresaId, r, agir }: { empresaId: string; r: ResultadoPs; agir: (f: () => Promise<string>) => Promise<void> }) {
  const dims = r.questionario.dimensoes;
  const linhas: LinhaPs[] = [r.total, ...r.setores];
  const [chave, setChave] = useState(0);
  return (
    <div className="space-y-6">
      <Cartao titulo={`Resultado · ${r.avaliacao.titulo}`}>
        <p className="mb-3 text-xs text-text/60">Mostramos um setor só quando ele tem pelo menos {r.avaliacao.minimoGrupo} respostas, para ninguém ser identificado. Quanto mais forte o vermelho, maior o valor.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-text/60"><th className="py-2 pr-3">Setor</th><th className="pr-3">Respostas</th>{dims.map((d) => <th key={d.id} className="pr-3">{d.nome}<br /><span className="text-xs font-normal">{d.rotuloResultado}</span></th>)}<th /></tr></thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={l.setor} className={`border-t border-border ${i === 0 ? 'font-semibold' : ''}`}>
                  <td className="py-2 pr-3">{l.setor}</td>
                  <td className="pr-3">{l.respostas}</td>
                  {dims.map((d) => (
                    <td key={d.id} className="pr-3">
                      {l.oculto ? <span className="text-xs text-text/50">poucas respostas</span>
                        : <span className="inline-block min-w-[72px] rounded px-2 py-1 text-center" style={corCelula(d, l.valores?.[d.id])}>{fmt(d, l.valores?.[d.id])}</span>}
                    </td>
                  ))}
                  <td>
                    {i > 0 && !l.oculto && dims.map((d) => (
                      <button key={d.id} className="text-xs text-primary underline" onClick={() => {
                        const sev = prompt(`Levar "${d.nome}" do setor ${l.setor} ao inventário do PGR. Severidade (BAIXA, MEDIA ou ALTA):`, 'MEDIA');
                        if (sev) agir(async () => { await psicossocial.levarAoPgr(empresaId, r.avaliacao.id, { setor: l.setor, dimensao: d.id, severidade: sev.trim().toUpperCase().replace('MÉDIA', 'MEDIA') }); return `Risco psicossocial incluído no GHE ${l.setor}, com as ações do plano como medidas de controle.`; });
                      }}>Levar ao PGR</button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-text/50">Fonte do questionário: {r.questionario.fonte}</p>
      </Cartao>

      <Cartao titulo="Plano de ação">
        {r.acoes.length > 0 && (
          <ul className="mb-4 divide-y divide-border text-sm">
            {r.acoes.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={a.feita} onChange={(e) => agir(async () => { await psicossocial.marcar(empresaId, r.avaliacao.id, a.id, e.target.checked); return e.target.checked ? 'Ação marcada como feita.' : 'Ação reaberta.'; })} className="mt-1" />
                  <span className={a.feita ? 'line-through text-text/50' : ''}>{a.acao}<br /><span className="text-xs text-text/60">{a.setor ?? 'Empresa toda'} · {dims.find((d) => d.id === a.dimensao)?.nome ?? a.dimensao}{a.responsavel ? ` · ${a.responsavel}` : ''}{a.prazo ? ` · até ${data(a.prazo)}` : ''}</span></span>
                </label>
                <button className="text-sm text-danger underline" onClick={() => agir(async () => { await psicossocial.removerAcao(empresaId, r.avaliacao.id, a.id); return 'Ação removida.'; })}>Tirar</button>
              </li>
            ))}
          </ul>
        )}
        <form key={chave} className="grid gap-3 md:grid-cols-4" onSubmit={(ev) => {
          ev.preventDefault(); const d = new FormData(ev.currentTarget); const t = (c: string) => String(d.get(c) ?? '').trim();
          agir(async () => { await psicossocial.acao(empresaId, r.avaliacao.id, { setor: t('setor') || undefined, dimensao: t('dimensao'), acao: t('acao'), responsavel: t('resp') || undefined, prazo: t('prazo') || undefined }); setChave((k) => k + 1); return 'Ação incluída no plano.'; });
        }}>
          <Campo id="pa-acao" name="acao" rotulo="Ação" required className="md:col-span-4" placeholder="Ex.: Rodízio de tarefas no forno e pausa de 10 minutos a cada 2 horas" />
          <Selecao id="pa-setor" name="setor" rotulo="Setor"><option value="">Empresa toda</option>{r.setores.map((s) => <option key={s.setor}>{s.setor}</option>)}</Selecao>
          <Selecao id="pa-dim" name="dimensao" rotulo="Tema">{dims.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}</Selecao>
          <Campo id="pa-resp" name="resp" rotulo="Responsável" />
          <Campo id="pa-prazo" name="prazo" type="date" rotulo="Prazo" />
          <div className="flex justify-end md:col-span-4"><Botao type="submit" variante="secundario">Incluir ação</Botao></div>
        </form>
      </Cartao>
    </div>
  );
}

export default function PsicossocialPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [qs, setQs] = useState<QuestionarioPs[]>([]);
  const [lista, setLista] = useState<AvaliacaoPs[]>([]);
  const [aberta, setAberta] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoPs | null>(null);
  const [chave, setChave] = useState(0);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    try { const [e, q, l] = await Promise.all([buscarEmpresa(empresaId), psicossocial.questionarios(empresaId), psicossocial.listar(empresaId)]); setEmpresa(e); setQs(q); setLista(l); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }, [empresaId]);
  const verResultado = useCallback(async (id: string | null) => {
    setAberta(id); if (!id) return setResultado(null);
    try { setResultado(await psicossocial.resultado(empresaId, id)); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }, [empresaId]);
  useEffect(() => { carregar(); }, [carregar]);
  const agir = async (f: () => Promise<string>) => { try { setAviso({ tipo: 'ok', texto: await f() }); await carregar(); if (aberta) await verResultado(aberta); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); } };

  if (!empresa) return <main className="p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando…'}</main>;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div>
        <Link href={`/?empresa=${empresaId}`} className="text-sm text-primary">← Voltar ao painel</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Avaliação psicossocial</h1>
        <p className="text-text/60">{empresa.razaoSocial} · questionário anônimo pelo celular, resultado por setor e plano de ação</p>
        {/* O nome do método à vista passa confiança: só aparecem questionários validados, com a fonte conferida. */}
        {qs.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text/50">Método validado</span>
            {qs.map((q) => <span key={q.id} title={q.fonte} className="rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">✓ {q.nome}</span>)}
            <span className="text-xs text-text/50">Questionário validado no Brasil, com a fonte citada no relatório.</span>
          </div>
        )}
      </div>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <Cartao titulo="Nova avaliação">
        <form key={chave} className="grid gap-4 md:grid-cols-3" onSubmit={(ev) => {
          ev.preventDefault(); const d = new FormData(ev.currentTarget);
          agir(async () => { await psicossocial.criar(empresaId, { questionario: String(d.get('q')), titulo: String(d.get('titulo') ?? ''), minimoGrupo: Number(d.get('minimo') || 5) }); setChave((k) => k + 1); return 'Avaliação aberta. Mande o link para os funcionários.'; });
        }}>
          <Selecao id="ps-q" name="q" rotulo="Questionário" required>{qs.map((q) => <option key={q.id} value={q.id}>{q.sigla} · {q.totalItens} perguntas</option>)}</Selecao>
          <Campo id="ps-titulo" name="titulo" rotulo="Nome" required placeholder="Ex.: Pesquisa de bem-estar 2026" />
          <Campo id="ps-min" name="minimo" type="number" min={3} max={50} defaultValue={5} rotulo="Mínimo de respostas por setor" />
          <p className="text-xs text-text/60 md:col-span-3">{qs.map((q) => `${q.sigla}: ${q.descricao}`).join(' ')} Os outros questionários (COPSOQ, HSE-IT) entram quando a versão validada em português for conferida.</p>
          <div className="flex justify-end md:col-span-3"><Botao type="submit">Abrir avaliação</Botao></div>
        </form>
      </Cartao>

      <Cartao titulo="Avaliações">
        {!lista.length ? <p className="text-sm text-text/60">Nenhuma avaliação ainda.</p> : (
          <ul className="divide-y divide-border">
            {lista.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{a.titulo} <span className="text-sm font-normal text-text/50">· {a.sigla}</span></p>
                  <p className="text-xs text-text/60">Aberta em {data(a.criadoEm)} · {a._count.respostas} resposta(s) · {a._count.acoes} ação(ões) no plano</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {a.status === 'ABERTA' ? <Etiqueta cor="bg-success/15 text-success">Recebendo respostas</Etiqueta> : <Etiqueta cor="bg-border text-text/60">Encerrada</Etiqueta>}
                  {a.status === 'ABERTA' && <>
                    <button className="text-primary underline" onClick={() => navigator.clipboard?.writeText(a.link).then(() => setAviso({ tipo: 'ok', texto: 'Link copiado. Mande no grupo dos funcionários.' }))}>Copiar link</button>
                    <a className="text-primary underline" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Pesquisa anônima "${a.titulo}". Leva poucos minutos e ninguém é identificado: ${a.link}`)}`}>WhatsApp</a>
                  </>}
                  <button className="text-primary underline" onClick={() => verResultado(aberta === a.id ? null : a.id)}>{aberta === a.id ? 'Fechar resultado' : 'Ver resultado'}</button>
                  {a.status === 'ABERTA'
                    ? <button className="text-danger underline" onClick={() => confirm('Encerrar? O link para de aceitar respostas.') && agir(async () => { await psicossocial.encerrar(empresaId, a.id); return 'Avaliação encerrada.'; })}>Encerrar</button>
                    : <button className="text-primary underline" onClick={() => agir(async () => { await psicossocial.reabrir(empresaId, a.id); return 'Avaliação reaberta.'; })}>Reabrir</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
      {resultado && aberta && <Resultado empresaId={empresaId} r={resultado} agir={agir} />}
    </main>
  );
}
