'use client';

import { useEffect, useRef, useState } from 'react';
import { reduzirFoto } from '@/components/Foto';
import { Botao, Campo, CardNumero, Cartao, Selecao } from '@/components/ui';
import {
  analisarInspecaoIa,
  criarInspecao,
  definirProximaInspecao,
  enviarFotosInspecao,
  fotoInspecao,
  gerarInspecao,
  ia,
  Inspecao,
  ItemInspecao,
  ModeloChecklist,
  prevencao,
  removerFotoInspecao,
  salvarArquivo,
} from '@/lib/api';
import { ehEmpresa } from '@/lib/sessao';

type Avisar = (tipo: 'erro' | 'ok', texto: string) => void;
const MAX_FOTOS = 5;
const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
// Data local (não UTC): à noite o UTC já está no dia seguinte.
const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const somarDias = (iso: string, dias: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + dias); return d.toISOString().slice(0, 10); };
const diasAte = (iso: string) => Math.ceil((new Date(iso).getTime() - new Date(`${hoje()}T00:00:00Z`).getTime()) / 86_400_000);
const caixaTexto = 'w-full rounded-card border border-border bg-background px-3 py-2 text-sm';
const chaveLocal = (local: string) => local.trim().toLowerCase();

const GRAUS: [number, string][] = [[1, 'Multa leve (I1)'], [2, 'Multa média (I2)'], [3, 'Multa grave (I3)'], [4, 'Multa gravíssima (I4)']];
const reaisInteiros = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const RESPOSTAS: [ItemInspecao['resposta'], string, string][] = [
  ['C', 'Conforme', 'bg-success text-white'],
  ['NC', 'Não conforme', 'bg-danger text-white'],
  ['NA', 'Não se aplica', 'bg-text/60 text-white'],
];
const PRAZOS: [number, string][] = [[30, '30 dias'], [90, '3 meses'], [180, '6 meses'], [365, '1 ano']];
const NIVEL = (p: number, s: number) => (p * s >= 15 ? ['Alto', 'text-danger'] : p * s >= 8 ? ['Médio', 'text-[#c2410c]'] : ['Baixo', 'text-success']);

// Fotos escolhidas antes de salvar: miniatura, legenda e botão de tirar.
type FotoNova = { foto: Blob; legenda: string; previa: string };

function EscolherFotos({ fotos, mudar, max }: { fotos: FotoNova[]; mudar: (f: FotoNova[]) => void; max: number }) {
  const entrada = useRef<HTMLInputElement>(null);
  async function incluir(lista: FileList | null) {
    if (!lista) return;
    const novas: FotoNova[] = [];
    for (const arq of Array.from(lista).slice(0, max - fotos.length)) {
      const foto = await reduzirFoto(arq);
      novas.push({ foto, legenda: '', previa: URL.createObjectURL(foto) });
    }
    mudar([...fotos, ...novas]);
  }
  return (
    <div className="space-y-2">
      <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
        onChange={async (e) => { await incluir(e.target.files); e.target.value = ''; }} />
      {fotos.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {fotos.map((f, i) => (
            <li key={f.previa} className="flex gap-2 rounded-card border border-border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.previa} alt={`Foto ${i + 1}`} className="h-16 w-16 shrink-0 rounded-card object-cover" />
              <div className="min-w-0 flex-1 space-y-1">
                <input aria-label={`Legenda da foto ${i + 1}`} value={f.legenda} maxLength={200} placeholder="O que a foto mostra (opcional)"
                  onChange={(e) => mudar(fotos.map((x, j) => (j === i ? { ...x, legenda: e.target.value } : x)))} className={caixaTexto} />
                <button type="button" className="text-xs text-danger hover:underline" onClick={() => { URL.revokeObjectURL(f.previa); mudar(fotos.filter((_, j) => j !== i)); }}>Tirar a foto</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {fotos.length < max && (
        <button type="button" onClick={() => entrada.current?.click()} className="rounded-card border border-dashed border-primary/50 bg-white px-4 py-2.5 text-sm font-semibold text-primary hover:border-primary">
          📷 {fotos.length ? 'Incluir mais fotos' : 'Incluir fotos do local'} <span className="font-normal text-text/50">({fotos.length} de {max})</span>
        </button>
      )}
    </div>
  );
}

// Miniatura de uma foto já guardada (a foto é protegida pelo login).
function Miniatura({ empresaId, inspecao, n, legenda, grande, onRemover }: { empresaId: string; inspecao: string; n: number; legenda?: string; grande?: boolean; onRemover?: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true; let criada: string | null = null;
    fotoInspecao(empresaId, inspecao, n).then((u) => { criada = u; if (vivo) setUrl(u); }).catch(() => undefined);
    return () => { vivo = false; if (criada) URL.revokeObjectURL(criada); };
  }, [empresaId, inspecao, n]);
  return (
    <figure className={grande ? 'w-full' : 'w-24'}>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={legenda || `Foto ${n + 1}`} className={`${grande ? 'h-40' : 'h-20'} w-full rounded-card border border-border object-cover`} />
        </a>
      ) : <div className={`${grande ? 'h-40' : 'h-20'} w-full animate-pulse rounded-card bg-background`} />}
      <figcaption className="mt-0.5 truncate text-[11px] text-text/60" title={legenda}>Foto {n + 1}{legenda ? `: ${legenda}` : ''}</figcaption>
      {onRemover && <button type="button" onClick={onRemover} className="text-[11px] text-danger hover:underline">Apagar</button>}
    </figure>
  );
}

function SeloPrazo({ iso }: { iso?: string | null }) {
  if (!iso) return <span className="text-text/50">sem prazo para voltar</span>;
  const dias = diasAte(iso);
  if (dias < 0) return <span className="font-semibold text-danger">reinspeção atrasada ({data(iso)})</span>;
  if (dias <= 15) return <span className="font-semibold text-[#c2410c]">voltar até {data(iso)}</span>;
  return <span className="text-text/70">voltar em {data(iso)}</span>;
}

function Detalhe({ empresaId, i, cliente, iaLigada, ocupado, acao }: {
empresaId: string; i: Inspecao; cliente: boolean; iaLigada: boolean; ocupado: boolean; acao: (id: string, fazer: () => Promise<unknown>, ok?: string) => Promise<void>;
}) {
  const [novas, setNovas] = useState<FotoNova[]>([]);
  const [prox, setProx] = useState(i.proximaInspecao?.slice(0, 10) ?? '');
  return (
    <div className="mt-3 space-y-4 rounded-card bg-background p-3">
      <div>
        <p className="mb-2 text-sm font-semibold">Fotos do local</p>
        {i.fotos.length === 0 && <p className="mb-2 text-xs text-text/60">Sem fotos ainda.</p>}
        <div className="flex flex-wrap gap-3">
          {i.fotos.map((f) => <Miniatura key={`${i.id}-${f.n}-${i.fotos.length}`} empresaId={empresaId} inspecao={i.id} n={f.n} legenda={f.legenda}
            onRemover={() => { if (confirm('Apagar esta foto?')) acao(i.id, () => removerFotoInspecao(empresaId, i.id, f.n), 'Foto apagada.'); }} />)}
        </div>
        {i.fotos.length < MAX_FOTOS && (
          <div className="mt-3 space-y-2">
            <EscolherFotos fotos={novas} mudar={setNovas} max={MAX_FOTOS - i.fotos.length} />
            {novas.length > 0 && <Botao disabled={ocupado} onClick={() => acao(i.id, async () => { await enviarFotosInspecao(empresaId, i.id, novas); novas.forEach((f) => URL.revokeObjectURL(f.previa)); setNovas([]); }, 'Fotos guardadas.')}>Guardar {novas.length} foto(s)</Botao>}
          </div>
        )}
      </div>

      {!cliente && (
        <div>
          <p className="mb-1 text-sm font-semibold">Relatório da IA</p>
          {i.relatorioIa ? (
            <div className="space-y-2 text-sm">
              <p>{i.relatorioIa.resumo}</p>
              {i.relatorioIa.perigos.length > 0 && (
                <ul className="space-y-1.5">
                  {i.relatorioIa.perigos.map((p, k) => {
                    const [nome, cor] = NIVEL(p.probabilidade, p.severidade);
                    return (
                      <li key={k} className="rounded-card border border-border bg-white p-2">
                        <span className={`font-semibold ${cor}`}>{nome}</span> · {p.descricao}{p.nr ? <span className="text-text/50"> ({p.nr})</span> : ''}{p.foto ? <span className="text-text/50"> · foto {p.foto}</span> : ''}
                        {p.acoes.length > 0 && <span className="block text-xs text-text/70">O que fazer: {p.acoes.join('; ')}</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
              {i.relatorioIa.boasPraticas.length > 0 && <p className="text-xs text-success">Pontos positivos: {i.relatorioIa.boasPraticas.join('; ')}</p>}
              <p className="text-xs text-text/50">Sugestão da IA: revise antes de assinar. O relatório em PDF já sai com esta análise e as fotos.</p>
            </div>
          ) : (
            <p className="text-xs text-text/60">
              {iaLigada ? 'A IA olha as fotos, aponta os perigos com a NR e sugere as ações e o prazo para voltar.' : 'A IA ainda não está ligada no servidor (tem custo). Quando ligar, este botão monta o relatório pelas fotos.'}
            </p>
          )}
          <Botao variante="secundario" className="mt-2" disabled={ocupado || !iaLigada || i.fotos.length === 0}
            title={i.fotos.length === 0 ? 'Inclua fotos primeiro' : undefined}
            onClick={() => acao(i.id, () => analisarInspecaoIa(empresaId, i.id), 'Relatório da IA pronto. Confira abaixo e no PDF.')}>
            {ocupado ? 'Analisando…' : i.relatorioIa ? 'Analisar as fotos de novo' : '✨ Montar relatório pelas fotos'}
          </Botao>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <Campo id={`prox-${i.id}`} type="date" rotulo="Inspecionar este local de novo em" value={prox} onChange={(e) => setProx(e.target.value)} className="w-56" />
        <Botao variante="secundario" disabled={ocupado} onClick={() => acao(i.id, () => definirProximaInspecao(empresaId, i.id, prox || null), prox ? 'Prazo salvo. O painel e o e-mail semanal avisam quando chegar.' : 'Prazo tirado.')}>Salvar prazo</Botao>
      </div>
    </div>
  );
}

export function AbaChecklist({ empresaId, lista, modelos, recarregar, avisar }: {
  empresaId: string; lista: Inspecao[]; modelos: ModeloChecklist[]; recarregar: () => Promise<void>; avisar: Avisar;
}) {
  const [modelo, setModelo] = useState('');
  const [itens, setItens] = useState<(Omit<ItemInspecao, 'resposta'> & { resposta: ItemInspecao['resposta'] | '' })[]>([]);
  const [novoItem, setNovoItem] = useState('');
  const [fotos, setFotos] = useState<FotoNova[]>([]);
  const [dataInsp, setDataInsp] = useState(hoje());
  const [proxima, setProxima] = useState('');
  const [chave, setChave] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [visao, setVisao] = useState<'lista' | 'local'>('lista');
  const [aberta, setAberta] = useState<string | null>(null);
  const [iaLigada, setIaLigada] = useState(false);
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [cliente, setCliente] = useState(false);

  useEffect(() => { const c = ehEmpresa(); setCliente(c); if (!c) ia.status().then((s) => setIaLigada(s.ligada)).catch(() => undefined); }, []);

  function escolher(valor: string) {
    setModelo(valor);
    const m = modelos.find((x) => x.modelo === valor);
    setItens((m?.itens ?? []).map((texto, i) => ({ texto, resposta: '', grau: m?.graus?.[i] })));
  }
  const mudar = (i: number, campos: Partial<ItemInspecao>) => setItens((x) => x.map((it, j) => (j === i ? { ...it, ...campos } : it)));

  async function salvar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const d = new FormData(ev.currentTarget);
    const t = (c: string) => String(d.get(c) ?? '').trim();
    const faltam = itens.filter((i) => !i.resposta).length;
    if (faltam) return avisar('erro', `Responda todos os itens: faltam ${faltam}.`);
    setSalvando(true);
    try {
      const criada = await criarInspecao(empresaId, {
        modelo: modelo || 'LIVRE',
        titulo: modelos.find((m) => m.modelo === modelo)?.titulo ?? t('titulo'),
        local: t('local'), data: dataInsp, inspetor: t('inspetor'),
        ...(proxima ? { proximaInspecao: proxima } : {}),
        itens: itens.map((i) => ({ texto: i.texto, resposta: i.resposta as ItemInspecao['resposta'], ...(i.observacao?.trim() ? { observacao: i.observacao.trim() } : {}), ...(i.grau ? { grau: i.grau } : {}) })),
      });
      let textoFotos = '';
      if (fotos.length) {
        try { await enviarFotosInspecao(empresaId, criada.id, fotos); textoFotos = ` ${fotos.length} foto(s) guardada(s).`; }
        catch (e) { textoFotos = ` As fotos não foram: ${(e as Error).message}. Inclua de novo na lista abaixo.`; }
      }
      fotos.forEach((f) => URL.revokeObjectURL(f.previa));
      setModelo(''); setItens([]); setFotos([]); setProxima(''); setDataInsp(hoje()); setChave((k) => k + 1);
      setAberta(criada.id);
      avisar('ok', `Inspeção salva.${textoFotos} Baixe o relatório: as não conformidades já saem no plano de ação.`);
      await recarregar();
    } catch (e) {
      avisar('erro', (e as Error).message);
    }
    setSalvando(false);
  }

  async function acao(id: string, fazer: () => Promise<unknown>, ok?: string) {
    setOcupada(id);
    try { await fazer(); if (ok) avisar('ok', ok); await recarregar(); }
    catch (e) { avisar('erro', (e as Error).message); }
    setOcupada(null);
  }

  // Linha do tempo: as inspeções de cada local, da mais antiga para a mais nova.
  const porLocal = new Map<string, Inspecao[]>();
  for (const i of [...lista].sort((a, b) => a.data.localeCompare(b.data))) {
    const k = chaveLocal(i.local);
    porLocal.set(k, [...(porLocal.get(k) ?? []), i]);
  }
  const locais = [...porLocal.values()].sort((a, b) => b[b.length - 1].data.localeCompare(a[a.length - 1].data));

  function acoes(i: Inspecao) {
    return (
      <span className="flex flex-wrap gap-2">
        <Botao variante="secundario" onClick={() => setAberta(aberta === i.id ? null : i.id)}>{aberta === i.id ? 'Fechar' : `Fotos e IA${i.fotos.length ? ` (${i.fotos.length})` : ''}`}</Botao>
        {i.resumo.naoConformes > 0 && <Botao variante="secundario" onClick={async () => {
          try { const r = await prevencao.acoesDaInspecao(empresaId, i.id); avisar('ok', r.criadas ? `${r.criadas} ação(ões) criadas no plano de ação.` : 'As não conformidades já estavam no plano de ação.'); }
          catch (e) { avisar('erro', (e as Error).message); }
        }}>Levar ao plano de ação</Botao>}
        <Botao variante="secundario" onClick={async () => {
          try { salvarArquivo(await gerarInspecao(empresaId, i.id), `Inspecao-${i.modelo}-${i.data.slice(0, 10)}.pdf`); }
          catch (e) { avisar('erro', (e as Error).message); }
        }}>Baixar relatório</Botao>
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <Cartao titulo="Nova inspeção">
        <form key={chave} className="space-y-4" onSubmit={salvar}>
          <div className="grid gap-4 md:grid-cols-3">
            <Selecao id="ck-modelo" rotulo="Modelo de inspeção" value={modelo} onChange={(e) => escolher(e.target.value)} className="md:col-span-3">
              <option value="">Inspeção livre (montar do zero)</option>
              {Array.from(new Set(modelos.map((m) => m.grupo ?? 'Modelos'))).map((g) => (
                <optgroup key={g} label={g}>
                  {modelos.filter((m) => (m.grupo ?? 'Modelos') === g).map((m) => <option key={m.modelo} value={m.modelo}>{m.titulo}</option>)}
                </optgroup>
              ))}
            </Selecao>
            {!modelo && <Campo id="ck-titulo" name="titulo" rotulo="Nome da inspeção" required placeholder="Ex.: Inspeção do almoxarifado" className="md:col-span-3" />}
            <Campo id="ck-local" name="local" rotulo="Local inspecionado" required placeholder="Ex.: Produção" list="ck-locais" />
            <datalist id="ck-locais">{locais.map((l) => <option key={l[0].local} value={l[l.length - 1].local} />)}</datalist>
            <Campo id="ck-data" type="date" rotulo="Data" required value={dataInsp} onChange={(e) => setDataInsp(e.target.value)} />
            <Campo id="ck-inspetor" name="inspetor" rotulo="Inspetor(a)" required placeholder="Quem fez a inspeção" />
          </div>

          {itens.length > 0 && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <CardNumero tom="total" rotulo="Itens" valor={itens.length} icone="lista" />
              <CardNumero tom="ok" rotulo="Conforme" valor={itens.filter((x) => x.resposta === 'C').length} />
              <CardNumero tom="nao" rotulo="Não conforme" valor={itens.filter((x) => x.resposta === 'NC').length} />
              <CardNumero tom="pendente" rotulo="Falta responder" valor={itens.filter((x) => !x.resposta).length} />
            </div>
          )}
          {itens.length > 0 && (
            <ol className="divide-y divide-border rounded-card border border-border">
              {itens.map((it, i) => (
                <li key={i} className={`space-y-2 p-3 text-sm ${it.resposta === 'C' ? 'card-ok' : it.resposta === 'NC' ? 'card-nao' : it.resposta === 'NA' ? 'bg-background' : ''}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <input aria-label={`Item ${i + 1}`} value={it.texto} onChange={(e) => mudar(i, { texto: e.target.value })}
                      className="min-w-64 flex-1 rounded-card border border-transparent bg-transparent px-1 py-1 hover:border-border" />
                    <div className="flex flex-wrap gap-1">
                      {RESPOSTAS.map(([valor, nome, cor]) => (
                        <button key={valor} type="button" aria-pressed={it.resposta === valor} onClick={() => mudar(i, { resposta: valor })}
                          className={`rounded-card px-3 py-1 text-xs font-semibold ${it.resposta === valor ? cor : 'border border-border bg-white'}`}>{nome}</button>
                      ))}
                      <button type="button" className="px-2 text-xs text-danger hover:underline" onClick={() => setItens((x) => x.filter((_, j) => j !== i))}>Tirar</button>
                    </div>
                  </div>
                  {it.resposta === 'NC' && (
                    <div className="flex flex-wrap gap-2">
                      <input aria-label={`Observação ${i + 1}`} value={it.observacao ?? ''} onChange={(e) => mudar(i, { observacao: e.target.value })}
                        placeholder="O que está errado? Ex.: caixas bloqueando a saída dos fundos" className={`${caixaTexto} min-w-64 flex-1`} />
                      <select aria-label={`Gravidade da multa do item ${i + 1}`} value={it.grau ?? ''} onChange={(e) => mudar(i, { grau: e.target.value ? Number(e.target.value) : undefined })}
                        title="Gravidade da infração na NR-28. Usada para estimar a multa no relatório."
                        className="rounded-card border border-border bg-white px-2 py-1 text-xs">
                        <option value="">Sem multa</option>
                        {GRAUS.map(([g, nome]) => <option key={g} value={g}>{nome}</option>)}
                      </select>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <Campo id="ck-novo" rotulo="Incluir item" value={novoItem} onChange={(e) => setNovoItem(e.target.value)} className="min-w-64 flex-1" placeholder="Ex.: Escada de acesso ao mezanino com corrimão" />
            <Botao type="button" variante="secundario" onClick={() => { if (novoItem.trim()) { setItens((x) => [...x, { texto: novoItem.trim(), resposta: '' }]); setNovoItem(''); } }}>Incluir</Botao>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-semibold">Fotos do local <span className="font-normal text-text/50">(até {MAX_FOTOS}, saem no relatório)</span></p>
            <EscolherFotos fotos={fotos} mudar={setFotos} max={MAX_FOTOS} />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-semibold">Quando inspecionar de novo? <span className="font-normal text-text/50">(o painel e o e-mail semanal avisam)</span></p>
            <div className="flex flex-wrap items-center gap-2">
              {PRAZOS.map(([dias, nome]) => {
                const alvo = somarDias(dataInsp || hoje(), dias);
                return (
                  <button key={dias} type="button" aria-pressed={proxima === alvo} onClick={() => setProxima(proxima === alvo ? '' : alvo)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${proxima === alvo ? 'bg-primary text-white' : 'border border-border bg-white hover:border-primary'}`}>{nome}</button>
                );
              })}
              <input type="date" aria-label="Data da próxima inspeção" value={proxima} onChange={(e) => setProxima(e.target.value)} className="rounded-card border border-border bg-background px-3 py-1.5 text-sm" />
              {!cliente && <span className="text-xs text-text/50">Se deixar em branco, a IA sugere o prazo quando analisar as fotos.</span>}
            </div>
          </div>

          <div className="flex justify-end"><Botao type="submit" disabled={!itens.length || salvando}>{salvando ? 'Salvando…' : 'Salvar inspeção'}</Botao></div>
        </form>
      </Cartao>

      <Cartao titulo="Inspeções feitas" acao={lista.length > 0 && (
        <div className="flex gap-1" role="tablist" aria-label="Como ver as inspeções">
          {([['lista', 'Lista'], ['local', 'Linha do tempo por local']] as const).map(([v, nome]) => (
            <button key={v} type="button" role="tab" aria-selected={visao === v} onClick={() => setVisao(v)}
              className={`rounded-card px-3 py-1.5 text-xs font-semibold ${visao === v ? 'bg-primary text-white' : 'border border-border bg-white'}`}>{nome}</button>
          ))}
        </div>
      )}>
        {lista.length === 0 ? <p className="text-sm text-text/60">Nenhuma inspeção ainda.</p> : visao === 'lista' ? (
          <ul className="divide-y divide-border text-sm">
            {lista.map((i) => (
              <li key={i.id} className="py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>{i.titulo}</strong> · {i.local} · {data(i.data)} ·{' '}
                    <span className={`font-semibold ${i.resumo.percentual >= 80 ? 'text-success' : 'text-danger'}`}>{i.resumo.percentual}% conforme</span>
                    {i.resumo.naoConformes > 0 && <span className="text-text/60"> · {i.resumo.naoConformes} não conformidade(s)</span>}
                    {!!i.resumo.multa?.maximo && <span className="text-danger"> · multa estimada de {reaisInteiros(i.resumo.multa.minimo)} a {reaisInteiros(i.resumo.multa.maximo)}</span>}
                    <span className="block text-xs"><SeloPrazo iso={i.proximaInspecao} />{i.relatorioIa ? ' · com relatório da IA' : ''}</span>
                  </span>
                  {acoes(i)}
                </div>
                {aberta === i.id && <Detalhe key={`${i.id}-${i.proximaInspecao ?? ""}`} empresaId={empresaId} i={i} cliente={cliente} iaLigada={iaLigada} ocupado={ocupada === i.id} acao={acao} />}
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-6">
            {locais.map((doLocal) => {
              const ultima = doLocal[doLocal.length - 1];
              const primeira = doLocal[0];
              const comFoto = doLocal.filter((x) => x.fotos.length);
              const antes = comFoto[0]; const depois = comFoto.length > 1 ? comFoto[comFoto.length - 1] : null;
              const variacao = doLocal.length > 1 ? ultima.resumo.percentual - primeira.resumo.percentual : null;
              return (
                <section key={chaveLocal(ultima.local)} className="rounded-card border border-border p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold">{ultima.local}</h3>
                    <span className="text-xs"><SeloPrazo iso={ultima.proximaInspecao} /></span>
                  </div>
                  <p className="text-xs text-text/60">
                    {doLocal.length} inspeç{doLocal.length === 1 ? 'ão' : 'ões'}
                    {variacao !== null && (
                      <> · desde a primeira: <span className={`font-semibold ${variacao > 0 ? 'text-success' : variacao < 0 ? 'text-danger' : ''}`}>
                        {variacao > 0 ? `melhorou ${variacao} pontos` : variacao < 0 ? `piorou ${-variacao} pontos` : 'ficou igual'}</span></>
                    )}
                  </p>
                  <ol className="mt-3 flex gap-2 overflow-x-auto pb-2">
                    {doLocal.map((i, k) => {
                      const anterior = doLocal[k - 1];
                      const dif = anterior ? i.resumo.percentual - anterior.resumo.percentual : 0;
                      return (
                        <li key={i.id} className="min-w-36 shrink-0">
                          <button type="button" onClick={() => { setVisao('lista'); setAberta(i.id); }}
                            className="w-full rounded-card border border-border bg-white p-2 text-left hover:border-primary">
                            <span className="block text-xs text-text/60">{data(i.data)}</span>
                            <span className={`block text-lg font-bold ${i.resumo.percentual >= 80 ? 'text-success' : 'text-danger'}`}>{i.resumo.percentual}%</span>
                            <span className="block text-[11px] text-text/60">{i.resumo.naoConformes} não conf.{anterior && dif !== 0 ? ` · ${dif > 0 ? '▲' : '▼'} ${Math.abs(dif)}` : ''}</span>
                            <span className="block truncate text-[11px] text-text/50">{i.titulo}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                  {antes && (
                    <div className={`mt-2 grid gap-3 ${depois ? 'sm:grid-cols-2' : 'sm:max-w-xs'}`}>
                      <div>
                        <p className="mb-1 text-xs font-semibold text-text/60">{depois ? 'Antes' : 'Foto'} · {data(antes.data)}</p>
                        <Miniatura grande empresaId={empresaId} inspecao={antes.id} n={0} legenda={antes.fotos[0]?.legenda} />
                      </div>
                      {depois && (
                        <div>
                          <p className="mb-1 text-xs font-semibold text-text/60">Depois · {data(depois.data)}</p>
                          <Miniatura grande empresaId={empresaId} inspecao={depois.id} n={0} legenda={depois.fotos[0]?.legenda} />
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </Cartao>
    </div>
  );
}
