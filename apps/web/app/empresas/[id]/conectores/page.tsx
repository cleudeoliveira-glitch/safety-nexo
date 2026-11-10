'use client';

import Link from 'next/link';
import { useAbaDoEndereco } from '@/lib/abaDoEndereco';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import {
  Absenteismo, Atestado, atestados, buscarEmpresa, Colaborador, Empresa, importarColaboradores, listarColaboradores,
  previaImportacao, PreviaImportacao, Situacao, Terceiro, terceiros,
} from '@/lib/api';
import { ehEmpresa } from '@/lib/sessao';

type Aba = 'rh' | 'terceiros' | 'faltas';
type Avisar = (tipo: 'erro' | 'ok', texto: string) => void;

const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const texto = (d: FormData, c: string) => String(d.get(c) ?? '').trim();
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const horas = (h: number) => `${h.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`;

const Etiqueta = ({ cor, children }: { cor: string; children: React.ReactNode }) => <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cor}`}>{children}</span>;
const COR: Record<Situacao, string> = { ok: 'bg-success/15 text-success', vencendo: 'bg-warning/15 text-warning', vencido: 'bg-danger/15 text-danger', 'sem-validade': 'bg-border text-text/60' };
const NOME_SIT: Record<Situacao, string> = { ok: 'em dia', vencendo: 'vence em menos de 30 dias', vencido: 'vencido', 'sem-validade': 'sem validade' };

// ---------- Importar do RH ----------
function AbaRh({ empresaId, avisar, recarregar }: { empresaId: string; avisar: Avisar; recarregar: () => Promise<void> }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<PreviaImportacao | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [chave, setChave] = useState(0);

  async function ver(f: File | null) {
    setArquivo(f); setPrevia(null);
    if (!f) return;
    setOcupado(true);
    try { setPrevia(await previaImportacao(empresaId, f)); } catch (e) { avisar('erro', (e as Error).message); } finally { setOcupado(false); }
  }
  async function confirmar() {
    if (!arquivo) return;
    setOcupado(true);
    try {
      const r = await importarColaboradores(empresaId, arquivo);
      avisar('ok', `Pronto: ${r.criados} funcionário(s) novo(s) e ${r.atualizados} atualizado(s).${r.ignorados ? ` ${r.ignorados} linha(s) com erro ficaram de fora.` : ''}`);
      setArquivo(null); setPrevia(null); setChave((k) => k + 1); await recarregar();
    } catch (e) { avisar('erro', (e as Error).message); } finally { setOcupado(false); }
  }

  return (
    <div className="space-y-6">
      <Cartao titulo="Importar funcionários da planilha do RH">
        <p className="mb-3 text-sm text-text/70">
          Peça ao RH a lista de funcionários em Excel (.xlsx) ou CSV, como sai do TOTVS, Senior, Sólides ou de uma planilha própria.
          A primeira linha precisa ter os títulos. O sistema reconhece: <strong>Nome</strong>, CPF, Cargo ou Função, CBO, Matrícula (ou Chapa), Admissão e Setor ou GHE.
        </p>
        <p className="mb-4 text-sm text-text/70">Quem já está cadastrado (mesmo CPF ou matrícula) é atualizado, e quem é novo entra. Ninguém é apagado. Antes de gravar, você vê o que vai acontecer.</p>
        <input key={chave} type="file" aria-label="Planilha do RH" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => ver(e.target.files?.[0] ?? null)} className="block text-sm" />
        {ocupado && <p className="mt-3 text-sm text-text/60">Lendo a planilha…</p>}
      </Cartao>

      {previa && (
        <Cartao titulo="Confira antes de gravar" acao={<Botao onClick={confirmar} disabled={ocupado || previa.resumo.novos + previa.resumo.atualizar === 0}>Gravar {previa.resumo.novos + previa.resumo.atualizar} funcionário(s)</Botao>}>
          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            <Etiqueta cor="bg-success/15 text-success">{previa.resumo.novos} novo(s)</Etiqueta>
            <Etiqueta cor="bg-primary/10 text-primary">{previa.resumo.atualizar} para atualizar</Etiqueta>
            {previa.resumo.erros > 0 && <Etiqueta cor="bg-danger/15 text-danger">{previa.resumo.erros} com erro (ficam de fora)</Etiqueta>}
          </div>
          {previa.ignoradas.length > 0 && <p className="mb-3 text-xs text-text/60">Colunas que não usamos: {previa.ignoradas.join(', ')}.</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-text/60"><th className="py-2 pr-3">Linha</th><th className="pr-3">Nome</th><th className="pr-3">CPF</th><th className="pr-3">Cargo</th><th className="pr-3">GHE</th><th>O que acontece</th></tr></thead>
              <tbody>
                {previa.linhas.map((l) => (
                  <tr key={l.linha} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-3 text-text/50">{l.linha}</td>
                    <td className="pr-3 font-semibold">{l.nome || '—'}</td>
                    <td className="whitespace-nowrap pr-3">{l.cpf ?? "—"}</td>
                    <td className="pr-3">{l.cargo ?? '—'}</td>
                    <td className="pr-3">{l.ghe ?? '—'}</td>
                    <td>
                      {l.acao === 'novo' ? <Etiqueta cor="bg-success/15 text-success">Entra</Etiqueta> : l.acao === 'atualizar' ? <Etiqueta cor="bg-primary/10 text-primary">Atualiza</Etiqueta> : <Etiqueta cor="bg-danger/15 text-danger">Fica de fora</Etiqueta>}
                      {[...l.erros, ...l.avisos].length > 0 && <p className={`mt-1 text-xs ${l.erros.length ? 'text-danger' : 'text-text/60'}`}>{[...l.erros, ...l.avisos].join('; ')}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>
      )}
    </div>
  );
}

// ---------- Terceiros ----------
function AbaTerceiros({ empresaId, avisar }: { empresaId: string; avisar: Avisar }) {
  const [lista, setLista] = useState<Terceiro[]>([]);
  const [sugeridos, setSugeridos] = useState<string[]>([]);
  const [aberto, setAberto] = useState<string | null>(null);
  const [chave, setChave] = useState(0);

  const carregar = useCallback(async () => {
    try { const [l, s] = await Promise.all([terceiros.listar(empresaId), terceiros.sugeridos(empresaId)]); setLista(l); setSugeridos(s); } catch (e) { avisar('erro', (e as Error).message); }
  }, [empresaId, avisar]);
  useEffect(() => { carregar(); }, [carregar]);

  const agir = async (f: () => Promise<string>) => { try { avisar('ok', await f()); setChave((k) => k + 1); await carregar(); } catch (e) { avisar('erro', (e as Error).message); } };

  return (
    <div className="space-y-6">
      <Cartao titulo="Nova empresa terceirizada">
        <p className="mb-4 text-sm text-text/60">Empresas que prestam serviço dentro do cliente: limpeza, manutenção, obra, vigilância. O sistema avisa quando falta documento ou quando algo vence.</p>
        <form key={chave} className="grid gap-4 md:grid-cols-3" onSubmit={(ev) => {
          ev.preventDefault(); const d = new FormData(ev.currentTarget);
          agir(async () => {
            await terceiros.criar(empresaId, { razaoSocial: texto(d, 'razao'), cnpj: texto(d, 'cnpj') || undefined, servico: texto(d, 'servico'), contato: texto(d, 'contato') || undefined, telefone: texto(d, 'telefone') || undefined, inicio: texto(d, 'inicio') || undefined, fim: texto(d, 'fim') || undefined });
            return 'Terceirizada cadastrada. Agora registre os documentos e os trabalhadores dela.';
          });
        }}>
          <Campo id="tc-razao" name="razao" rotulo="Nome da empresa" required />
          <Campo id="tc-cnpj" name="cnpj" rotulo="CNPJ" />
          <Campo id="tc-servico" name="servico" rotulo="Serviço que faz" required placeholder="Ex.: Limpeza e conservação" />
          <Campo id="tc-contato" name="contato" rotulo="Responsável" />
          <Campo id="tc-tel" name="telefone" rotulo="Telefone" />
          <div className="grid grid-cols-2 gap-3">
            <Campo id="tc-ini" name="inicio" type="date" rotulo="Início do contrato" />
            <Campo id="tc-fim" name="fim" type="date" rotulo="Fim do contrato" />
          </div>
          <div className="flex justify-end md:col-span-3"><Botao type="submit">Cadastrar</Botao></div>
        </form>
      </Cartao>

      {!lista.length ? <Cartao titulo="Terceirizadas"><p className="text-sm text-text/60">Nenhuma terceirizada cadastrada.</p></Cartao> : lista.map((t) => (
        <Cartao key={t.id} titulo={t.razaoSocial} acao={
          <div className="flex items-center gap-2">
            {t.liberada ? <Etiqueta cor="bg-success/15 text-success">Liberada</Etiqueta> : <Etiqueta cor="bg-danger/15 text-danger">Com pendência</Etiqueta>}
            <Botao variante="secundario" onClick={() => setAberto(aberto === t.id ? null : t.id)}>{aberto === t.id ? 'Fechar' : 'Abrir'}</Botao>
          </div>}>
          <p className="text-sm text-text/70">{t.servico}{t.cnpj ? ` · CNPJ ${t.cnpj}` : ''}{t.contato ? ` · ${t.contato}` : ''}{t.telefone ? ` · ${t.telefone}` : ''}</p>
          <p className="text-xs text-text/50">Contrato: {data(t.inicio)} a {t.fim ? data(t.fim) : 'sem data de fim'}{t.contratoVencido ? ' (vencido)' : ''}</p>
          {!t.liberada && (
            <ul className="mt-2 list-disc pl-5 text-sm text-danger">
              {t.contratoVencido && <li>Contrato vencido</li>}
              {t.vencidos.map((v) => <li key={v}>{v}: vencido</li>)}
              {t.faltando.map((v) => <li key={v}>Falta: {v}</li>)}
            </ul>
          )}
          {t.trabalhadores.some((w) => !w.liberado) && <p className="mt-2 text-sm text-warning">{t.trabalhadores.filter((w) => !w.liberado).length} trabalhador(es) com pendência.</p>}

          {aberto === t.id && (
            <div className="mt-5 space-y-6 border-t border-border pt-5">
              <div>
                <h3 className="mb-2 font-semibold">Documentos</h3>
                {t.documentos.length > 0 && (
                  <ul className="mb-3 divide-y divide-border text-sm">
                    {t.documentos.map((d) => (
                      <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <span>{d.tipo}{d.validade ? ` · vale até ${data(d.validade)}` : ''}{d.observacao ? ` · ${d.observacao}` : ''}</span>
                        <span className="flex items-center gap-2"><Etiqueta cor={COR[d.situacao]}>{NOME_SIT[d.situacao]}</Etiqueta>
                          <button className="text-sm text-danger underline" onClick={() => agir(async () => { await terceiros.removerDocumento(empresaId, t.id, d.id); return 'Documento removido.'; })}>Tirar</button></span>
                      </li>
                    ))}
                  </ul>
                )}
                <form className="grid gap-3 md:grid-cols-4" onSubmit={(ev) => {
                  ev.preventDefault(); const d = new FormData(ev.currentTarget);
                  agir(async () => { await terceiros.documento(empresaId, t.id, { tipo: texto(d, 'tipo'), validade: texto(d, 'validade') || undefined, observacao: texto(d, 'obs') || undefined }); return 'Documento registrado.'; });
                }}>
                  <Selecao id={`td-tipo-${t.id}`} name="tipo" rotulo="Documento" required className="md:col-span-2">
                    <option value="">Escolha</option>{sugeridos.map((s) => <option key={s}>{s}</option>)}
                  </Selecao>
                  <Campo id={`td-val-${t.id}`} name="validade" type="date" rotulo="Vale até" />
                  <Campo id={`td-obs-${t.id}`} name="obs" rotulo="Observação" />
                  <div className="flex justify-end md:col-span-4"><Botao type="submit" variante="secundario">Registrar documento</Botao></div>
                </form>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Trabalhadores que entram no cliente</h3>
                {t.trabalhadores.length > 0 && (
                  <ul className="mb-3 divide-y divide-border text-sm">
                    {t.trabalhadores.map((w) => (
                      <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <div>
                          <p className="font-semibold">{w.nome}{w.funcao ? ` · ${w.funcao}` : ''}</p>
                          <p className="text-xs text-text/60">ASO até {data(w.asoValidade)} · integração em {data(w.integracao)}{w.treinamentos.length ? ` · ${w.treinamentos.map((x) => `${x.nome}${x.validade ? ` até ${data(x.validade)}` : ''}`).join(', ')}` : ''}</p>
                          {!w.liberado && <p className="text-xs text-danger">{w.pendencias.join('; ')}</p>}
                        </div>
                        <span className="flex items-center gap-2">
                          {w.liberado ? <Etiqueta cor="bg-success/15 text-success">Pode entrar</Etiqueta> : <Etiqueta cor="bg-danger/15 text-danger">Não liberar</Etiqueta>}
                          <button className="text-sm text-danger underline" onClick={() => confirm(`Tirar ${w.nome}?`) && agir(async () => { await terceiros.removerTrabalhador(empresaId, t.id, w.id); return 'Trabalhador removido.'; })}>Tirar</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <form className="grid gap-3 md:grid-cols-3" onSubmit={(ev) => {
                  ev.preventDefault(); const d = new FormData(ev.currentTarget);
                  const treinos = texto(d, 'treino') ? [{ nome: texto(d, 'treino'), validade: texto(d, 'treinoVal') || undefined }] : [];
                  agir(async () => {
                    await terceiros.trabalhador(empresaId, t.id, { nome: texto(d, 'nome'), cpf: texto(d, 'cpf') || undefined, funcao: texto(d, 'funcao') || undefined, asoValidade: texto(d, 'aso') || undefined, integracao: texto(d, 'integ') || undefined, treinamentos: treinos });
                    return 'Trabalhador cadastrado.';
                  });
                }}>
                  <Campo id={`tw-nome-${t.id}`} name="nome" rotulo="Nome" required />
                  <Campo id={`tw-cpf-${t.id}`} name="cpf" rotulo="CPF" />
                  <Campo id={`tw-funcao-${t.id}`} name="funcao" rotulo="Função" />
                  <Campo id={`tw-aso-${t.id}`} name="aso" type="date" rotulo="ASO vale até" />
                  <Campo id={`tw-integ-${t.id}`} name="integ" type="date" rotulo="Integração de segurança feita em" />
                  <div className="grid grid-cols-2 gap-3">
                    <Campo id={`tw-treino-${t.id}`} name="treino" rotulo="Treinamento" placeholder="Ex.: NR-35" />
                    <Campo id={`tw-treinoval-${t.id}`} name="treinoVal" type="date" rotulo="Vale até" />
                  </div>
                  <div className="flex justify-end md:col-span-3"><Botao type="submit" variante="secundario">Cadastrar trabalhador</Botao></div>
                </form>
              </div>

              <div className="flex justify-end">
                <button className="text-sm text-danger underline" onClick={() => confirm(`Apagar ${t.razaoSocial} e tudo dela?`) && agir(async () => { await terceiros.remover(empresaId, t.id); return 'Terceirizada removida.'; })}>Apagar esta terceirizada</button>
              </div>
            </div>
          )}
        </Cartao>
      ))}
    </div>
  );
}

// ---------- Atestados e absenteísmo ----------
function Barras({ titulo, itens }: { titulo: string; itens: { nome: string; horas: number }[] }) {
  const max = Math.max(...itens.map((i) => i.horas), 1);
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{titulo}</h3>
      {!itens.length ? <p className="text-sm text-text/50">Sem dados.</p> : (
        <ul className="space-y-1.5">
          {itens.map((i) => (
            <li key={i.nome} className="text-sm">
              <div className="flex justify-between gap-2"><span className="truncate">{i.nome}</span><span className="text-text/60">{horas(i.horas)}</span></div>
              <div className="h-2 rounded-full bg-background"><div className="h-2 rounded-full bg-primary" style={{ width: `${(i.horas / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AbaFaltas({ empresaId, colaboradores, cliente, avisar }: { empresaId: string; colaboradores: Colaborador[]; cliente: boolean; avisar: Avisar }) {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [lista, setLista] = useState<Atestado[]>([]);
  const [ind, setInd] = useState<Absenteismo | null>(null);
  const [tipos, setTipos] = useState<Record<string, string>>({});
  const [chave, setChave] = useState(0);
  const [porHoras, setPorHoras] = useState(false);

  const carregar = useCallback(async () => {
    try { const [l, i, t] = await Promise.all([atestados.listar(empresaId, ano), atestados.indicadores(empresaId, ano), atestados.tipos(empresaId)]); setLista(l); setInd(i); setTipos(t); } catch (e) { avisar('erro', (e as Error).message); }
  }, [empresaId, ano, avisar]);
  useEffect(() => { carregar(); }, [carregar]);
  const agir = async (f: () => Promise<string>) => { try { avisar('ok', await f()); setChave((k) => k + 1); await carregar(); } catch (e) { avisar('erro', (e as Error).message); } };
  const maxTaxa = Math.max(...(ind?.meses.map((m) => m.taxa) ?? [0]), 1);

  return (
    <div className="space-y-6">
      {ind && ind.alertasInss.filter((a) => !a.jaAfastado).map((a) => (
        <Aviso key={a.colaboradorId + a.desde} tipo="erro">
          {a.nome} soma {a.dias} dias de atestado{a.cid ? ` pela mesma doença (CID ${a.cid})` : ''} desde {data(a.desde)}. A empresa paga só os 15 primeiros dias: encaminhe ao INSS e registre o afastamento em{' '}
          <Link href={`/empresas/${empresaId}/saude#afastamentos`} className="underline">Saúde ocupacional → Afastamentos</Link>.
        </Aviso>
      ))}

      <Cartao titulo="Lançar atestado">
        <form key={chave} className="grid gap-4 md:grid-cols-3" onSubmit={(ev) => {
          ev.preventDefault(); const d = new FormData(ev.currentTarget);
          agir(async () => {
            await atestados.criar(empresaId, {
              colaboradorId: texto(d, 'colab'), inicio: texto(d, 'inicio'), tipo: texto(d, 'tipo'),
              dias: porHoras ? 0 : Number(texto(d, 'dias') || 0), horas: porHoras ? Number(texto(d, 'horas').replace(',', '.')) : undefined,
              cid: texto(d, 'cid') || undefined, medico: texto(d, 'medico') || undefined, observacao: texto(d, 'obs') || undefined,
            });
            return 'Atestado lançado.';
          });
        }}>
          <Selecao id="at-colab" name="colab" rotulo="Funcionário" required>
            <option value="">Escolha</option>{colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Selecao>
          <Campo id="at-inicio" name="inicio" type="date" rotulo="Primeiro dia" required defaultValue={hoje()} />
          <Selecao id="at-tipo" name="tipo" rotulo="Motivo" required defaultValue="DOENCA">
            {Object.entries(tipos).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </Selecao>
          <div>
            <div className="mb-1.5 flex gap-3 text-sm">
              <label className="flex items-center gap-1"><input type="radio" checked={!porHoras} onChange={() => setPorHoras(false)} /> Dias</label>
              <label className="flex items-center gap-1"><input type="radio" checked={porHoras} onChange={() => setPorHoras(true)} /> Só algumas horas</label>
            </div>
            {porHoras
              ? <input id="at-horas" name="horas" aria-label="Horas" inputMode="decimal" required placeholder="Ex.: 3" className="w-full rounded-card border border-border bg-background px-3 py-2" />
              : <input id="at-dias" name="dias" aria-label="Dias" type="number" min={1} max={365} required placeholder="Ex.: 2" className="w-full rounded-card border border-border bg-background px-3 py-2" />}
          </div>
          <Campo id="at-cid" name="cid" rotulo="CID (se vier no atestado)" placeholder="Ex.: M54.5"
            dica={cliente ? 'Dado de saúde sigiloso: depois de salvo, só a consultoria vê.' : undefined} />
          <Campo id="at-medico" name="medico" rotulo="Médico e CRM" />
          <div className="flex justify-end md:col-span-3"><Botao type="submit">Lançar</Botao></div>
        </form>
      </Cartao>

      {ind && (
        <Cartao titulo={`Absenteísmo ${ind.ano}`} acao={
          <div className="flex items-center gap-2">
            <select aria-label="Ano" value={ano} onChange={(e) => setAno(Number(e.target.value))} className="rounded-card border border-border px-2 py-1.5 text-sm">
              {[0, 1, 2].map((n) => new Date().getFullYear() - n).map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>}>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-card border border-border p-4"><p className="text-sm text-text/60">Índice do ano</p><p className="text-2xl font-semibold text-primary">{ind.total.taxa.toLocaleString('pt-BR')}%</p></div>
            <div className="rounded-card border border-border p-4"><p className="text-sm text-text/60">Horas perdidas</p><p className="text-2xl font-semibold">{horas(ind.total.horasPerdidas)}</p></div>
            <div className="rounded-card border border-border p-4"><p className="text-sm text-text/60">Atestados</p><p className="text-2xl font-semibold">{ind.total.atestados}</p></div>
          </div>
          <p className="mb-3 text-xs text-text/60">
            Índice = horas perdidas por atestado ÷ horas que deviam ser trabalhadas × 100. Conta de segunda a sexta (sem feriados), com jornada de {ind.jornada} h por dia.{' '}
            {!cliente && <button className="text-primary underline" onClick={() => { const v = prompt('Jornada diária em horas (ex.: 8 ou 7,33):', String(ind.jornada)); if (v) agir(async () => { await atestados.jornada(empresaId, Number(v.replace(',', '.'))); return 'Jornada alterada.'; }); }}>Mudar jornada</button>}
          </p>
          <div className="mb-6 flex h-40 items-end gap-2" role="img" aria-label="Índice de absenteísmo por mês">
            {ind.meses.map((m) => (
              <div key={m.mes} className="flex flex-1 flex-col items-center gap-1" title={`${MESES[m.mes - 1]}: ${m.taxa}% (${horas(m.horasPerdidas)} de ${horas(m.horasPrevistas)})`}>
                <span className="text-[10px] text-text/60">{m.taxa ? `${m.taxa.toLocaleString('pt-BR')}%` : ''}</span>
                <div className="w-full rounded-t bg-primary" style={{ height: `${(m.taxa / maxTaxa) * 100}px`, minHeight: m.taxa ? 2 : 0 }} />
                <span className="text-xs text-text/60">{MESES[m.mes - 1]}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Barras titulo="Por GHE" itens={ind.porGhe} />
            <Barras titulo="Por motivo" itens={ind.porTipo} />
            {!cliente && <Barras titulo="Doenças que mais afastam (CID)" itens={ind.porCid} />}
            <Barras titulo="Quem mais faltou" itens={ind.quemMaisFaltou} />
          </div>
        </Cartao>
      )}

      <Cartao titulo="Atestados lançados">
        {!lista.length ? <p className="text-sm text-text/60">Nenhum atestado neste ano.</p> : (
          <ul className="divide-y divide-border text-sm">
            {lista.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-semibold">{a.colaborador.nome}</p>
                  <p className="text-xs text-text/60">{data(a.inicio)} · {a.dias ? `${a.dias} dia(s)` : `${a.horas} h`} · {tipos[a.tipo] ?? a.tipo}{a.cid ? ` · CID ${a.cid}` : ''}{a.medico ? ` · ${a.medico}` : ''}</p>
                </div>
                <button className="text-sm text-danger underline" onClick={() => confirm('Apagar este atestado?') && agir(async () => { await atestados.remover(empresaId, a.id); return 'Atestado apagado.'; })}>Apagar</button>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

export default function ConectoresPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [aba, setAba] = useState<Aba>('rh');
  useAbaDoEndereco<Aba>(['rh', 'terceiros', 'faltas'], setAba);
  const [cliente, setCliente] = useState(false);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  const avisar: Avisar = useCallback((tipo, texto) => setAviso({ tipo, texto }), []);

  const recarregar = useCallback(async () => {
    try { const [e, c] = await Promise.all([buscarEmpresa(empresaId), listarColaboradores(empresaId)]); setEmpresa(e); setColaboradores(c); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }, [empresaId]);
  useEffect(() => {
    setCliente(ehEmpresa());
    recarregar();
  }, [recarregar]);

  if (!empresa) return <main className="p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando…'}</main>;
  const abas: [Aba, string][] = [['rh', 'Importar do RH'], ['terceiros', 'Terceirizadas'], ['faltas', 'Atestados e faltas']];

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div>
        <Link href={`/?empresa=${empresaId}`} className="text-sm text-primary">← Voltar ao painel</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">RH, terceiros e faltas</h1>
        <p className="text-text/60">{empresa.razaoSocial} · {colaboradores.length} funcionário(s) cadastrado(s)</p>
      </div>
      <div role="tablist" className="flex flex-wrap gap-2">
        {abas.map(([valor, nome]) => (
          <button key={valor} role="tab" aria-selected={aba === valor} onClick={() => { setAba(valor); setAviso(null); history.replaceState(null, '', `#${valor}`); }}
            className={`rounded-card px-4 py-2 text-sm font-semibold ${aba === valor ? 'bg-primary text-white' : 'border border-border bg-white'}`}>{nome}</button>
        ))}
      </div>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      {aba === 'rh' && <AbaRh empresaId={empresaId} avisar={avisar} recarregar={recarregar} />}
      {aba === 'terceiros' && <AbaTerceiros empresaId={empresaId} avisar={avisar} />}
      {aba === 'faltas' && <AbaFaltas empresaId={empresaId} colaboradores={colaboradores} cliente={cliente} avisar={avisar} />}
    </main>
  );
}
