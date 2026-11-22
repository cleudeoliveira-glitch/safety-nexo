'use client';

import Link from 'next/link';
import { useAbaDoEndereco } from '@/lib/abaDoEndereco';
import { useCallback, useEffect, useState } from 'react';
import { CameraRosto } from '@/components/CameraRosto';
import { guardarCaptura } from '@/lib/rosto-offline';
import { EscolherPessoas } from '@/components/EscolherPessoas';
import { RoteiroDds, textoDoRoteiro } from '@/components/RoteiroDds';
import { EscolherFoto } from '@/components/Foto';
import { AbaChecklist } from '@/components/Inspecoes';
import { ehEmpresa } from '@/lib/sessao';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import {
  Apr,
  buscarConteudoOperacao,
  confinados,
  type DetalhesPt,
  type EspacoConfinado,
  type PlanoResgate,
  planosResgate,
  buscarEmpresa,
  Colaborador,
  ConteudoOperacao,
  criarApr,
  criarDds,
  sugestoesDds,
  SugestoesDds,
  criarPermissao,
  Dds,
  Empresa,
  encerrarPermissao,
  registrarMedicaoGas,
  type MedicaoGas,
  EtapaApr,
  gerarPdfOperacao,
  listarAprs,
  listarColaboradores,
  listarGhes,
  type Ghe,
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
  ['checklist', 'Inspeções'],
];
const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
// Data local (não UTC): à noite o UTC já está no dia seguinte.
const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const etapaVazia = (): EtapaApr => ({ etapa: '', riscos: '', medidas: '', epis: '' });
const caixaTexto = 'w-full rounded-card border border-border bg-background px-3 py-2 text-sm';

type Avisar = (tipo: 'erro' | 'ok', texto: string) => void;
// O campo "Local" já vem com o local padrão da empresa; os setores dos GHEs aparecem como sugestão (lista "locais-empresa").
type DaEmpresa = { localPadrao: string; ghes: Ghe[] };
const TIPO_RISCO: Record<string, string> = { FISICO: 'físico', QUIMICO: 'químico', BIOLOGICO: 'biológico', ERGONOMICO: 'ergonômico', ACIDENTE: 'acidente' };

function AbaApr({ empresaId, colaboradores, aprs, recarregar, avisar, baixar, localPadrao, ghes }: {
  empresaId: string; colaboradores: Colaborador[]; aprs: Apr[]; recarregar: () => Promise<void>; avisar: Avisar; baixar: (id: string, nome: string) => void;
} & DaEmpresa) {
  // Setor (GHE) da atividade: os riscos do ambiente vêm do PGR e entram na APR.
  const [gheId, setGheId] = useState('');
  const gheEscolhido = ghes.find((g) => g.id === gheId) ?? null;
  function escolherSetor(id: string) {
    setGheId(id);
    const g = ghes.find((x) => x.id === id);
    const campo = document.getElementById('apr-local') as HTMLInputElement | null;
    // Troca o local pelo setor só se ele ainda estiver com o local padrão (ou vazio): não apaga o que a pessoa escreveu.
    if (g?.setor && campo && (!campo.value.trim() || campo.value.trim() === localPadrao || ghes.some((x) => x.setor === campo.value.trim()))) campo.value = g.setor;
  }
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
        gheId: gheId || null,
        data: String(d.get('data')),
        responsavel: String(d.get('responsavel')).trim(),
        equipe,
        etapas: etapas.filter((e) => e.etapa.trim()),
      });
      form.reset();
      setEtapas([etapaVazia()]);
      setEquipe([]);
      setGheId('');
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
            <Campo id="apr-atividade" name="atividade" rotulo="Atividade" required placeholder="Ex.: Troca de telhas do galpão" />
            {ghes.length > 0 && (
              <Selecao id="apr-ghe" rotulo="Setor (GHE) onde vai ser feita" value={gheId} onChange={(e) => escolherSetor(e.target.value)}
                title="Os riscos que o PGR já tem para esse setor entram na APR como riscos do ambiente.">
                <option value="">Fora dos setores cadastrados</option>
                {ghes.map((g) => <option key={g.id} value={g.id}>{g.codigo ? `${g.codigo} · ` : ''}{g.nome}</option>)}
              </Selecao>
            )}
            <Campo id="apr-local" name="local" rotulo="Local" required placeholder="Ex.: Galpão de estoque" defaultValue={localPadrao} list="locais-empresa" />
            <Campo id="apr-data" name="data" type="date" rotulo="Data" required defaultValue={hoje()} />
            <Campo id="apr-responsavel" name="responsavel" rotulo="Responsável" required placeholder="Ex.: Cleude Oliveira" />
          </div>

          {gheEscolhido && (
            <div className="rounded-card border border-border bg-background p-3 text-sm">
              <p className="font-semibold text-primary">Riscos do ambiente ({gheEscolhido.setor || gheEscolhido.nome}), conforme o PGR</p>
              {gheEscolhido.riscos.length ? (
                <ul className="mt-1 list-disc pl-5">
                  {gheEscolhido.riscos.map((r) => (
                    <li key={r.id}>{r.agente} ({TIPO_RISCO[r.tipo] ?? r.tipo}) · {r.fonteGeradora}{r.medidasEpi ? ` · EPI: ${r.medidasEpi}` : ''}</li>
                  ))}
                </ul>
              ) : <p className="text-text/60">Nenhum risco cadastrado para este setor ainda.</p>}
              <p className="mt-1 text-xs text-text/60">Eles saem no PDF da APR. Nas etapas abaixo, escreva os riscos próprios desta atividade.</p>
            </div>
          )}

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

// Campos de uma medição de gases. Oxigênio e inflamáveis são obrigatórios quando se mede.
function CamposMedicao({ prefixo }: { prefixo: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Campo id={`${prefixo}-hora`} name="medHora" type="datetime-local" rotulo="Hora da medição" />
      <Campo id={`${prefixo}-o2`} name="medO2" type="number" step="0.1" rotulo="Oxigênio (%)" placeholder="Entre 19,5 e 23" />
      <Campo id={`${prefixo}-lie`} name="medLie" type="number" step="0.1" rotulo="Inflamáveis (% do LIE)" placeholder="Abaixo de 10" />
      <Campo id={`${prefixo}-h2s`} name="medH2s" type="number" step="0.1" rotulo="H2S (ppm)" placeholder="Até 8" />
      <Campo id={`${prefixo}-co`} name="medCo" type="number" step="0.1" rotulo="CO (ppm)" placeholder="Até 39" />
      <Campo id={`${prefixo}-outro`} name="medOutro" rotulo="Outro gás" placeholder="Ex.: NH3 5 ppm" />
      <Campo id={`${prefixo}-quem`} name="medQuem" rotulo="Quem mediu" />
    </div>
  );
}

function lerMedicao(d: FormData): MedicaoGas | null {
  const txt = (c: string) => String(d.get(c) ?? '').trim();
  if (!txt('medO2') && !txt('medLie')) return null;
  const n = (c: string) => (txt(c) ? Number(txt(c).replace(',', '.')) : null);
  if (n('medO2') === null || n('medLie') === null) throw new Error('Na medição, informe pelo menos o oxigênio e os inflamáveis.');
  if (!txt('medQuem')) throw new Error('Na medição, informe quem mediu.');
  return {
    hora: txt('medHora') ? new Date(txt('medHora')).toISOString() : new Date().toISOString(),
    oxigenio: n('medO2')!, lie: n('medLie')!, h2s: n('medH2s'), co: n('medCo'), outro: txt('medOutro') || null, responsavel: txt('medQuem'),
  };
}

function NovaMedicao({ aoSalvar }: { aoSalvar: (m: MedicaoGas) => Promise<void> }) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  if (!aberto) return <Botao variante="secundario" onClick={() => setAberto(true)}>Lançar medição</Botao>;
  return (
    <form className="w-full space-y-2 rounded-card border border-border p-3" onSubmit={async (ev) => {
      ev.preventDefault();
      try {
        const m = lerMedicao(new FormData(ev.currentTarget));
        if (!m) throw new Error('Informe o oxigênio e os inflamáveis.');
        await aoSalvar(m); setAberto(false); setErro(null);
      } catch (e) { setErro((e as Error).message); }
    }}>
      <CamposMedicao prefixo="nova" />
      {erro && <p className="text-xs font-semibold text-danger">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Botao type="button" variante="secundario" onClick={() => setAberto(false)}>Cancelar</Botao>
        <Botao type="submit">Salvar medição</Botao>
      </div>
    </form>
  );
}

function AbaPt({ empresaId, colaboradores, aprs, permissoes, conteudo, recarregar, avisar, baixar, localPadrao }: DaEmpresa & {
  empresaId: string; colaboradores: Colaborador[]; aprs: Apr[]; permissoes: Permissao[]; conteudo: ConteudoOperacao;
  recarregar: () => Promise<void>; avisar: Avisar; baixar: (id: string, nome: string) => void;
}) {
  const [tipo, setTipo] = useState<TipoPt>('ALTURA');
  const [marcados, setMarcados] = useState<string[]>([]);
  const [executantes, setExecutantes] = useState<string[]>([]);
  const [espacos, setEspacos] = useState<EspacoConfinado[]>([]);
  const [planos, setPlanos] = useState<PlanoResgate[]>([]);
  const [peso, setPeso] = useState('');
  const [capacidade, setCapacidade] = useState('');
  const itens = conteudo.tiposPt[tipo].checklist;
  const confinado = tipo === 'ESPACO_CONFINADO';
  const icamento = tipo === 'ICAMENTO';
  const escavacao = tipo === 'ESCAVACAO';
  const comResgate = tipo === 'ALTURA' || confinado;
  const planosDoTipo = planos.filter((p) => p.tipo === tipo);
  const numero = (v: string) => (v.trim() ? Number(v.replace(',', '.')) : undefined);
  const usoCarga = numero(peso) && numero(capacidade) ? Math.round((numero(peso)! / numero(capacidade)!) * 100) : null;

  useEffect(() => {
    confinados.listar(empresaId).then((l) => setEspacos(l.filter((x) => x.ativo))).catch(() => setEspacos([]));
    planosResgate.listar(empresaId).then(setPlanos).catch(() => setPlanos([]));
  }, [empresaId]);

  function lerDetalhes(d: FormData): DetalhesPt | undefined {
    const t = (k: string) => String(d.get(k) ?? '').trim() || undefined;
    if (icamento) return { equipamento: t('equipamento'), pesoCargaKg: numero(peso), capacidadeKg: numero(capacidade), operador: t('operador'), sinaleiro: t('sinaleiro') };
    if (escavacao) return { profundidadeM: numero(String(d.get('profundidade') ?? '')), tipoSolo: t('tipoSolo'), contencao: t('contencao') };
    return undefined;
  }
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
        ...(confinado ? { supervisorEntrada: String(d.get('supervisorEntrada')).trim(), vigia: String(d.get('vigia')).trim(), medicoes: lerMedicao(d) ? [lerMedicao(d)!] : [] } : {}),
        ...(lerDetalhes(d) ? { detalhes: lerDetalhes(d) } : {}),
        ...(confinado && d.get('espacoId') ? { espacoId: String(d.get('espacoId')) } : {}),
        ...(comResgate && d.get('planoResgateId') ? { planoResgateId: String(d.get('planoResgateId')) } : {}),
      });
      form.reset();
      setPeso('');
      setCapacidade('');
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
            <Selecao id="pt-tipo" rotulo="Tipo de trabalho" value={tipo} onChange={(e) => { setTipo(e.target.value as TipoPt); setMarcados([]); }}>
              {Object.entries(conteudo.tiposPt).map(([valor, t]) => <option key={valor} value={valor}>{t.nome} ({t.norma})</option>)}
            </Selecao>
            <Selecao id="pt-apr" name="aprId" rotulo="APR da atividade">
              <option value="">Sem APR vinculada</option>
              {aprs.map((a) => <option key={a.id} value={a.id}>Nº {a.numero} · {a.atividade}</option>)}
            </Selecao>
            <Campo id="pt-atividade" name="atividade" rotulo="Atividade" required placeholder="Ex.: Troca de telhas" />
            <Campo id="pt-local" name="local" rotulo="Local" required placeholder="Ex.: Galpão" defaultValue={localPadrao} list="locais-empresa" />
            <Campo id="pt-inicio" name="inicio" type="datetime-local" rotulo="Válida a partir de" required />
            <Campo id="pt-fim" name="fim" type="datetime-local" rotulo="Válida até" required />
            <Campo id="pt-emitente" name="emitente" rotulo="Emitente" required placeholder="Quem libera o trabalho" />
            {confinado && <>
              <Campo id="pt-supervisor" name="supervisorEntrada" rotulo="Supervisor de entrada" required placeholder="Quem autoriza a entrada" />
              <Campo id="pt-vigia" name="vigia" rotulo="Vigia" required placeholder="Quem fica do lado de fora" />
              <Selecao id="pt-espaco" name="espacoId" rotulo="Espaço confinado (do cadastro)">
                <option value="">{espacos.length ? 'Escolha o espaço' : 'Nenhum espaço cadastrado ainda'}</option>
                {espacos.map((x) => <option key={x.id} value={x.id}>{x.codigo} · {x.nome}</option>)}
              </Selecao>
            </>}
            {comResgate && (
              <Selecao id="pt-resgate" name="planoResgateId" rotulo="Plano de resgate">
                <option value="">{planosDoTipo.length ? 'Escolha o plano' : 'Nenhum plano deste tipo ainda'}</option>
                {planosDoTipo.map((x) => <option key={x.id} value={x.id}>Nº {x.numero} · {x.titulo}</option>)}
              </Selecao>
            )}
          </div>
          {comResgate && (
            <p className="text-xs text-text/60">
              {confinado ? 'O cadastro dos espaços e os' : 'Os'} planos de resgate ficam em{' '}
              <Link href={`/empresas/${empresaId}/confinados`} className="font-semibold text-primary underline">Espaços confinados e resgate</Link>.
            </p>
          )}

          {icamento && (
            <fieldset className="grid gap-4 rounded-card border border-border p-3 md:grid-cols-3">
              <legend className="px-1 text-sm font-semibold">Dados do içamento</legend>
              <Campo id="pt-equip" name="equipamento" rotulo="Equipamento" placeholder="Ex.: Caminhão munck 20 t" />
              <Campo id="pt-peso" rotulo="Peso da carga com acessórios (kg)" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Ex.: 1200" />
              <Campo id="pt-capacidade" rotulo="Capacidade no raio de trabalho (kg)" inputMode="decimal" value={capacidade} onChange={(e) => setCapacidade(e.target.value)} placeholder="Ex.: 3000" />
              <Campo id="pt-operador" name="operador" rotulo="Operador" placeholder="Nome do operador" />
              <Campo id="pt-sinaleiro" name="sinaleiro" rotulo="Sinaleiro (rigger)" placeholder="Nome do sinaleiro" />
              {usoCarga !== null && (
                <p className={`self-end pb-3 text-sm font-semibold ${usoCarga > 100 ? 'text-danger' : usoCarga > 75 ? 'text-[#c2410c]' : 'text-success'}`}>
                  {usoCarga > 100 ? `A carga passa da capacidade (${usoCarga}%). Não pode içar.` : usoCarga > 75 ? `Usa ${usoCarga}% da capacidade: faça o plano de rigging.` : `Usa ${usoCarga}% da capacidade.`}
                </p>
              )}
            </fieldset>
          )}

          {escavacao && (
            <fieldset className="grid gap-4 rounded-card border border-border p-3 md:grid-cols-3">
              <legend className="px-1 text-sm font-semibold">Dados da escavação</legend>
              <Campo id="pt-prof" name="profundidade" rotulo="Profundidade (m)" inputMode="decimal" placeholder="Ex.: 1,8" />
              <Campo id="pt-solo" name="tipoSolo" rotulo="Tipo de solo" placeholder="Ex.: Argiloso, úmido" />
              <Campo id="pt-contencao" name="contencao" rotulo="Contenção" placeholder="Ex.: Escoramento de madeira" />
              <p className="text-xs text-text/60 md:col-span-3">Acima de 1,25 m de profundidade, o talude precisa estar estável (escoramento ou talude conforme projeto) antes de alguém entrar na vala.</p>
            </fieldset>
          )}

          {confinado && (
            <fieldset className="rounded-card border border-border p-3">
              <legend className="px-1 text-sm font-semibold">Medição antes da entrada</legend>
              <p className="mb-2 text-xs text-text/60">Valores do detector de gases. Se ainda não mediu, deixe em branco: o PDF sai com a tabela para preencher à mão, e dá para lançar as medições depois na lista abaixo.</p>
              <CamposMedicao prefixo="pt" />
            </fieldset>
          )}

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
                    {p.tipo === 'ESPACO_CONFINADO' && <span className="text-text/60"> · {p.espaco ? `${p.espaco.codigo} · ` : ''}{p.medicoes?.length ?? 0} medição(ões)</span>}
                  </span>
                  <span className="flex gap-2">
                    {!p.encerradaEm && p.tipo === 'ESPACO_CONFINADO' && (
                      <NovaMedicao aoSalvar={async (m) => {
                        try { await registrarMedicaoGas(empresaId, p.id, m); avisar('ok', `Medição lançada na permissão nº ${p.numero}.`); await recarregar(); }
                        catch (e) { avisar('erro', (e as Error).message); }
                      }} />
                    )}
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

function AbaDds({ empresaId, colaboradores, lista, conteudo, recarregar, avisar, baixar, localPadrao }: DaEmpresa & {
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
  const [sugestoes, setSugestoes] = useState<SugestoesDds | null>(null);
  useEffect(() => { sugestoesDds(empresaId).then(setSugestoes).catch(() => setSugestoes(null)); }, [empresaId, lista.length]);
  useEffect(() => { rosto.config().then((c) => setRostoDds(c.ativo && c.usos.DDS)).catch(() => setRostoDds(false)); }, []);
  const categorias = [...new Set(conteudo.temasDds.map((t) => t.categoria))].sort();
  const feitos = new Set(lista.map((d) => d.tema));
  const semAcento = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtrados = conteudo.temasDds.filter(
    (t) => (!categoria || t.categoria === categoria) && (!busca.trim() || semAcento(`${t.tema} ${t.conteudo}`).includes(semAcento(busca.trim()))),
  );

  // O texto pronto vem com o caso para contar, a dinâmica vivencial e a pergunta para a equipe.
  function escolherTema(nome: string) {
    setTema(nome);
    const pronto = conteudo.temasDds.find((t) => t.tema === nome);
    if (pronto) setTexto(textoDoRoteiro(pronto));
  }
  const escolhido = conteudo.temasDds.find((t) => t.tema === tema);

  // Vindo da Biblioteca de DDS (?tema=...), o tema já abre escolhido.
  useEffect(() => {
    const pedido = new URLSearchParams(window.location.search).get('tema');
    if (pedido) escolherTema(pedido);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        ...(String(d.get('local') ?? '').trim() ? { local: String(d.get('local')).trim() } : {}),
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
          {sugestoes && (sugestoes.sugestoes.length > 0 ? (
            <div className="rounded-card border border-primary/30 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-primary">Temas sugeridos para esta empresa</p>
              <p className="mb-3 text-xs text-text/60">Escolhidos pelos riscos dos GHEs e pelos trabalhos com PT. Os temas dados nos últimos 90 dias ficam de fora.</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {sugestoes.sugestoes.map((s) => (
                  <button key={s.tema} type="button" onClick={() => escolherTema(s.tema)}
                    className={`rounded-card border p-3 text-left text-sm transition ${tema === s.tema ? 'border-primary bg-white ring-2 ring-primary/30' : 'border-border bg-white hover:border-primary'}`}>
                    <span className="block font-semibold">{s.tema}</span>
                    <span className="mt-0.5 block text-xs text-text/60">{s.motivo}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : !sugestoes.temRiscos && (
            <p className="rounded-card bg-background px-3 py-2 text-sm text-text/60">Quando os riscos dos GHEs estiverem cadastrados, aparecem aqui temas de DDS sugeridos para esta empresa.</p>
          ))}
          <div className="grid gap-4 md:grid-cols-2">
            <Selecao id="dds-categoria" rotulo="Assunto" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="">Todos os assuntos</option>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </Selecao>
            <Campo id="dds-busca" rotulo="Procurar tema" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: forno, escada, extintor" />
            <Selecao id="dds-pronto" rotulo="Tema pronto" value={conteudo.temasDds.some((t) => t.tema === tema) ? tema : ''} onChange={(e) => escolherTema(e.target.value)}>
              <option value="">Escolher da biblioteca ({filtrados.length} de {conteudo.temasDds.length} temas)</option>
              {categorias.filter((c) => filtrados.some((t) => t.categoria === c)).map((c) => (
                <optgroup key={c} label={c}>
                  {filtrados.filter((t) => t.categoria === c).map((t) => <option key={t.tema} value={t.tema}>{feitos.has(t.tema) ? '✓ ' : ''}{t.tema}</option>)}
                </optgroup>
              ))}
            </Selecao>
            <Campo id="dds-tema" rotulo="Tema" required value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Ou escreva um tema" />
          </div>
          <p className="text-sm text-text/70">
            Quer ver os temas com calma, no celular?{' '}
            <Link href="/dds" className="font-semibold text-primary hover:underline">Abra a Biblioteca de DDS</Link>: cada tema tem um caso para contar, o que falar, uma dinâmica vivencial e a pergunta para a equipe.
          </p>
          {escolhido && (
            <details open className="rounded-card border border-border bg-background p-4">
              <summary className="cursor-pointer font-semibold text-primary">Roteiro do DDS: {escolhido.tema}</summary>
              <div className="mt-3"><RoteiroDds tema={escolhido} compacto /></div>
            </details>
          )}
          <div>
            <label htmlFor="dds-texto" className="mb-1.5 block text-sm font-semibold">O que foi falado (vai para a lista de presença)</label>
            <textarea id="dds-texto" className={caixaTexto} rows={8} required value={texto} onChange={(e) => setTexto(e.target.value)} />
            <p className="mt-1 text-xs text-text/60">Já vem preenchido com o roteiro do tema. Você pode mudar o que quiser.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Campo id="dds-data" name="data" type="date" rotulo="Data" required defaultValue={hoje()} />
            <Campo id="dds-duracao" name="duracaoMin" type="number" min={1} rotulo="Duração (minutos)" required defaultValue={10} />
            <Campo id="dds-local" name="local" rotulo="Local" placeholder="Ex.: Pátio de carga" defaultValue={localPadrao} list="locais-empresa" />
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
                <span><strong>{data(d.data)}</strong> · {d.tema}{d.local ? ` · ${d.local}` : ''} · {d.participantes.length} participante(s)</span>
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
  const [ghes, setGhes] = useState<Ghe[]>([]);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const [e, ct, c, a, p, d] = await Promise.all([
        buscarEmpresa(empresaId), buscarConteudoOperacao(), listarColaboradores(empresaId),
        listarAprs(empresaId), listarPermissoes(empresaId), listarDds(empresaId),
      ]);
      const [ins, mod, g] = await Promise.all([listarInspecoes(empresaId), buscarModelosChecklist(), ehEmpresa() ? Promise.resolve([]) : listarGhes(empresaId).catch(() => [])]);
      setGhes(g);
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

  const localPadrao = empresa.localPadrao ?? '';
  const setores = [...new Set(ghes.map((g) => g.setor).filter((x): x is string => !!x))];
  const comum = { empresaId, colaboradores, recarregar, avisar, localPadrao, ghes };
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
      <datalist id="locais-empresa">{[...new Set([localPadrao, ...setores].filter(Boolean))].map((l) => <option key={l} value={l} />)}</datalist>

      {aba === 'apr' && <AbaApr {...comum} aprs={aprs} baixar={baixador('aprs')} />}
      {aba === 'pt' && <AbaPt {...comum} aprs={aprs} permissoes={permissoes} conteudo={conteudo} baixar={baixador('permissoes')} />}
      {aba === 'dds' && <AbaDds {...comum} lista={dds} conteudo={conteudo} baixar={baixador('dds')} />}
      {aba === 'checklist' && <AbaChecklist empresaId={empresaId} lista={inspecoes} modelos={modelos} recarregar={recarregar} avisar={avisar} localPadrao={localPadrao} setores={setores} />}
    </main>
  );
}
