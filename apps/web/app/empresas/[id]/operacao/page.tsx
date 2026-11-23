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
import { BotaoExcluir } from '@/components/BotaoExcluir';
import { NomesSugeridos } from '@/components/NomesSugeridos';
import { lembrar, preencherLembrados } from '@/lib/lembrar';
import { MODELOS_APR, modeloParaAtividade, type ModeloApr } from '@/lib/modelosApr';
import { ehEmpresa } from '@/lib/sessao';
import { AbasDaTela, TopoTela } from '@/components/TopoTela';
import { BotaoAoLado, NovoRegistro, useNovo } from '@/components/NovoRegistro';
import { PassosDoForm } from '@/components/PassosDoForm';
import { ResumoWhatsApp, resumoDds, resumoPt } from '@/components/ResumoWhatsApp';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import {
  guardarFotos,
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
  excluir,
} from '@/lib/api';

type Aba = 'apr' | 'pt' | 'dds' | 'checklist';
const ABAS: Aba[] = ['apr', 'pt', 'dds', 'checklist'];
// Cada item do menu abre só a sua parte, com o mesmo nome do menu. APR e PT ficam juntas porque a PT sai da APR.
const TITULOS: Record<Aba, [string, string]> = {
  apr: ['APR e permissão de trabalho', 'APR é a Análise Preliminar de Risco: analise os riscos da atividade antes de começar e, se precisar, emita a permissão de trabalho a partir dela.'],
  pt: ['APR e permissão de trabalho', 'Libere o trabalho de risco (altura, quente, eletricidade...) por um turno, com as verificações e a equipe.'],
  dds: ['DDS', 'Diálogo Diário de Segurança: registre a conversa do dia e colha as assinaturas de quem participou.'],
  checklist: ['Inspeções', 'Confira o local ou o equipamento item por item, com fotos. O que não estiver certo vira ação no plano.'],
};
const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
// Data local (não UTC): à noite o UTC já está no dia seguinte.
const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
// Caixa da etapa cresce com o texto: nada fica escondido (no celular também).
const linhas = (t: string) => Math.min(8, Math.max(2, Math.ceil(t.length / 26) + (t.match(/\n/g)?.length ?? 0)));
const etapaVazia = (): EtapaApr => ({ etapa: '', riscos: '', medidas: '', epis: '' });
const caixaTexto = 'w-full rounded-card border border-border bg-background px-3 py-2 text-sm';
// Para o campo datetime-local: agora (ou daqui a algumas horas), no fuso do aparelho.
const agoraMais = (horas = 0) => new Date(Date.now() + horas * 3600_000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const etapasVazias = (l: EtapaApr[]) => l.every((e) => !e.etapa.trim() && !e.riscos.trim() && !e.medidas.trim() && !e.epis.trim());
const valorDe = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? '';
const porValor = (id: string, valor: string) => { const el = document.getElementById(id) as HTMLInputElement | null; if (el) el.value = valor; };

type Avisar = (tipo: 'erro' | 'ok', texto: string) => void;
// O campo "Local" já vem com o local padrão da empresa; os setores dos GHEs aparecem como sugestão (lista "locais-empresa").
type DaEmpresa = { localPadrao: string; ghes: Ghe[]; nomeEmpresa: string };
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
  const [atividade, setAtividade] = useState('');
  const [modeloUsado, setModeloUsado] = useState<string | null>(null);
  const sugerido = modeloParaAtividade(atividade);
  useEffect(() => { preencherLembrados({ 'apr-responsavel': 'apr.responsavel' }, ['apr-responsavel']); }, []);

  // Modelo pronto: troca as etapas (pergunta antes se já tem algo escrito).
  function usarModelo(m: ModeloApr) {
    if (!etapasVazias(etapas) && !window.confirm(`Trocar as etapas que você já escreveu pelas do modelo "${m.nome}"?`)) return;
    setEtapas(m.etapas.map((e) => ({ ...e })));
    setModeloUsado(m.id);
    if (!atividade.trim()) setAtividade(m.nome);
    avisar('ok', `Etapas do modelo "${m.nome}" colocadas. Confira e ajuste para o local antes de salvar.`);
  }

  // EPIs que o PGR já pede para o setor, nas etapas que ainda estão sem EPI.
  const episDoSetor = [...new Set((gheEscolhido?.riscos ?? []).flatMap((r) => (r.medidasEpi ?? '').split(/[,;\n]/)).map((x) => x.trim()).filter(Boolean))];
  function completarEpis() {
    const lista = episDoSetor.join(', ');
    setEtapas(etapas.map((e) => (e.epis.trim() ? e : { ...e, epis: lista })));
  }

  const novo = useNovo(aprs.length === 0);
  // "Repetir": traz uma APR antiga para o formulário, com a data de hoje.
  function usarComoBase(a: Apr) {
    novo.abrirE(() => usarComoBaseJaAberto(a));
  }
  function usarComoBaseJaAberto(a: Apr) {
    setAtividade(a.atividade);
    setGheId(a.gheId ?? '');
    porValor('apr-local', a.local);
    porValor('apr-responsavel', a.responsavel);
    porValor('apr-data', hoje());
    setEquipe(a.equipe.filter((id) => colaboradores.some((c) => c.id === id)));
    setEtapas(a.etapas.length ? a.etapas.map((e) => ({ ...e })) : [etapaVazia()]);
    setModeloUsado(null);
    document.getElementById('apr-atividade')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    avisar('ok', `APR nº ${a.numero} copiada para o formulário. Ajuste o que mudou e salve: ela vira uma APR nova.`);
  }
  const mudarEtapa = (i: number, campo: keyof EtapaApr, valor: string) => setEtapas(etapas.map((e, j) => (j === i ? { ...e, [campo]: valor } : e)));
  const [iaLigada, setIaLigada] = useState(false);
  const [fotoApr, setFotoApr] = useState<Blob | null>(null);
  const [pensando, setPensando] = useState(false);
  const [dicaIa, setDicaIa] = useState<string | null>(null);
  useEffect(() => { if (!ehEmpresa()) ia.status().then((x) => setIaLigada(x.ligada)).catch(() => setIaLigada(false)); }, []);

  async function sugerirComIa() {
    const local = valorDe('apr-local');
    if (atividade.trim().length < 3) return avisar('erro', 'Escreva a atividade primeiro.');
    setPensando(true);
    try {
      const r = await ia.apr(empresaId, atividade.trim(), local, fotoApr);
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
        atividade: atividade.trim(),
        local: String(d.get('local')).trim(),
        gheId: gheId || null,
        data: String(d.get('data')),
        responsavel: String(d.get('responsavel')).trim(),
        equipe,
        etapas: etapas.filter((e) => e.etapa.trim()),
      });
      lembrar({ 'apr.responsavel': String(d.get('responsavel')) });
      form.reset();
      setEtapas([etapaVazia()]);
      setEquipe([]);
      setGheId('');
      setAtividade('');
      setModeloUsado(null);
      preencherLembrados({ 'apr-responsavel': 'apr.responsavel' });
      setFotoApr(null); setDicaIa(null);
      avisar('ok', 'APR salva. Baixe o PDF para colher as assinaturas da equipe.');
      await recarregar();
    } catch (e) {
      avisar('erro', (e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <NovoRegistro rotulo="Nova APR" {...novo} outros={aprs[0] && <BotaoAoLado onClick={() => usarComoBase(aprs[0])} title="Traz a última APR com a data de hoje">↻ Repetir a última</BotaoAoLado>}>
      <Cartao titulo="Nova APR">
        <form className="space-y-4" onSubmit={salvar}>
          <div className="grid gap-4 md:grid-cols-2">
            <Campo id="apr-atividade" name="atividade" rotulo="Atividade" required placeholder="Ex.: Troca de telhas do galpão" value={atividade} onChange={(e) => setAtividade(e.target.value)} />
            {ghes.length > 0 && (
              <Selecao id="apr-ghe" rotulo="Setor (GHE) onde vai ser feita" value={gheId} onChange={(e) => escolherSetor(e.target.value)}
                title="Os riscos que o PGR já tem para esse setor entram na APR como riscos do ambiente.">
                <option value="">Fora dos setores cadastrados</option>
                {ghes.map((g) => <option key={g.id} value={g.id}>{g.codigo ? `${g.codigo} · ` : ''}{g.nome}</option>)}
              </Selecao>
            )}
            <Campo id="apr-local" name="local" rotulo="Local" required placeholder="Ex.: Galpão de estoque" defaultValue={localPadrao} list="locais-empresa" />
            <Campo id="apr-data" name="data" type="date" rotulo="Data" required defaultValue={hoje()} />
            <Campo id="apr-responsavel" name="responsavel" rotulo="Responsável" required placeholder="Quem elaborou a APR" list="nomes-pessoas" />
            <Selecao id="apr-modelo" rotulo="Começar de um modelo pronto (opcional)" value="" onChange={(e) => { const m = MODELOS_APR.find((x) => x.id === e.target.value); if (m) usarModelo(m); }}>
              <option value="">Escolha a atividade parecida</option>
              {MODELOS_APR.map((m) => <option key={m.id} value={m.id}>{m.nome} ({m.norma})</option>)}
            </Selecao>
          </div>

          {sugerido && sugerido.id !== modeloUsado && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-primary/30 bg-primary/5 p-3 text-sm">
              <p>Tem um modelo pronto para essa atividade: <strong>{sugerido.nome}</strong> ({sugerido.norma}), com {sugerido.etapas.length} etapas, riscos, medidas e EPIs.</p>
              <Botao type="button" variante="secundario" onClick={() => usarModelo(sugerido)}>Usar o modelo</Botao>
            </div>
          )}

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
              {episDoSetor.length > 0 && (
                <button type="button" className="mt-2 text-sm font-semibold text-primary hover:underline" onClick={completarEpis}>
                  Colocar os EPIs do setor nas etapas sem EPI ({episDoSetor.join(', ')})
                </button>
              )}
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
                  <textarea aria-label={`Etapa ${i + 1}`} className={caixaTexto} rows={linhas(e.etapa)} placeholder={`Etapa ${i + 1}: o que será feito`} value={e.etapa} onChange={(v) => mudarEtapa(i, 'etapa', v.target.value)} />
                  <textarea aria-label={`Riscos da etapa ${i + 1}`} className={caixaTexto} rows={linhas(e.riscos)} placeholder="Riscos (ex.: queda, choque)" value={e.riscos} onChange={(v) => mudarEtapa(i, 'riscos', v.target.value)} />
                  <textarea aria-label={`Medidas da etapa ${i + 1}`} className={caixaTexto} rows={linhas(e.medidas)} placeholder="Medidas de controle" value={e.medidas} onChange={(v) => mudarEtapa(i, 'medidas', v.target.value)} />
                  <textarea aria-label={`EPIs da etapa ${i + 1}`} className={caixaTexto} rows={linhas(e.epis)} placeholder="EPIs" value={e.epis} onChange={(v) => mudarEtapa(i, 'epis', v.target.value)} />
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
      </NovoRegistro>

      <Cartao titulo="APRs da empresa">
        {aprs.length === 0 ? <p className="text-sm text-text/60">Nenhuma APR ainda.</p> : (
          <ul className="divide-y divide-border text-sm">
            {aprs.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span><strong>Nº {a.numero}</strong> · {a.atividade} · {a.local} · {data(a.data)} · {a.etapas.length} etapa(s)</span>
                <span className="flex flex-wrap gap-2">
                  <Botao variante="secundario" onClick={() => baixar(a.id, `APR-${a.numero}`)}>Baixar APR</Botao>
                  <Botao variante="secundario" onClick={() => usarComoBase(a)} title="Copia esta APR para o formulário, com a data de hoje">Repetir</Botao>
                  <BotaoExcluir pergunta={`Excluir a APR nº ${a.numero} (${a.atividade})? As permissões ligadas a ela continuam guardadas.`}
                    excluir={() => excluir.apr(empresaId, a.id)} aoTerminar={async () => { avisar('ok', `APR nº ${a.numero} excluída.`); await recarregar(); }} aoErrar={(m) => avisar('erro', m)} />
                </span>
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

function AbaPt({ empresaId, colaboradores, aprs, permissoes, conteudo, recarregar, avisar, baixar, localPadrao, nomeEmpresa }: DaEmpresa & {
  empresaId: string; colaboradores: Colaborador[]; aprs: Apr[]; permissoes: Permissao[]; conteudo: ConteudoOperacao;
  recarregar: () => Promise<void>; avisar: Avisar; baixar: (id: string, nome: string) => void;
}) {
  const [fotoPt, setFotoPt] = useState<Blob | null>(null);
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
  const novo = useNovo(permissoes.length === 0);
  // "Repetir a última": mesma atividade, local, equipe e responsáveis, para um turno novo.
  // As verificações NÃO vêm marcadas: precisam ser conferidas de novo no local.
  function repetir(p: Permissao) {
    novo.abrirE(() => {
      setTipo(p.tipo); setMarcados([]);
      setExecutantes(p.executantes.filter((c) => colaboradores.some((x) => x.id === c)));
      setTimeout(() => {
        porValor('pt-atividade', p.atividade); porValor('pt-local', p.local); porValor('pt-emitente', p.emitente);
        porValor('pt-inicio', agoraMais(0)); porValor('pt-fim', agoraMais(8));
        if (p.supervisorEntrada) porValor('pt-supervisor', p.supervisorEntrada);
        if (p.vigia) porValor('pt-vigia', p.vigia);
        if (p.espacoId) porValor('pt-espaco', p.espacoId);
        if (p.planoResgateId) porValor('pt-resgate', p.planoResgateId);
        document.getElementById('pt-atividade')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
      avisar('ok', `PT nº ${p.numero} copiada para um turno novo. Confira as verificações no local antes de emitir.`);
    });
  }
  const pendentes = itens.length - marcados.length;
  const CAMPOS_PT = { 'pt-emitente': 'pt.emitente', 'pt-supervisor': 'pt.supervisor', 'pt-vigia': 'pt.vigia', 'pt-operador': 'pt.operador', 'pt-sinaleiro': 'pt.sinaleiro' };
  useEffect(() => { preencherLembrados(CAMPOS_PT, ['pt-emitente']); }, [tipo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escolheu a APR: atividade, local e equipe vêm dela, e o tipo de PT é sugerido pela atividade.
  function escolherApr(id: string) {
    const a = aprs.find((x) => x.id === id);
    if (!a) return;
    porValor('pt-atividade', a.atividade);
    porValor('pt-local', a.local);
    setExecutantes(a.equipe.filter((c) => colaboradores.some((x) => x.id === c)));
    const tipoSugerido = modeloParaAtividade(a.atividade)?.pt;
    if (tipoSugerido && tipoSugerido !== tipo && conteudo.tiposPt[tipoSugerido]) { setTipo(tipoSugerido); setMarcados([]); }
  }

  async function salvar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const d = new FormData(form);
    try {
      const nova = await criarPermissao(empresaId, {
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
      lembrar({ 'pt.emitente': String(d.get('emitente') ?? ''), 'pt.supervisor': String(d.get('supervisorEntrada') ?? ''), 'pt.vigia': String(d.get('vigia') ?? ''), 'pt.operador': String(d.get('operador') ?? ''), 'pt.sinaleiro': String(d.get('sinaleiro') ?? '') });
      let avisoFoto = '';
      if (fotoPt) {
        try { await guardarFotos(empresaId, [fotoPt], `Foto da area liberada - PT ${nova.numero}`, `${nova.atividade} · ${nova.local}`); avisoFoto = ' A foto ficou no Arquivo, na pasta Fotos.'; }
        catch { avisoFoto = ' A foto não foi enviada; tente de novo pelo Arquivo.'; }
        setFotoPt(null);
      }
      form.reset();
      setPeso('');
      setCapacidade('');
      setMarcados([]);
      setExecutantes([]);
      preencherLembrados(CAMPOS_PT);
      avisar('ok', `Permissão emitida. Baixe o PDF para as assinaturas.${avisoFoto}`);
      await recarregar();
    } catch (e) {
      avisar('erro', (e as Error).message);
    }
  }

  // Contagem regressiva: a lista se atualiza a cada minuto e mostra quanto falta para a PT vencer.
  const agora = useAgoraPorMinuto();
  const situacao = (p: Permissao): [string, string] => {
    if (p.encerradaEm) return ['Encerrada', 'text-text/60'];
    const falta = new Date(p.fim).getTime() - agora;
    if (falta <= 0) return ['Vencida: encerre', 'text-danger'];
    if (new Date(p.inicio).getTime() > agora) return ['Ainda não começou', 'text-text/60'];
    return [`Aberta: faltam ${tempoQueFalta(falta)}`, falta <= 30 * 60000 ? 'text-danger' : falta <= 2 * 3600000 ? 'text-[#c2410c]' : 'text-success'];
  };
  useAvisoPtVencendo(permissoes, agora);

  return (
    <div className="space-y-6">
      <NovoRegistro rotulo="Nova permissão de trabalho" {...novo} outros={permissoes[0] && <BotaoAoLado onClick={() => repetir(permissoes[0])} title="Traz a última PT para um turno novo. As verificações precisam ser conferidas de novo.">↻ Repetir a última</BotaoAoLado>}>
      <Cartao titulo="Nova permissão de trabalho">
        <form onSubmit={salvar}>
          <PassosDoForm salvar={<Botao type="submit">Emitir permissão</Botao>} passos={[
            { titulo: 'O trabalho', conteudo: <div className="space-y-4 md:col-span-3">
                <div className="grid gap-4 md:grid-cols-2">
                  <Selecao id="pt-tipo" rotulo="Tipo de trabalho" value={tipo} onChange={(e) => { setTipo(e.target.value as TipoPt); setMarcados([]); }}>
                    {Object.entries(conteudo.tiposPt).map(([valor, t]) => <option key={valor} value={valor}>{t.nome} ({t.norma})</option>)}
                  </Selecao>
                  <Selecao id="pt-apr" name="aprId" rotulo="APR da atividade" onChange={(e) => escolherApr(e.target.value)}
                    ajuda={{ oQueE: 'A APR que analisou este trabalho.', exemplo: 'Ao escolher, a atividade, o local e a equipe já vêm preenchidos.' }}>
                    <option value="">Sem APR vinculada</option>
                    {aprs.map((a) => <option key={a.id} value={a.id}>Nº {a.numero} · {a.atividade}</option>)}
                  </Selecao>
                  <Campo id="pt-atividade" name="atividade" rotulo="Atividade" required placeholder="Ex.: Troca de telhas" />
                  <Campo id="pt-local" name="local" rotulo="Local" required placeholder="Ex.: Galpão" defaultValue={localPadrao} list="locais-empresa" />
                  <Campo id="pt-inicio" name="inicio" type="datetime-local" rotulo="Válida a partir de" required defaultValue={agoraMais(0)} />
                  <Campo id="pt-fim" name="fim" type="datetime-local" rotulo="Válida até" required defaultValue={agoraMais(8)} dica="Já vem com um turno (8 horas). PT não passa do turno." />
                  <Campo id="pt-emitente" name="emitente" rotulo="Emitente" required placeholder="Quem libera o trabalho" list="nomes-pessoas" />
                  {confinado && <>
                    <Campo id="pt-supervisor" name="supervisorEntrada" rotulo="Supervisor de entrada" required placeholder="Quem autoriza a entrada" list="nomes-pessoas" />
                    <Campo id="pt-vigia" name="vigia" rotulo="Vigia" required placeholder="Quem fica do lado de fora" list="nomes-pessoas" />
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
              <div>
                <p className="mb-1.5 text-sm font-semibold">Foto da área liberada (opcional)</p>
                <EscolherFoto foto={fotoPt} mudar={setFotoPt} rotulo="Tirar foto da área" />
              </div>
            </div> },
            ...(icamento || escavacao || confinado ? [{ titulo: icamento ? 'Dados do içamento' : escavacao ? 'Dados da escavação' : 'Medição antes da entrada', conteudo: <div className="space-y-4 md:col-span-3">
                {icamento && (
                  <fieldset className="grid gap-4 rounded-card border border-border p-3 md:grid-cols-3">
                    <legend className="px-1 text-sm font-semibold">Dados do içamento</legend>
                    <Campo id="pt-equip" name="equipamento" rotulo="Equipamento" placeholder="Ex.: Caminhão munck 20 t" />
                    <Campo id="pt-peso" rotulo="Peso da carga com acessórios (kg)" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Ex.: 1200" />
                    <Campo id="pt-capacidade" rotulo="Capacidade no raio de trabalho (kg)" inputMode="decimal" value={capacidade} onChange={(e) => setCapacidade(e.target.value)} placeholder="Ex.: 3000" />
                    <Campo id="pt-operador" name="operador" rotulo="Operador" placeholder="Nome do operador" list="nomes-pessoas" />
                    <Campo id="pt-sinaleiro" name="sinaleiro" rotulo="Sinaleiro (rigger)" placeholder="Nome do sinaleiro" list="nomes-pessoas" />
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
            </div> }] : []),
            { titulo: 'Verificações', conteudo: <div className="space-y-4 md:col-span-3">
                <fieldset className="rounded-card border border-border p-3">
                  <legend className="px-1 text-sm font-semibold">Verificações: {conteudo.tiposPt[tipo].nome}</legend>
                  <p className="mb-2 text-xs text-text/60">Marque o que foi conferido. Os itens são uma sugestão; o que ficar desmarcado sai como &quot;não&quot; no PDF.</p>
                  <button type="button" className="mb-2 text-xs font-semibold text-primary" onClick={() => setMarcados(pendentes ? [...itens] : [])}>
                    {pendentes ? 'Conferi tudo: marcar todos' : 'Desmarcar todos'}
                  </button>
                  <div className="space-y-1.5">
                    {itens.map((item) => (
                      <label key={item} className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <input type="checkbox" className="h-6 w-6 shrink-0 accent-primary" checked={marcados.includes(item)}
                          onChange={(e) => setMarcados(e.target.checked ? [...marcados, item] : marcados.filter((m) => m !== item))} />
                        {item}
                      </label>
                    ))}
                  </div>
                  {pendentes > 0 && <p className="mt-2 text-xs font-semibold text-warning">{pendentes} item(ns) sem conferir.</p>}
                </fieldset>
            </div> },
            { titulo: 'Quem vai executar', conteudo: <div className="space-y-4 md:col-span-3">
                <EscolherPessoas titulo="Executantes" colaboradores={colaboradores} marcados={executantes} mudar={setExecutantes} />
            </div> },
          ]} />
        </form>
      </Cartao>
      </NovoRegistro>

      <Cartao titulo="Permissões emitidas" acao={<LigarAvisoPt />}>
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
                  <span className="flex flex-wrap gap-2">
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
                    <ResumoWhatsApp texto={resumoPt(nomeEmpresa, { ...p, tipoNome: conteudo.tiposPt[p.tipo]?.nome ?? p.tipo })}
                      pdf={() => gerarPdfOperacao(empresaId, 'permissoes', p.id)} nomeArquivo={`Permissao-${p.numero}`} />
                    <BotaoExcluir pergunta={`Excluir a permissão de trabalho nº ${p.numero} (${p.atividade})?`}
                      excluir={() => excluir.permissao(empresaId, p.id)} aoTerminar={async () => { avisar('ok', `Permissão nº ${p.numero} excluída.`); await recarregar(); }} aoErrar={(m) => avisar('erro', m)} />
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

function AbaDds({ empresaId, colaboradores, lista, conteudo, recarregar, avisar, baixar, localPadrao, nomeEmpresa }: DaEmpresa & {
  empresaId: string; colaboradores: Colaborador[]; lista: Dds[]; conteudo: ConteudoOperacao;
  recarregar: () => Promise<void>; avisar: Avisar; baixar: (id: string, nome: string) => void;
}) {
  const [tema, setTema] = useState('');
  const [texto, setTexto] = useState('');
  const [participantes, setParticipantes] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const [camera, setCamera] = useState<Dds | null>(null);
  const [rostoDds, setRostoDds] = useState(false);
  const [sugestoes, setSugestoes] = useState<SugestoesDds | null>(null);
  useEffect(() => { sugestoesDds(empresaId).then(setSugestoes).catch(() => setSugestoes(null)); }, [empresaId, lista.length]);
  useEffect(() => { rosto.config().then((c) => setRostoDds(c.ativo && c.usos.DDS)).catch(() => setRostoDds(false)); }, []);
  useEffect(() => { preencherLembrados({ 'dds-ministrante': 'dds.ministrante' }, ['dds-ministrante']); }, []);
  const feitos = new Set(lista.map((d) => d.tema));
  const semAcento = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const termos = semAcento(busca).split(/\s+/).filter(Boolean);
  // Tema com a palavra no nome vem antes do que só fala dela no texto.
  const filtrados = conteudo.temasDds
    .filter((t) => termos.every((w) => semAcento(`${t.tema} ${t.categoria} ${t.conteudo}`).includes(w)))
    .sort((x, y) => Number(termos.every((w) => semAcento(y.tema).includes(w))) - Number(termos.every((w) => semAcento(x.tema).includes(w))));

  // O texto pronto vem com o caso para contar, a dinâmica vivencial e a pergunta para a equipe.
  function escolherTema(nome: string) {
    setTema(nome);
    const pronto = conteudo.temasDds.find((t) => t.tema === nome);
    if (pronto) setTexto(textoDoRoteiro(pronto));
  }
  const escolhido = conteudo.temasDds.find((t) => t.tema === tema);

  // Vindo da Biblioteca com um tema escolhido, o formulário já abre.
  const novo = useNovo(lista.length === 0 || (typeof window !== 'undefined' && !!new URLSearchParams(window.location.search).get('tema')));
  // "Repetir o último": mesmo tema, texto, local, ministrante e participantes, com a data de hoje.
  function repetir(d: Dds) {
    novo.abrirE(() => {
      setTema(d.tema); setTexto(d.conteudo);
      setParticipantes(d.participantes.filter((c) => colaboradores.some((x) => x.id === c)));
      porValor('dds-data', hoje()); porValor('dds-duracao', String(d.duracaoMin));
      if (d.local) porValor('dds-local', d.local);
      porValor('dds-ministrante', d.ministrante);
      document.getElementById('dds-tema')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      avisar('ok', `DDS "${d.tema}" copiado com a data de hoje. Ajuste o que mudou e registre.`);
    });
  }

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
      lembrar({ 'dds.ministrante': String(d.get('ministrante')) });
      form.reset();
      setTema('');
      setTexto('');
      setParticipantes([]);
      preencherLembrados({ 'dds-ministrante': 'dds.ministrante' });
      avisar('ok', 'DDS registrado. Baixe a lista de presença para assinatura.');
      await recarregar();
    } catch (e) {
      avisar('erro', (e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <NovoRegistro rotulo="Novo DDS" {...novo} outros={lista[0] && <BotaoAoLado onClick={() => repetir(lista[0])} title="Traz o último DDS com a data de hoje">↻ Repetir o último</BotaoAoLado>}>
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
          {/* Uma busca só: o que a pessoa escreve procura na biblioteca e, se não escolher nada, vira o tema. */}
          <div>
            <Campo id="dds-tema" rotulo="Tema" required value={tema} onChange={(e) => { setTema(e.target.value); setBusca(e.target.value); }}
              placeholder="Procure ou escreva. Ex.: forno, escada, extintor" />
            {busca.trim() && !escolhido && (
              <ul className="mt-2 divide-y divide-border rounded-card border border-border bg-white">
                {filtrados.slice(0, 8).map((t) => (
                  <li key={t.tema}>
                    <button type="button" onClick={() => { escolherTema(t.tema); setBusca(''); }} className="min-h-[48px] w-full px-3 py-2 text-left text-sm hover:bg-primary/5">
                      <span className="font-semibold">{feitos.has(t.tema) ? '✓ ' : ''}{t.tema}</span>
                      <span className="block text-xs text-text/60">{t.categoria}{feitos.has(t.tema) ? ' · já feito nesta empresa' : ''}</span>
                    </button>
                  </li>
                ))}
                <li className="px-3 py-2 text-xs text-text/60">
                  {filtrados.length ? `Toque num tema pronto (${filtrados.length} achados) ou continue: o tema fica como você escreveu.` : 'Nenhum tema pronto com essa palavra. Pode seguir: o tema fica como você escreveu.'}
                </li>
              </ul>
            )}
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
            <Campo id="dds-ministrante" name="ministrante" rotulo="Ministrante" required placeholder="Quem conduziu" list="nomes-pessoas" />
          </div>
          <EscolherPessoas titulo="Participantes" colaboradores={colaboradores} marcados={participantes} mudar={setParticipantes} />
          <div className="flex justify-end"><Botao type="submit">Registrar DDS</Botao></div>
        </form>
      </Cartao>
      </NovoRegistro>

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
                  <ResumoWhatsApp texto={resumoDds(nomeEmpresa, d)} pdf={() => gerarPdfOperacao(empresaId, 'dds', d.id)} nomeArquivo={`DDS-${d.data.slice(0, 10)}`} />
                  <BotaoExcluir pergunta={`Excluir o DDS "${d.tema}" de ${data(d.data)}? As assinaturas da lista de presença saem junto.`}
                    excluir={() => excluir.dds(empresaId, d.id)} aoTerminar={async () => { avisar('ok', 'DDS excluído.'); await recarregar(); }} aoErrar={(m) => avisar('erro', m)} />
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
  useAbaDoEndereco(ABAS, setAba);
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
  const comum = { empresaId, colaboradores, recarregar, avisar, localPadrao, ghes, nomeEmpresa: empresa?.razaoSocial ?? 'empresa' };
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <TopoTela empresaId={empresaId} titulo={TITULOS[aba][0]} empresa={empresa.razaoSocial} frase={TITULOS[aba][1]} />
      {(aba === 'apr' || aba === 'pt') && (
        <AbasDaTela abas={[['apr', 'APR'], ['pt', 'Permissão de trabalho']]} atual={aba} trocar={(a) => { setAba(a); setAviso(null); history.replaceState(null, '', `#${a}`); }} />
      )}

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      <NomesSugeridos pessoas={colaboradores.filter((c) => !c.dataDesligamento).map((c) => c.nome)} />
      <datalist id="locais-empresa">{[...new Set([localPadrao, ...setores].filter(Boolean))].map((l) => <option key={l} value={l} />)}</datalist>

      {aba === 'apr' && <AbaApr {...comum} aprs={aprs} baixar={baixador('aprs')} />}
      {aba === 'pt' && <AbaPt {...comum} aprs={aprs} permissoes={permissoes} conteudo={conteudo} baixar={baixador('permissoes')} />}
      {aba === 'dds' && <AbaDds {...comum} lista={dds} conteudo={conteudo} baixar={baixador('dds')} />}
      {aba === 'checklist' && <AbaChecklist empresaId={empresaId} nomeEmpresa={empresa?.razaoSocial ?? 'empresa'} lista={inspecoes} modelos={modelos} recarregar={recarregar} avisar={avisar} localPadrao={localPadrao} setores={setores} />}
    </main>
  );
}

// Hora atual que muda a cada minuto (para a contagem regressiva da PT).
function useAgoraPorMinuto() {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 30000); return () => clearInterval(t); }, []);
  return agora;
}
function tempoQueFalta(ms: number) {
  const min = Math.ceil(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
// Aviso no celular 30 minutos antes de a PT vencer, enquanto o sistema estiver aberto.
// Usa a notificação do próprio aparelho (a pessoa autoriza uma vez). Cada PT avisa uma vez só.
function useAvisoPtVencendo(permissoes: Permissao[], agora: number) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
    for (const p of permissoes) {
      const falta = new Date(p.fim).getTime() - agora;
      const chave = `safety-nexo:aviso-pt:${p.id}`;
      if (p.encerradaEm || falta <= 0 || falta > 30 * 60000) continue;
      try { if (localStorage.getItem(chave)) continue; localStorage.setItem(chave, '1'); } catch { /* sem memória no aparelho: avisa assim mesmo */ }
      new Notification(`PT nº ${p.numero} vence em ${tempoQueFalta(falta)}`, { body: `${p.atividade} · ${p.local}. Encerre ou emita outra para o próximo turno.`, tag: chave });
    }
  }, [permissoes, agora]);
}

function LigarAvisoPt() {
  const [estado, setEstado] = useState<NotificationPermission | 'sem'>('default');
  useEffect(() => { setEstado(typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'sem'); }, []);
  if (estado === 'sem' || estado === 'denied') return null;
  if (estado === 'granted') return <span className="text-xs text-text/60">🔔 Aviso 30 min antes ligado</span>;
  return (
    <button type="button" onClick={async () => setEstado(await Notification.requestPermission())}
      className="min-h-[44px] text-sm font-semibold text-primary hover:underline">🔔 Avisar 30 min antes de vencer</button>
  );
}
