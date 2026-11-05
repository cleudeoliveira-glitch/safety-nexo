'use client';

import Link from 'next/link';
import { useAbaDoEndereco } from '@/lib/abaDoEndereco';
import { useCallback, useEffect, useState } from 'react';
import { CameraRosto } from '@/components/CameraRosto';
import { guardarCaptura } from '@/lib/rosto-offline';
import { EscolherPessoas } from '@/components/EscolherPessoas';
import { EscolherFoto } from '@/components/Foto';
import { ehEmpresa } from '@/lib/sessao';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import {
  Apr,
  buscarConteudoOperacao,
  buscarEmpresa,
  Colaborador,
  ConteudoOperacao,
  criarApr,
  criarDds,
  criarPermissao,
  Dds,
  Empresa,
  encerrarPermissao,
  EtapaApr,
  gerarPdfOperacao,
  listarAprs,
  listarColaboradores,
  listarDds,
  listarPermissoes,
  Permissao,
  rosto,
  salvarArquivo,
  TipoPt,
  buscarModelosChecklist,
  criarInspecao,
  gerarInspecao,
  Inspecao,
  ItemInspecao,
  listarInspecoes,
  ModeloChecklist,
  ia,
  prevencao,
} from '@/lib/api';

type Aba = 'apr' | 'pt' | 'dds' | 'checklist';
const ABAS: [Aba, string][] = [
  ['apr', 'Análise de risco (APR)'],
  ['pt', 'Permissão de trabalho'],
  ['dds', 'DDS'],
  ['checklist', 'Checklist de NRs'],
];
const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
// Data local (não UTC): à noite o UTC já está no dia seguinte.
const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const etapaVazia = (): EtapaApr => ({ etapa: '', riscos: '', medidas: '', epis: '' });
const caixaTexto = 'w-full rounded-card border border-border bg-background px-3 py-2 text-sm';

type Avisar = (tipo: 'erro' | 'ok', texto: string) => void;

function AbaApr({ empresaId, colaboradores, aprs, recarregar, avisar, baixar }: {
  empresaId: string; colaboradores: Colaborador[]; aprs: Apr[]; recarregar: () => Promise<void>; avisar: Avisar; baixar: (id: string, nome: string) => void;
}) {
  const [etapas, setEtapas] = useState<EtapaApr[]>([etapaVazia()]);
  const [equipe, setEquipe] = useState<string[]>([]);
  const mudarEtapa = (i: number, campo: keyof EtapaApr, valor: string) => setEtapas(etapas.map((e, j) => (j === i ? { ...e, [campo]: valor } : e)));
  const [iaLigada, setIaLigada] = useState(false);
  const [fotoApr, setFotoApr] = useState<Blob | null>(null);
  const [pensando, setPensando] = useState(false);
  const [dicaIa, setDicaIa] = useState<string | null>(null);
  useEffect(() => { if (!ehEmpresa()) ia.status().then((x) => setIaLigada(x.ligada)).catch(() => setIaLigada(false)); }, []);

  async function sugerirComIa() {
    const atividade = (document.getElementById('apr-atividade') as HTMLInputElement | null)?.value.trim() ?? '';
    const local = (document.getElementById('apr-local') as HTMLInputElement | null)?.value.trim() ?? '';
    if (atividade.length < 3) return avisar('erro', 'Escreva a atividade primeiro.');
    setPensando(true);
    try {
      const r = await ia.apr(empresaId, atividade, local, fotoApr);
      if (r.etapas.length) setEtapas(r.etapas);
      setDicaIa([r.permissoes.length ? `Pede permissão de trabalho: ${r.permissoes.join(', ')}.` : '', r.observacao ?? ''].filter(Boolean).join(' ') || null);
      avisar('ok', 'A IA sugeriu as etapas. Confira e ajuste antes de salvar.');
    } catch (e) { avisar('erro', (e as Error).message); } finally { setPensando(false); }
  }

  async function salvar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const d = new FormData(form);
    try {
      await criarApr(empresaId, {
        atividade: String(d.get('atividade')).trim(),
        local: String(d.get('local')).trim(),
        data: String(d.get('data')),
        responsavel: String(d.get('responsavel')).trim(),
        equipe,
        etapas: etapas.filter((e) => e.etapa.trim()),
      });
      form.reset();
      setEtapas([etapaVazia()]);
      setEquipe([]);
      setFotoApr(null); setDicaIa(null);
      avisar('ok', 'APR salva. Baixe o PDF para colher as assinaturas da equipe.');
      await recarregar();
    } catch (e) {
      avisar('erro', (e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <Cartao titulo="Nova APR">
        <form className="space-y-4" onSubmit={salvar}>
          <div className="grid gap-4 md:grid-cols-2">
            <Campo id="apr-atividade" name="atividade" rotulo="Atividade" required placeholder="Ex.: Troca de telhas do galpão"
              ajuda={{ oQueE: 'O serviço que será analisado. Faça uma APR para cada atividade fora da rotina ou com risco relevante.' }} />
            <Campo id="apr-local" name="local" rotulo="Local" required placeholder="Ex.: Galpão de estoque" />
            <Campo id="apr-data" name="data" type="date" rotulo="Data" required defaultValue={hoje()} />
            <Campo id="apr-responsavel" name="responsavel" rotulo="Responsável" required placeholder="Ex.: Cleude Oliveira" />
          </div>

          {iaLigada && (
            <div className="space-y-2 rounded-card border border-primary/30 bg-primary/5 p-3 text-sm">
              <p><strong>✨ Montar com IA:</strong> escreva a atividade e o local acima (e, se quiser, tire uma foto do lugar). A IA sugere as etapas, os riscos, as medidas e os EPIs. Você confere tudo.</p>
              <div className="flex flex-wrap items-center gap-3">
                <EscolherFoto foto={fotoApr} mudar={setFotoApr} rotulo="Foto do local (opcional)" />
                <Botao type="button" disabled={pensando} onClick={sugerirComIa}>{pensando ? 'A IA está montando…' : 'Sugerir etapas'}</Botao>
              </div>
              {dicaIa && <p className="text-primary">{dicaIa}</p>}
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-semibold">Etapas da atividade</p>
            <div className="space-y-3">
              {etapas.map((e, i) => (
                <div key={i} className="grid gap-2 rounded-card border border-border p-3 md:grid-cols-4">
                  <textarea aria-label={`Etapa ${i + 1}`} className={caixaTexto} rows={2} placeholder={`Etapa ${i + 1}: o que será feito`} value={e.etapa} onChange={(v) => mudarEtapa(i, 'etapa', v.target.value)} />
                  <textarea aria-label={`Riscos da etapa ${i + 1}`} className={caixaTexto} rows={2} placeholder="Riscos (ex.: queda, choque)" value={e.riscos} onChange={(v) => mudarEtapa(i, 'riscos', v.target.value)} />
                  <textarea aria-label={`Medidas da etapa ${i + 1}`} className={caixaTexto} rows={2} placeholder="Medidas de controle" value={e.medidas} onChange={(v) => mudarEtapa(i, 'medidas', v.target.value)} />
                  <textarea aria-label={`EPIs da etapa ${i + 1}`} className={caixaTexto} rows={2} placeholder="EPIs" value={e.epis} onChange={(v) => mudarEtapa(i, 'epis', v.target.value)} />
                  {etapas.length > 1 && (
                    <button type="button" className="text-left text-xs text-danger md:col-span-4" onClick={() => setEtapas(etapas.filter((_, j) => j !== i))}>Remover etapa</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" className="mt-2 text-sm font-semibold text-primary" onClick={() => setEtapas([...etapas, etapaVazia()])}>+ Adicionar etapa</button>
          </div>

          <EscolherPessoas titulo="Equipe que vai executar" colaboradores={colaboradores} marcados={equipe} mudar={setEquipe} />
          <div className="flex justify-end"><Botao type="submit">Salvar APR</Botao></div>
        </form>
      </Cartao>

      <Cartao titulo="APRs da empresa">
        {aprs.length === 0 ? <p className="text-sm text-text/60">Nenhuma APR ainda.</p> : (
          <ul className="divide-y divide-border text-sm">
            {aprs.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span><strong>Nº {a.numero}</strong> · {a.atividade} · {a.local} · {data(a.data)} · {a.etapas.length} etapa(s)</span>
                <Botao variante="secundario" onClick={() => baixar(a.id, `APR-${a.numero}`)}>Baixar APR</Botao>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

function AbaPt({ empresaId, colaboradores, aprs, permissoes, conteudo, recarregar, avisar, baixar }: {
  empresaId: string; colaboradores: Colaborador[]; aprs: Apr[]; permissoes: Permissao[]; conteudo: ConteudoOperacao;
  recarregar: () => Promise<void>; avisar: Avisar; baixar: (id: string, nome: string) => void;
}) {
  const [tipo, setTipo] = useState<TipoPt>('ALTURA');
  const [marcados, setMarcados] = useState<string[]>([]);
  const [executantes, setExecutantes] = useState<string[]>([]);
  const itens = conteudo.tiposPt[tipo].checklist;
  const pendentes = itens.length - marcados.length;

  async function salvar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const d = new FormData(form);
    try {
      await criarPermissao(empresaId, {
        tipo,
        aprId: String(d.get('aprId') || '') || undefined,
        atividade: String(d.get('atividade')).trim(),
        local: String(d.get('local')).trim(),
        inicio: new Date(String(d.get('inicio'))).toISOString(),
        fim: new Date(String(d.get('fim'))).toISOString(),
        executantes,
        emitente: String(d.get('emitente')).trim(),
        checklist: itens.map((item) => ({ item, ok: marcados.includes(item) })),
      });
      form.reset();
      setMarcados([]);
      setExecutantes([]);
      avisar('ok', 'Permissão emitida. Baixe o PDF para as assinaturas.');
      await recarregar();
    } catch (e) {
      avisar('erro', (e as Error).message);
    }
  }

  const situacao = (p: Permissao) =>
    p.encerradaEm ? ['Encerrada', 'text-text/60'] : new Date(p.fim) < new Date() ? ['Vencida: encerre', 'text-danger'] : ['Aberta', 'text-success'];

  return (
    <div className="space-y-6">
      <Cartao titulo="Nova permissão de trabalho">
        <form className="space-y-4" onSubmit={salvar}>
          <div className="grid gap-4 md:grid-cols-2">
            <Selecao id="pt-tipo" rotulo="Tipo de trabalho" value={tipo} onChange={(e) => { setTipo(e.target.value as TipoPt); setMarcados([]); }}
              ajuda={{ oQueE: 'A permissão autoriza um trabalho de risco por um período curto (normalmente um turno), depois de conferir as condições de segurança.' }}>
              {Object.entries(conteudo.tiposPt).map(([valor, t]) => <option key={valor} value={valor}>{t.nome} ({t.norma})</option>)}
            </Selecao>
            <Selecao id="pt-apr" name="aprId" rotulo="APR da atividade">
              <option value="">Sem APR vinculada</option>
              {aprs.map((a) => <option key={a.id} value={a.id}>Nº {a.numero} · {a.atividade}</option>)}
            </Selecao>
            <Campo id="pt-atividade" name="atividade" rotulo="Atividade" required placeholder="Ex.: Troca de telhas" />
            <Campo id="pt-local" name="local" rotulo="Local" required placeholder="Ex.: Galpão" />
            <Campo id="pt-inicio" name="inicio" type="datetime-local" rotulo="Válida a partir de" required />
            <Campo id="pt-fim" name="fim" type="datetime-local" rotulo="Válida até" required />
            <Campo id="pt-emitente" name="emitente" rotulo="Emitente" required placeholder="Quem libera o trabalho" />
          </div>

          <fieldset className="rounded-card border border-border p-3">
            <legend className="px-1 text-sm font-semibold">Verificações: {conteudo.tiposPt[tipo].nome}</legend>
            <p className="mb-2 text-xs text-text/60">Marque o que foi conferido. Os itens são uma sugestão; o que ficar desmarcado sai como &quot;não&quot; no PDF.</p>
            <div className="space-y-1.5">
              {itens.map((item) => (
                <label key={item} className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={marcados.includes(item)}
                    onChange={(e) => setMarcados(e.target.checked ? [...marcados, item] : marcados.filter((m) => m !== item))} />
                  {item}
                </label>
              ))}
            </div>
            {pendentes > 0 && <p className="mt-2 text-xs font-semibold text-warning">{pendentes} item(ns) sem conferir.</p>}
          </fieldset>

          <EscolherPessoas titulo="Executantes" colaboradores={colaboradores} marcados={executantes} mudar={setExecutantes} />
          <div className="flex justify-end"><Botao type="submit">Emitir permissão</Botao></div>
        </form>
      </Cartao>

      <Cartao titulo="Permissões emitidas">
        {permissoes.length === 0 ? <p className="text-sm text-text/60">Nenhuma permissão ainda.</p> : (
          <ul className="divide-y divide-border text-sm">
            {permissoes.map((p) => {
              const [rotulo, cor] = situacao(p);
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span>
                    <strong>Nº {p.numero}</strong> · {conteudo.tiposPt[p.tipo]?.nome ?? p.tipo} · {p.atividade} · até {dataHora(p.fim)} ·{' '}
                    <span className={`font-semibold ${cor}`}>{rotulo}</span>
                  </span>
                  <span className="flex gap-2">
                    {!p.encerradaEm && (
                      <Botao variante="secundario" onClick={async () => {
                        try { await encerrarPermissao(empresaId, p.id); avisar('ok', `Permissão nº ${p.numero} encerrada.`); await recarregar(); }
                        catch (e) { avisar('erro', (e as Error).message); }
                      }}>Encerrar</Botao>
                    )}
                    <Botao variante="secundario" onClick={() => baixar(p.id, `Permissao-${p.numero}`)}>Baixar PT</Botao>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

function AbaDds({ empresaId, colaboradores, lista, conteudo, recarregar, avisar, baixar }: {
  empresaId: string; colaboradores: Colaborador[]; lista: Dds[]; conteudo: ConteudoOperacao;
  recarregar: () => Promise<void>; avisar: Avisar; baixar: (id: string, nome: string) => void;
}) {
  const [tema, setTema] = useState('');
  const [texto, setTexto] = useState('');
  const [participantes, setParticipantes] = useState<string[]>([]);
  const [categoria, setCategoria] = useState('');
  const [busca, setBusca] = useState('');
  const [camera, setCamera] = useState<Dds | null>(null);
  const [rostoDds, setRostoDds] = useState(false);
  useEffect(() => { rosto.config().then((c) => setRostoDds(c.ativo && c.usos.DDS)).catch(() => setRostoDds(false)); }, []);
  const categorias = [...new Set(conteudo.temasDds.map((t) => t.categoria))].sort();
  const feitos = new Set(lista.map((d) => d.tema));
  const semAcento = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtrados = conteudo.temasDds.filter(
    (t) => (!categoria || t.categoria === categoria) && (!busca.trim() || semAcento(`${t.tema} ${t.conteudo}`).includes(semAcento(busca.trim()))),
  );

  // O texto pronto vem com a pergunta para abrir a conversa (DDS vivencial).
  function escolherTema(nome: string) {
    setTema(nome);
    const pronto = conteudo.temasDds.find((t) => t.tema === nome);
    if (pronto) setTexto(`${pronto.conteudo}\n\nPara conversar com a equipe: ${pronto.pergunta}`);
  }

  async function salvar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const d = new FormData(form);
    try {
      await criarDds(empresaId, {
        tema: tema.trim(),
        conteudo: texto,
        data: String(d.get('data')),
        duracaoMin: Number(d.get('duracaoMin') || 10),
        ministrante: String(d.get('ministrante')).trim(),
        participantes,
      });
      form.reset();
      setTema('');
      setTexto('');
      setParticipantes([]);
      avisar('ok', 'DDS registrado. Baixe a lista de presença para assinatura.');
      await recarregar();
    } catch (e) {
      avisar('erro', (e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <Cartao titulo="Novo DDS">
        <form className="space-y-4" onSubmit={salvar}>
          <div className="grid gap-4 md:grid-cols-2">
            <Selecao id="dds-categoria" rotulo="Assunto" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="">Todos os assuntos</option>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </Selecao>
            <Campo id="dds-busca" rotulo="Procurar tema" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: forno, escada, extintor" />
            <Selecao id="dds-pronto" rotulo="Tema pronto" value={conteudo.temasDds.some((t) => t.tema === tema) ? tema : ''} onChange={(e) => escolherTema(e.target.value)}
              ajuda={{ oQueE: 'Conversa curta de segurança no início do turno. Cada tema traz o texto e uma pergunta para a equipe participar. Os marcados com ✓ já foram feitos nesta empresa.' }}>
              <option value="">Escolher da biblioteca ({filtrados.length} de {conteudo.temasDds.length} temas)</option>
              {categorias.filter((c) => filtrados.some((t) => t.categoria === c)).map((c) => (
                <optgroup key={c} label={c}>
                  {filtrados.filter((t) => t.categoria === c).map((t) => <option key={t.tema} value={t.tema}>{feitos.has(t.tema) ? '✓ ' : ''}{t.tema}</option>)}
                </optgroup>
              ))}
            </Selecao>
            <Campo id="dds-tema" rotulo="Tema" required value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Ou escreva um tema" />
          </div>
          <div>
            <label htmlFor="dds-texto" className="mb-1.5 block text-sm font-semibold">O que falar</label>
            <textarea id="dds-texto" className={caixaTexto} rows={5} required value={texto} onChange={(e) => setTexto(e.target.value)} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Campo id="dds-data" name="data" type="date" rotulo="Data" required defaultValue={hoje()} />
            <Campo id="dds-duracao" name="duracaoMin" type="number" min={1} rotulo="Duração (minutos)" required defaultValue={10} />
            <Campo id="dds-ministrante" name="ministrante" rotulo="Ministrante" required placeholder="Quem conduziu" />
          </div>
          <EscolherPessoas titulo="Participantes" colaboradores={colaboradores} marcados={participantes} mudar={setParticipantes} />
          <div className="flex justify-end"><Botao type="submit">Registrar DDS</Botao></div>
        </form>
      </Cartao>

      <Cartao titulo="DDS realizados">
        {lista.length === 0 ? <p className="text-sm text-text/60">Nenhum DDS ainda.</p> : (
          <ul className="divide-y divide-border text-sm">
            {lista.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span><strong>{data(d.data)}</strong> · {d.tema} · {d.participantes.length} participante(s)</span>
                <span className="flex flex-wrap gap-2">
                  <Link href={`/empresas/${empresaId}/lista/dds/${d.id}`} className="rounded-card bg-primary px-4 py-2 text-sm font-semibold text-white">Lista para assinar</Link>
                  {rostoDds && <Botao variante="secundario" onClick={() => setCamera(d)}>Presença pelo rosto</Botao>}
                  <Botao variante="secundario" onClick={() => baixar(d.id, `DDS-${d.data.slice(0, 10)}`)}>Baixar lista de presença</Botao>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
      {camera && (
        <CameraRosto titulo={`Presença no DDS: ${camera.tema}`} modo="continuo" onFechar={() => { setCamera(null); recarregar(); }}
          guardarOffline={async (c) => { await guardarCaptura({ tipo: 'DDS', empresaId, refId: camera.id, titulo: camera.tema, dados: { descritor: c.descritor, foto: c.foto, latitude: c.latitude, longitude: c.longitude, precisao: c.precisao, provaDeVida: c.provaDeVida } }); return 'Sem internet: guardado no aparelho. Será conferido e enviado quando a internet voltar.'; }}
          onCaptura={async (c) => { const r = await rosto.presencaDds(empresaId, camera.id, { descritor: c.descritor, foto: c.foto, latitude: c.latitude, longitude: c.longitude, precisao: c.precisao, provaDeVida: c.provaDeVida }); return r.repetido ? `${r.nome} já estava com presença` : `${r.nome}: presença registrada`; }} />
      )}
    </div>
  );
}

const RESPOSTAS: [ItemInspecao['resposta'], string, string][] = [
  ['C', 'Conforme', 'bg-success text-white'],
  ['NC', 'Não conforme', 'bg-danger text-white'],
  ['NA', 'Não se aplica', 'bg-text/60 text-white'],
];

function AbaChecklist({ empresaId, lista, modelos, recarregar, avisar }: {
  empresaId: string; lista: Inspecao[]; modelos: ModeloChecklist[]; recarregar: () => Promise<void>; avisar: Avisar;
}) {
  const [modelo, setModelo] = useState('');
  const [itens, setItens] = useState<(Omit<ItemInspecao, 'resposta'> & { resposta: ItemInspecao['resposta'] | '' })[]>([]);
  const [novoItem, setNovoItem] = useState('');
  const [chave, setChave] = useState(0);

  function escolher(valor: string) {
    setModelo(valor);
    const m = modelos.find((x) => x.modelo === valor);
    setItens((m?.itens ?? []).map((texto) => ({ texto, resposta: '' })));
  }
  const mudar = (i: number, campos: Partial<ItemInspecao>) => setItens((x) => x.map((it, j) => (j === i ? { ...it, ...campos } : it)));

  async function salvar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const d = new FormData(ev.currentTarget);
    const t = (c: string) => String(d.get(c) ?? '').trim();
    const faltam = itens.filter((i) => !i.resposta).length;
    if (faltam) return avisar('erro', `Responda todos os itens: faltam ${faltam}.`);
    try {
      await criarInspecao(empresaId, {
        modelo: modelo || 'LIVRE',
        titulo: modelos.find((m) => m.modelo === modelo)?.titulo ?? t('titulo'),
        local: t('local'), data: t('data'), inspetor: t('inspetor'),
        itens: itens.map((i) => ({ texto: i.texto, resposta: i.resposta as ItemInspecao['resposta'], ...(i.observacao?.trim() ? { observacao: i.observacao.trim() } : {}) })),
      });
      setModelo(''); setItens([]); setChave((k) => k + 1);
      avisar('ok', 'Inspeção salva. Baixe o relatório: as não conformidades já saem no plano de ação.');
      await recarregar();
    } catch (e) {
      avisar('erro', (e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <Cartao titulo="Nova inspeção">
        <form key={chave} className="space-y-4" onSubmit={salvar}>
          <div className="grid gap-4 md:grid-cols-3">
            <Selecao id="ck-modelo" rotulo="Checklist" value={modelo} onChange={(e) => escolher(e.target.value)} className="md:col-span-3"
              ajuda={{ oQueE: 'Escolha a norma para carregar os itens prontos. Você pode reescrever, tirar ou incluir itens antes de salvar.' }}>
              <option value="">Checklist livre (montar do zero)</option>
              {modelos.map((m) => <option key={m.modelo} value={m.modelo}>{m.titulo}</option>)}
            </Selecao>
            {!modelo && <Campo id="ck-titulo" name="titulo" rotulo="Nome do checklist" required placeholder="Ex.: Inspeção do almoxarifado" className="md:col-span-3" />}
            <Campo id="ck-local" name="local" rotulo="Local inspecionado" required placeholder="Ex.: Produção" />
            <Campo id="ck-data" name="data" type="date" rotulo="Data" required defaultValue={hoje()} />
            <Campo id="ck-inspetor" name="inspetor" rotulo="Inspetor(a)" required placeholder="Quem fez a inspeção" />
          </div>

          {itens.length > 0 && (
            <ol className="divide-y divide-border rounded-card border border-border">
              {itens.map((it, i) => (
                <li key={i} className="space-y-2 p-3 text-sm">
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
                    <input aria-label={`Observação ${i + 1}`} value={it.observacao ?? ''} onChange={(e) => mudar(i, { observacao: e.target.value })}
                      placeholder="O que está errado? Ex.: caixas bloqueando a saída dos fundos" className={caixaTexto} />
                  )}
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <Campo id="ck-novo" rotulo="Incluir item" value={novoItem} onChange={(e) => setNovoItem(e.target.value)} className="min-w-64 flex-1" placeholder="Ex.: Escada de acesso ao mezanino com corrimão" />
            <Botao type="button" variante="secundario" onClick={() => { if (novoItem.trim()) { setItens((x) => [...x, { texto: novoItem.trim(), resposta: '' }]); setNovoItem(''); } }}>Incluir</Botao>
          </div>
          <div className="flex justify-end"><Botao type="submit" disabled={!itens.length}>Salvar inspeção</Botao></div>
        </form>
      </Cartao>

      <Cartao titulo="Inspeções feitas">
        {lista.length === 0 ? <p className="text-sm text-text/60">Nenhuma inspeção ainda.</p> : (
          <ul className="divide-y divide-border text-sm">
            {lista.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>
                  <strong>{i.titulo}</strong> · {i.local} · {data(i.data)} ·{' '}
                  <span className={`font-semibold ${i.resumo.percentual >= 80 ? 'text-success' : 'text-danger'}`}>{i.resumo.percentual}% conforme</span>
                  {i.resumo.naoConformes > 0 && <span className="text-text/60"> · {i.resumo.naoConformes} não conformidade(s)</span>}
                </span>
                <span className="flex flex-wrap gap-2">
                  {i.resumo.naoConformes > 0 && <Botao variante="secundario" onClick={async () => {
                    try { const r = await prevencao.acoesDaInspecao(empresaId, i.id); avisar('ok', r.criadas ? `${r.criadas} ação(ões) criadas no plano de ação.` : 'As não conformidades já estavam no plano de ação.'); }
                    catch (e) { avisar('erro', (e as Error).message); }
                  }}>Levar ao plano de ação</Botao>}
                  <Botao variante="secundario" onClick={async () => {
                    try { salvarArquivo(await gerarInspecao(empresaId, i.id), `Inspecao-${i.modelo}-${i.data.slice(0, 10)}.pdf`); }
                    catch (e) { avisar('erro', (e as Error).message); }
                  }}>Baixar relatório</Botao>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

export default function OperacaoPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [aba, setAba] = useState<Aba>('apr');
  useAbaDoEndereco(ABAS.map(([a]) => a), setAba);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [conteudo, setConteudo] = useState<ConteudoOperacao | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [aprs, setAprs] = useState<Apr[]>([]);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [dds, setDds] = useState<Dds[]>([]);
  const [inspecoes, setInspecoes] = useState<Inspecao[]>([]);
  const [modelos, setModelos] = useState<ModeloChecklist[]>([]);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const [e, ct, c, a, p, d] = await Promise.all([
        buscarEmpresa(empresaId), buscarConteudoOperacao(), listarColaboradores(empresaId),
        listarAprs(empresaId), listarPermissoes(empresaId), listarDds(empresaId),
      ]);
      const [ins, mod] = await Promise.all([listarInspecoes(empresaId), buscarModelosChecklist()]);
      setEmpresa(e); setConteudo(ct); setColaboradores(c); setAprs(a); setPermissoes(p); setDds(d); setInspecoes(ins); setModelos(mod);
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }, [empresaId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const avisar: Avisar = (tipo, texto) => setAviso({ tipo, texto });
  const baixador = (tipo: 'aprs' | 'permissoes' | 'dds') => async (id: string, nome: string) => {
    try {
      salvarArquivo(await gerarPdfOperacao(empresaId, tipo, id), `${nome}-${empresa?.razaoSocial ?? 'empresa'}.pdf`);
    } catch (e) {
      avisar('erro', (e as Error).message);
    }
  };

  if (!empresa || !conteudo) {
    return <main className="p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando…'}</main>;
  }

  const comum = { empresaId, colaboradores, recarregar, avisar };
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div>
        <Link href="/" className="text-sm text-primary">← Voltar ao painel</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Operação diária</h1>
        <p className="text-text/60">{empresa.razaoSocial}</p>
      </div>

      <div role="tablist" className="flex flex-wrap gap-2">
        {ABAS.map(([valor, nome]) => (
          <button key={valor} role="tab" aria-selected={aba === valor} onClick={() => { setAba(valor); setAviso(null); history.replaceState(null, '', `#${valor}`); }}
            className={`rounded-card px-4 py-2 text-sm font-semibold ${aba === valor ? 'bg-primary text-white' : 'border border-border bg-white'}`}>
            {nome}
          </button>
        ))}
      </div>

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      {aba === 'apr' && <AbaApr {...comum} aprs={aprs} baixar={baixador('aprs')} />}
      {aba === 'pt' && <AbaPt {...comum} aprs={aprs} permissoes={permissoes} conteudo={conteudo} baixar={baixador('permissoes')} />}
      {aba === 'dds' && <AbaDds {...comum} lista={dds} conteudo={conteudo} baixar={baixador('dds')} />}
      {aba === 'checklist' && <AbaChecklist empresaId={empresaId} lista={inspecoes} modelos={modelos} recarregar={recarregar} avisar={avisar} />}
    </main>
  );
}
