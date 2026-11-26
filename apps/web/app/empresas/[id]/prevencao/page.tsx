'use client';

import { NovoRegistro, useNovo } from '@/components/NovoRegistro';
import { TopoTela } from '@/components/TopoTela';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Ditado, EscolherFoto, FotoProtegida, ResultadoIa } from '@/components/Foto';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import { useAbaDoEndereco } from '@/lib/abaDoEndereco';
import { nivelDoRisco, PROBABILIDADES, SEVERIDADES } from '@/lib/matriz';
import {
  guardarFotos,
  AcaoCorretiva, buscarEmpresa, Ghe, Hierarquia, listarGhes, Cat, CATEGORIAS_CAUSA, CategoriaCausa, Empresa, Esforco, ia, Investigacao,
  listarCats, NovaAcao, prevencao, Prioridade, Relato, salvarArquivo, TIPOS_RELATO, excluir,
} from '@/lib/api';
import { BotaoExcluir } from '@/components/BotaoExcluir';
import { ehEmpresa } from '@/lib/sessao';

type Aba = 'relatos' | 'acoes' | 'investigacao';
const ABAS: [Aba, string][] = [['relatos', 'Relatos e denúncias'], ['acoes', 'Plano de ação'], ['investigacao', 'Investigação de acidentes']];
type Avisar = (tipo: 'erro' | 'ok', texto: string) => void;

const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const caixa = 'w-full rounded-card border border-border bg-background px-3 py-2 text-sm';
const Etiqueta = ({ cor, children }: { cor: string; children: React.ReactNode }) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cor}`}>{children}</span>;
const STATUS_RELATO: Record<Relato['status'], [string, string]> = { NOVO: ['Novo', 'bg-warning text-white'], EM_ANALISE: ['Em análise', 'bg-primary text-white'], ENCERRADO: ['Encerrado', 'bg-success text-white'] };
const PRIORIDADE: Record<Prioridade, string> = { ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa' };
const ESFORCO: Record<Esforco, string> = { RAPIDO: 'Rápido de fazer', MEDIO: 'Médio', DEMORADO: 'Demorado' };
type Coluna = AcaoCorretiva['status'];
// Colunas em tom neutro; só uma faixa fina no topo diz a etapa (âmbar, petróleo, menta).
const COLUNAS: [Coluna, string, string][] = [['ABERTA', 'A fazer', 'bg-[#f59e0b]'], ['ANDAMENTO', 'Em andamento', 'bg-primary'], ['FEITA', 'Concluída', 'bg-success']];
const HIERARQUIA: Record<Hierarquia, string> = { ELIMINAR: '1. Eliminar o perigo', SUBSTITUIR: '2. Trocar por algo menos perigoso', EPC: '3. Proteção coletiva (EPC)', ADMINISTRATIVA: '4. Organização do trabalho', EPI: '5. EPI' };
// "4x3" = gravidade 4 x chance 3: mostra o nível com a cor da matriz.
function NivelEtiqueta({ v }: { v: string }) {
  const [sev, prob] = v.split('x');
  if (!prob) return <span>{v}</span>;
  const n = nivelDoRisco(sev, prob);
  return <span className="rounded px-1.5 py-0.5 font-semibold text-white" style={{ background: n.fundo }}>{n.nome} ({n.pontos})</span>;
}
const mini = (v?: 'primario') => `rounded-lg px-2.5 py-1.5 text-xs font-semibold ${v ? 'bg-primary text-white' : 'border border-border bg-white hover:border-primary'}`;

// ---------- Relatos ----------

function AbaRelatos({ empresaId, empresa, consultoria, iaLigada, avisar, irParaInvestigacao, aoMudar }: {
  empresaId: string; empresa: Empresa; consultoria: boolean; iaLigada: boolean; avisar: Avisar; irParaInvestigacao: (r: Relato) => void; aoMudar: () => void;
}) {
  const [qr, setQr] = useState<{ link: string; qr: string } | null>(null);
  const [relatos, setRelatos] = useState<Relato[] | null>(null);
  const [filtro, setFiltro] = useState<'abertos' | 'todos'>('abertos');
  const [analisando, setAnalisando] = useState<string | null>(null);

  const carregar = useCallback(() => prevencao.relatos(empresaId).then(setRelatos).catch((e: Error) => avisar('erro', e.message)), [empresaId, avisar]);
  useEffect(() => { prevencao.qr(empresaId).then(setQr).catch((e: Error) => avisar('erro', e.message)); carregar(); }, [empresaId, carregar, avisar]);

  async function agir(f: () => Promise<unknown>, ok?: string) {
    try { await f(); if (ok) avisar('ok', ok); await carregar(); aoMudar(); } catch (e) { avisar('erro', (e as Error).message); }
  }

  async function analisar(r: Relato) {
    setAnalisando(r.id);
    await agir(() => prevencao.analisarRelato(empresaId, r.id));
    setAnalisando(null);
  }

  function criarAcao(r: Relato) {
    const descricao = window.prompt('O que vai ser feito para resolver?', r.tipo === 'SUGESTAO' ? r.descricao : '');
    if (!descricao?.trim()) return;
    agir(async () => {
      await prevencao.criarAcao(empresaId, { descricao, local: r.local ?? undefined, origem: 'RELATO', origemId: r.id, origemTexto: `Relato nº ${r.numero}` });
      if (r.status === 'NOVO') await prevencao.tratar(empresaId, r.id, { status: 'EM_ANALISE', resposta: r.resposta ?? undefined });
    }, 'Ação criada no plano de ação.');
  }

  function acoesDaIa(r: Relato, lista: { descricao: string; prioridade: Prioridade; nr: string | null }[]) {
    agir(async () => {
      for (const a of lista) await prevencao.criarAcao(empresaId, { descricao: a.nr ? `${a.descricao} (${a.nr})` : a.descricao, prioridade: a.prioridade, local: r.local ?? undefined, origem: 'RELATO', origemId: r.id, origemTexto: `Relato nº ${r.numero} (IA)` });
    }, `${lista.length} ação(ões) levadas ao plano de ação.`);
  }

  function encerrar(r: Relato) {
    const resposta = window.prompt('O que foi feito? (fica registrado no relato)', r.resposta ?? '');
    if (resposta === null) return;
    agir(() => prevencao.tratar(empresaId, r.id, { status: 'ENCERRADO', resposta }), 'Relato encerrado.');
  }

  const lista = (relatos ?? []).filter((r) => filtro === 'todos' || r.status !== 'ENCERRADO');
  const mensagem = qr ? `Viu algum perigo na ${empresa.razaoSocial}? Conte pelo link, sem se identificar: ${qr.link}` : '';

  return (
    <div className="space-y-6">
      <Cartao titulo="QR code para relatar">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr ? <img src={qr.qr} alt="QR code de relato" className="h-44 w-44 self-center rounded-card border border-border" /> : <div className="h-44 w-44 animate-pulse rounded-card bg-background" />}
          <div className="space-y-3 text-sm">
            <p>Cole o cartaz no refeitório, no vestiário e perto das máquinas. Qualquer pessoa aponta o celular, escreve ou fala o que viu e manda uma foto. <strong>Não precisa de login nem de nome.</strong></p>
            <p className="break-all text-xs text-text/60">{qr?.link}</p>
            <div className="flex flex-wrap gap-2">
              <Botao onClick={() => agir(async () => salvarArquivo(await prevencao.cartaz(empresaId), `Cartaz-QR-${empresa.razaoSocial}.pdf`))}>Baixar cartaz para imprimir</Botao>
              <Botao variante="secundario" onClick={() => qr && navigator.clipboard?.writeText(qr.link).then(() => avisar('ok', 'Link copiado.'))}>Copiar link</Botao>
              {qr && <a className="rounded-card border border-border bg-white px-4 py-2.5 text-sm font-semibold hover:border-primary" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}>Mandar no WhatsApp</a>}
              {consultoria && <Botao variante="secundario" onClick={() => { if (window.confirm('Criar um QR novo? O cartaz antigo para de funcionar.')) agir(async () => setQr(await prevencao.novoQr(empresaId)), 'QR novo criado. Imprima o cartaz de novo.'); }}>Trocar o QR</Botao>}
            </div>
          </div>
        </div>
      </Cartao>

      <Cartao titulo="Relatos recebidos" acao={
        <div className="flex gap-1 text-sm">
          {(['abertos', 'todos'] as const).map((f) => <button key={f} onClick={() => setFiltro(f)} className={`rounded-full px-3 py-1 ${filtro === f ? 'bg-primary text-white' : 'border border-border'}`}>{f === 'abertos' ? 'Em aberto' : 'Todos'}</button>)}
        </div>}>
        {relatos === null ? <p className="text-sm text-text/60">Carregando…</p> : lista.length === 0 ? (
          <p className="text-sm text-text/60">{relatos.length ? 'Nenhum relato em aberto.' : 'Nenhum relato ainda. Imprima o cartaz e cole nos lugares de passagem.'}</p>
        ) : (
          <ul className="space-y-3">
            {lista.map((r) => (
              <li key={r.id} className="rounded-card border border-border p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>Nº {r.numero}</strong>
                  <Etiqueta cor={STATUS_RELATO[r.status][1]}>{STATUS_RELATO[r.status][0]}</Etiqueta>
                  <Etiqueta cor={r.tipo === 'DENUNCIA' ? 'bg-danger text-white' : 'bg-background'}>{TIPOS_RELATO[r.tipo]}{r.tipo === 'DENUNCIA' ? ' · só a consultoria vê' : ''}</Etiqueta>
                  <span className="text-text/60">{dataHora(r.criadoEm)} · {r.local || 'local não informado'} · {r.nome || 'anônimo'}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap">{r.descricao}</p>
                {r.temFoto && <div className="mt-1"><FotoProtegida carregar={() => prevencao.fotoRelato(empresaId, r.id)} /></div>}
                {r.resposta && <p className="mt-2 rounded-card bg-background px-3 py-2"><strong>O que foi feito:</strong> {r.resposta}</p>}
                {r.analiseIa && <div className="mt-3"><ResultadoIa analise={r.analiseIa} criarAcoes={(l) => acoesDaIa(r, l)} /></div>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Botao variante="secundario" onClick={() => criarAcao(r)}>Criar ação</Botao>
                  {consultoria && r.temFoto && iaLigada && !r.analiseIa && <Botao variante="secundario" disabled={analisando === r.id} onClick={() => analisar(r)}>{analisando === r.id ? 'A IA está olhando a foto…' : '✨ Analisar a foto com IA'}</Botao>}
                  {consultoria && r.tipo !== 'SUGESTAO' && <Botao variante="secundario" onClick={() => irParaInvestigacao(r)}>Investigar</Botao>}
                  {r.status !== 'ENCERRADO' ? <Botao variante="secundario" onClick={() => encerrar(r)}>Encerrar</Botao>
                    : <Botao variante="secundario" onClick={() => agir(() => prevencao.tratar(empresaId, r.id, { status: 'EM_ANALISE', resposta: r.resposta ?? undefined }))}>Reabrir</Botao>}
                  {r.acoes && <span className="self-center text-xs text-success">✓ tem ação no plano</span>}
                  {consultoria && <BotaoExcluir pergunta={`Excluir o relato nº ${r.numero}${r.temFoto ? ' e a foto dele' : ''}?${r.acoes ? ' As ações que já estão no plano continuam lá.' : ''}`}
                    excluir={() => excluir.relato(empresaId, r.id)} aoTerminar={async () => { avisar('ok', `Relato nº ${r.numero} excluído.`); await carregar(); aoMudar(); }} aoErrar={(m) => avisar('erro', m)} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

// ---------- Plano de ação ----------

function AbaAcoes({ empresaId, empresa, consultoria, avisar, aoMudar }: { empresaId: string; empresa: Empresa; consultoria: boolean; avisar: Avisar; aoMudar: () => void }) {
  const [acoes, setAcoes] = useState<AcaoCorretiva[] | null>(null);
  const novo = useNovo(acoes !== null && acoes.length === 0);
  const [ghes, setGhes] = useState<Ghe[]>([]);
  const [avaliando, setAvaliando] = useState<string | null>(null);
  const carregar = useCallback(() => prevencao.acoes(empresaId).then(setAcoes).catch((e: Error) => avisar('erro', e.message)), [empresaId, avisar]);
  useEffect(() => { carregar(); listarGhes(empresaId).then(setGhes).catch(() => setGhes([])); }, [carregar, empresaId]);
  const riscos = ghes.flatMap((g) => g.riscos.map((r) => ({ ...r, ghe: g.nome })));

  async function agir(f: () => Promise<unknown>, ok?: string) {
    try { await f(); if (ok) avisar('ok', ok); await carregar(); aoMudar(); } catch (e) { avisar('erro', (e as Error).message); }
  }

  async function nova(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget; const d = new FormData(form);
    const v = (k: string) => String(d.get(k) ?? '').trim() || undefined;
    const riscoId = v('riscoId');
    const risco = riscos.find((r) => r.id === riscoId);
    await agir(async () => { await prevencao.criarAcao(empresaId, { descricao: v('descricao')!, local: v('local') ?? risco?.ghe, responsavel: v('responsavel'), prazo: v('prazo'), prioridade: v('prioridade') as Prioridade, esforco: v('esforco') as Esforco, hierarquia: v('hierarquia') as Hierarquia | undefined, riscoId, ...(risco ? { origem: 'RISCO', origemId: risco.id, origemTexto: `Inventário de riscos · ${risco.ghe}` } : {}) }); form.reset(); }, 'Ação incluída.');
  }

  function concluir(a: AcaoCorretiva) {
    const entrada = document.createElement('input');
    entrada.type = 'file'; entrada.accept = 'image/*'; entrada.setAttribute('capture', 'environment');
    const fechar = (comFoto?: Blob) => agir(async () => {
      if (comFoto) await prevencao.evidencia(empresaId, a.id, comFoto);
      await prevencao.atualizarAcao(empresaId, a.id, { status: 'FEITA' });
    }, 'Ação marcada como feita.');
    if (window.confirm('Quer anexar uma foto de como ficou? (OK = tirar foto, Cancelar = marcar sem foto)')) {
      entrada.onchange = async () => { const f = entrada.files?.[0]; const { reduzirFoto } = await import('@/components/Foto'); fechar(f ? await reduzirFoto(f) : undefined); };
      entrada.click();
    } else fechar();
  }

  function editar(a: AcaoCorretiva) {
    const responsavel = window.prompt('Responsável:', a.responsavel ?? '');
    if (responsavel === null) return;
    const prazo = window.prompt('Prazo (dd/mm/aaaa):', a.prazo ? data(a.prazo) : '');
    if (prazo === null) return;
    const m = prazo.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    agir(() => prevencao.atualizarAcao(empresaId, a.id, { responsavel, prazo: m ? `${m[3]}-${m[2]}-${m[1]}` : undefined }), 'Ação atualizada.');
  }

  async function avaliar(ev: React.FormEvent<HTMLFormElement>, a: AcaoCorretiva) {
    ev.preventDefault();
    const d = new FormData(ev.currentTarget);
    await agir(async () => {
      const r = await prevencao.eficacia(empresaId, a.id, { severidade: String(d.get('sev')), probabilidade: String(d.get('prob')), observacao: String(d.get('obs') ?? '') || undefined });
      setAvaliando(null);
      return r;
    }, a.riscoId ? 'Eficácia registrada. O risco no inventário já foi atualizado.' : 'Eficácia registrada.');
  }

  const agora = new Date(hoje());
  const atrasada = (a: AcaoCorretiva) => a.status !== 'FEITA' && !!a.prazo && new Date(a.prazo) < agora;
  // "Faça primeiro": prioridade alta e rápida de fazer.
  const peso = (a: AcaoCorretiva) => (atrasada(a) ? 0 : 10) + { ALTA: 0, MEDIA: 3, BAIXA: 6 }[a.prioridade] + { RAPIDO: 0, MEDIO: 1, DEMORADO: 2 }[a.esforco];
  const daColuna = (c: Coluna) => {
    const l = (acoes ?? []).filter((a) => a.status === c);
    return c === 'FEITA' ? l.sort((x, y) => (y.feitaEm ?? '').localeCompare(x.feitaEm ?? '')) : l.sort((x, y) => peso(x) - peso(y));
  };
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<Coluna | null>(null);

  // Muda a ação de coluna. Na tela ela já pula na hora; se o servidor recusar, a lista volta como estava.
  function mover(a: AcaoCorretiva, para: Coluna) {
    if (a.status === para) return;
    if (para === 'FEITA') return concluir(a);
    setAcoes((l) => l?.map((x) => (x.id === a.id ? { ...x, status: para, feitaEm: null, feitaPor: null } : x)) ?? l);
    agir(() => prevencao.atualizarAcao(empresaId, a.id, { status: para }));
  }

  // Função (não componente) para o card não ser recriado no meio do arraste.
  const card = (a: AcaoCorretiva) => (
    <li
      key={a.id}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', a.id); e.dataTransfer.effectAllowed = 'move'; setArrastando(a.id); }}
      onDragEnd={() => { setArrastando(null); setSobre(null); }}
      className={`rounded-card border bg-white p-3 text-sm shadow-sm cursor-grab active:cursor-grabbing ${atrasada(a) ? 'border-danger/50' : 'border-border'} ${arrastando === a.id ? 'opacity-40' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {a.status === 'FEITA' ? <Etiqueta cor="bg-success text-white">Feita {data(a.feitaEm)}</Etiqueta> : atrasada(a) ? <Etiqueta cor="bg-danger text-white">Atrasada</Etiqueta> : null}
        {a.status !== 'FEITA' && a.prioridade === 'ALTA' && a.esforco === 'RAPIDO' && <Etiqueta cor="bg-primary text-white">Faça primeiro</Etiqueta>}
        <Etiqueta cor="bg-background">{PRIORIDADE[a.prioridade]}</Etiqueta>
        <Etiqueta cor="bg-background">{ESFORCO[a.esforco]}</Etiqueta>
        {a.hierarquia && <Etiqueta cor={a.hierarquia === 'EPI' ? 'bg-warning/20' : 'bg-primary/10'}>{HIERARQUIA[a.hierarquia]}</Etiqueta>}
      </div>
      <p className="mt-1.5 font-semibold">{a.descricao}</p>
      <p className="mt-0.5 text-xs text-text/60">{a.local ? `${a.local} · ` : ''}{a.responsavel || 'Sem responsável'} · Prazo {data(a.prazo)}</p>
      <p className="text-xs text-text/50">{a.origemTexto ?? 'Incluída à mão'}{a.feitaPor ? ` · fechada por ${a.feitaPor}` : ''}</p>
      {a.risco && <p className="mt-1 text-xs text-text/70">Risco: {a.risco.agente} ({a.risco.ghe}) · nível <NivelEtiqueta v={a.nivelAntes ?? `${a.risco.severidade}x${a.risco.probabilidade}`} /></p>}
      {a.nivelDepois && (
        <div className={`mt-1 space-y-1 rounded-card px-2 py-1.5 text-xs font-semibold ${a.eficaz ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
          <p>{a.eficaz ? 'A medida funcionou' : 'Não baixou o risco: rever a medida'}</p>
          <p className="flex flex-wrap items-center gap-1 text-text/70">Antes <NivelEtiqueta v={a.nivelAntes ?? '?'} /> Depois <NivelEtiqueta v={a.nivelDepois} /></p>
        </div>
      )}
      {a.status === 'FEITA' && !a.nivelDepois && avaliando !== a.id && <button onClick={() => setAvaliando(a.id)} className={`${mini('primario')} mt-2`}>A medida funcionou? Avaliar</button>}
      {avaliando === a.id && (
        <form onSubmit={(ev) => avaliar(ev, a)} className="mt-2 space-y-2 rounded-card border border-border bg-background p-2">
          <p className="text-xs text-text/70">Como ficou o risco depois da ação?</p>
          <select name="sev" defaultValue={a.risco?.severidade ?? '3'} className={caixa} aria-label="Gravidade depois">{SEVERIDADES.map(([v, n]) => <option key={v} value={v}>Gravidade {v} · {n}</option>)}</select>
          <select name="prob" defaultValue="2" className={caixa} aria-label="Chance depois">{PROBABILIDADES.map(([v, n]) => <option key={v} value={v}>Chance {v} · {n}</option>)}</select>
          <input name="obs" className={caixa} placeholder="O que você viu? (opcional)" />
          <div className="flex gap-1.5"><button type="submit" className={mini('primario')}>Salvar</button><button type="button" onClick={() => setAvaliando(null)} className={mini()}>Cancelar</button></div>
        </form>
      )}
      {a.temEvidencia && <FotoProtegida carregar={() => prevencao.verEvidencia(empresaId, a.id)} rotulo="Ver foto de como ficou" />}
      {(
        <div className="mt-2 flex flex-wrap gap-1.5">
          {a.status === 'ABERTA' && <button onClick={() => mover(a, 'ANDAMENTO')} className={mini('primario')}>Começar →</button>}
          {a.status === 'ANDAMENTO' && <><button onClick={() => mover(a, 'ABERTA')} className={mini()}>← A fazer</button><button onClick={() => mover(a, 'FEITA')} className={mini('primario')}>Concluir ✓</button></>}
          {a.status === 'FEITA' && <button onClick={() => mover(a, 'ANDAMENTO')} className={mini()}>Reabrir</button>}
          {a.status !== 'FEITA' && <button onClick={() => editar(a)} className={mini()}>Responsável e prazo</button>}
          {consultoria && <button onClick={() => { if (window.confirm('Apagar esta ação?')) agir(() => prevencao.removerAcao(empresaId, a.id), 'Ação apagada.'); }} className={mini()}>Apagar</button>}
        </div>
      )}
    </li>
  );

  return (
    <div className="space-y-6">
      <NovoRegistro rotulo="Nova ação" {...novo}>
      <Cartao titulo="Nova ação">
        <form className="grid gap-3 md:grid-cols-2" onSubmit={nova}>
          <Campo id="acao-descricao" name="descricao" rotulo="O que fazer" required className="md:col-span-2" placeholder="Ex.: Trocar a proteção do cilindro de massa" />
          <Campo id="acao-local" name="local" rotulo="Local" placeholder="Ex.: Produção" />
          <Campo id="acao-responsavel" name="responsavel" rotulo="Responsável" placeholder="Ex.: Sr. João (manutenção)" />
          <Campo id="acao-prazo" name="prazo" type="date" rotulo="Prazo" />
          <Selecao id="acao-hierarquia" name="hierarquia" rotulo="Tipo de medida (ordem da NR-01)" defaultValue="">
            <option value="">Escolha</option>
            {Object.entries(HIERARQUIA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Selecao>
          {riscos.length > 0 && (
            <Selecao id="acao-risco" name="riscoId" rotulo="Risco que esta ação controla (opcional)" defaultValue="" className="md:col-span-2">
              <option value="">Nenhum risco do inventário</option>
              {riscos.map((r) => <option key={r.id} value={r.id}>{r.ghe} · {r.agente} · {nivelDoRisco(r.severidade, r.probabilidade).nome}</option>)}
            </Selecao>
          )}
          <p className="text-xs text-text/60 md:col-span-2">Primeiro tente tirar o perigo ou trocar por algo menos perigoso. EPI é a última opção, quando as outras não bastam. Ligando a ação a um risco, depois de feita dá para ver se ele baixou.</p>
          <div className="grid grid-cols-2 gap-3">
            <Selecao id="acao-prioridade" name="prioridade" rotulo="Prioridade" defaultValue="MEDIA">{Object.entries(PRIORIDADE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Selecao>
            <Selecao id="acao-esforco" name="esforco" rotulo="Esforço" defaultValue="MEDIO">{Object.entries(ESFORCO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Selecao>
          </div>
          <div className="flex justify-end md:col-span-2"><Botao type="submit">Incluir ação</Botao></div>
        </form>
      </Cartao>
      </NovoRegistro>

      <Cartao titulo="Quadro do plano de ação" acao={<div className="flex flex-wrap gap-2">
        {consultoria && <Botao variante="secundario" onClick={() => agir(async () => { const r = await prevencao.acoesDosRiscos(empresaId); if (!r.criadas) throw new Error('Todos os riscos moderados ou acima já têm ação aberta.'); return r; }, 'Ações criadas a partir dos riscos do PGR. Revise o texto e o responsável de cada uma.')}>Criar ações dos riscos do PGR</Botao>}
        <Botao variante="secundario" onClick={() => agir(async () => salvarArquivo(await prevencao.pdfPlano(empresaId), `Plano-de-acao-${empresa.razaoSocial}.pdf`))}>Baixar plano em PDF</Botao>
      </div>}>
        <p className="mb-2 text-xs text-text/60">Este é o plano único da empresa: aqui chegam as ações dos relatos, inspeções, investigações, psicossocial, AET e riscos do PGR. É este plano que sai no PGR.</p>
        <p className="mb-3 text-xs text-text/60">Arraste o card de uma coluna para outra, ou use os botões do card. Em cada coluna, o que vem primeiro é o mais urgente.</p>
        {acoes === null ? <p className="text-sm text-text/60">Carregando…</p> : (
          <div className="grid gap-4 md:grid-cols-3">
            {COLUNAS.map(([c, nome, fundo]) => {
              const lista = daColuna(c);
              return (
                <div
                  key={c}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (sobre !== c) setSobre(c); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(null); }}
                  onDrop={(e) => { e.preventDefault(); setSobre(null); setArrastando(null); const x = acoes.find((y) => y.id === e.dataTransfer.getData('text/plain')); if (x) mover(x, c); }}
                  className={`relative min-h-[140px] overflow-hidden rounded-card border border-border bg-background p-3 pt-4 transition ${sobre === c ? 'border-success bg-success/5 ring-2 ring-success/30' : ''}`}
                  aria-label={`Coluna ${nome}`}
                >
                  <span className={`absolute inset-x-0 top-0 h-1 ${fundo}`} aria-hidden />
                  <p className="mb-3 flex items-center justify-between text-sm font-semibold text-primary"><span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${fundo}`} aria-hidden />{nome}</span><span className="rounded-full border border-border bg-white px-2 py-0.5 text-xs text-text/70">{lista.length}</span></p>
                  {lista.length === 0 ? <p className="rounded-card border border-dashed border-border bg-white/60 p-4 text-center text-xs text-text/50">{c === 'ABERTA' ? 'Nada a fazer. 🎉' : 'Solte um card aqui'}</p>
                    : <ul className="space-y-2">{lista.map(card)}</ul>}
                </div>
              );
            })}
          </div>
        )}
      </Cartao>
    </div>
  );
}

// ---------- Investigação ----------

type Medida = { descricao: string; responsavel: string; prazo: string; prioridade: Prioridade };
const medidaVazia = (): Medida => ({ descricao: '', responsavel: '', prazo: '', prioridade: 'ALTA' });

function AbaInvestigacao({ empresaId, empresa, iaLigada, avisar, deRelato, aoMudar }: { empresaId: string; empresa: Empresa; iaLigada: boolean; avisar: Avisar; deRelato: Relato | null; aoMudar: () => void }) {
  const [lista, setLista] = useState<Investigacao[] | null>(null);
  const novo = useNovo(lista !== null && lista.length === 0);
  const [cats, setCats] = useState<Cat[]>([]);
  const [catId, setCatId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [dataOc, setDataOc] = useState(hoje());
  const [local, setLocal] = useState('');
  const [fotoInv, setFotoInv] = useState<Blob | null>(null);
  const [descricao, setDescricao] = useState('');
  const [equipe, setEquipe] = useState('');
  const [porques, setPorques] = useState<string[]>(['', '', '', '', '']);
  const [causas, setCausas] = useState<{ categoria: CategoriaCausa; texto: string }[]>([]);
  const [conclusao, setConclusao] = useState('');
  const [medidas, setMedidas] = useState<Medida[]>([medidaVazia()]);
  const [pensando, setPensando] = useState(false);
  const [obsIa, setObsIa] = useState<string | null>(null);
  const [abrirCat, setAbrirCat] = useState(false);
  const router = useRouter();
  const linkCat = (id: string) => `/empresas/${empresaId}/saude?investigacao=${id}#cat`;

  const carregar = useCallback(() => prevencao.investigacoes(empresaId).then(setLista).catch((e: Error) => avisar('erro', e.message)), [empresaId, avisar]);
  useEffect(() => { carregar(); listarCats(empresaId).then(setCats).catch(() => setCats([])); }, [empresaId, carregar]);
  useEffect(() => {
    if (!deRelato) return;
    novo.abrir();
    setTitulo(`${TIPOS_RELATO[deRelato.tipo]} (relato nº ${deRelato.numero})`); setLocal(deRelato.local ?? ''); setDescricao(deRelato.descricao); setDataOc(deRelato.criadoEm.slice(0, 10)); setCatId('');
  }, [deRelato]);

  function escolherCat(id: string) {
    setCatId(id);
    const c = cats.find((x) => x.id === id);
    if (!c) return;
    setTitulo(`Acidente com ${c.colaborador?.nome ?? 'colaborador'}`); setLocal(c.local); setDescricao(c.descricao); setDataOc(c.dataHora.slice(0, 10));
  }

  async function sugerir() {
    setPensando(true);
    try {
      const s = await ia.investigacao(empresaId, `${descricao}${local ? ` (local: ${local})` : ''}`);
      setPorques([...s.porques, '', '', '', '', ''].slice(0, Math.max(5, s.porques.length)));
      setCausas(s.causas);
      setMedidas(s.medidas.length ? s.medidas.map((m) => ({ ...medidaVazia(), descricao: m.descricao, prioridade: m.prioridade })) : [medidaVazia()]);
      setObsIa(s.observacao);
      avisar('ok', 'A IA preencheu os porquês, as causas e as medidas. Confira e ajuste com a equipe antes de salvar.');
    } catch (e) { avisar('erro', (e as Error).message); } finally { setPensando(false); }
  }

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    try {
      const inv = await prevencao.criarInvestigacao(empresaId, {
        catId: catId || undefined, relatoId: deRelato?.id, titulo, dataOcorrencia: dataOc, local, descricao, equipe,
        porques: porques.filter((p) => p.trim()), causas: causas.filter((c) => c.texto.trim()), conclusao: conclusao || undefined,
        medidas: medidas.filter((m) => m.descricao.trim()).map((m) => ({ descricao: m.descricao, responsavel: m.responsavel || undefined, prazo: m.prazo || undefined, prioridade: m.prioridade })),
      });
      let avisoFoto = '';
      if (fotoInv) {
        try { await guardarFotos(empresaId, [fotoInv], `Foto do local - investigacao ${titulo}`, local); avisoFoto = ' A foto ficou no Arquivo, na pasta Fotos.'; }
        catch { avisoFoto = ' A foto não foi enviada; tente de novo pelo Arquivo.'; }
        setFotoInv(null);
      }
      if (abrirCat && !catId) { router.push(linkCat(inv.id)); return; }
      avisar('ok', `Investigação salva. As medidas entraram no plano de ação.${avisoFoto}`);
      setAbrirCat(false);
      setTitulo(''); setLocal(''); setDescricao(''); setEquipe(''); setPorques(['', '', '', '', '']); setCausas([]); setConclusao(''); setMedidas([medidaVazia()]); setCatId(''); setObsIa(null);
      await carregar(); aoMudar();
    } catch (e) { avisar('erro', (e as Error).message); }
  }

  return (
    <div className="space-y-6">
      <NovoRegistro rotulo="Nova investigação" {...novo}>
      <Cartao titulo="Nova investigação">
        <form className="space-y-4" onSubmit={salvar}>
          <p className="text-sm text-text/70">A NR-01 pede que a empresa analise os acidentes e as doenças do trabalho. O objetivo é achar as causas e evitar que se repita, <strong>não achar culpados</strong>.</p>
          {deRelato && <Aviso tipo="info">Investigando o relato nº {deRelato.numero}.</Aviso>}
          {cats.length > 0 && !deRelato && (
            <Selecao id="inv-cat" rotulo="É de uma CAT? (opcional)" value={catId} onChange={(e) => escolherCat(e.target.value)}>
              <option value="">Não, é outra ocorrência</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{data(c.dataHora)} · {c.colaborador?.nome ?? ''} · {c.local}</option>)}
            </Selecao>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <Campo id="inv-titulo" rotulo="Título" required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Corte na mão no cilindro" />
            <Campo id="inv-local" rotulo="Local" required value={local} onChange={(e) => setLocal(e.target.value)} />
            <Campo id="inv-data" rotulo="Data da ocorrência" type="date" required value={dataOc} onChange={(e) => setDataOc(e.target.value)} />
            <Campo id="inv-equipe" rotulo="Quem investigou" required value={equipe} onChange={(e) => setEquipe(e.target.value)} placeholder="Ex.: Cleude (SST), João (supervisor), Maria (CIPA)" />
          </div>
          <div>
            <label htmlFor="inv-desc" className="mb-1.5 block text-sm font-semibold">O que aconteceu</label>
            <textarea id="inv-desc" data-sem-ditado className={caixa} rows={4} required value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Conte como foi, na ordem: o que a pessoa fazia, o que deu errado, o que aconteceu depois." />
            <div className="mt-2 flex flex-wrap gap-2">
              <Ditado acrescentar={(t) => setDescricao((d) => (d ? `${d} ${t}` : t))} />
              {iaLigada && <Botao type="button" variante="secundario" disabled={descricao.trim().length < 10 || pensando} onClick={sugerir}>{pensando ? 'A IA está pensando…' : '✨ Sugerir porquês, causas e medidas'}</Botao>}
            </div>
            {obsIa && <p className="mt-2 rounded-card bg-primary/5 px-3 py-2 text-sm"><strong>A IA sugere perguntar:</strong> {obsIa}</p>}
            <div className="mt-3">
              <p className="mb-1.5 text-sm font-semibold">Foto do local (opcional)</p>
              <EscolherFoto foto={fotoInv} mudar={setFotoInv} rotulo="Tirar foto do local" />
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-semibold">5 porquês <span className="font-normal text-text/60">(cada resposta explica a anterior)</span></p>
            <div className="space-y-2">
              {porques.map((p, i) => <input key={i} aria-label={`Porquê ${i + 1}`} className={caixa} value={p} placeholder={`${i + 1}. Por quê?`} onChange={(e) => setPorques(porques.map((x, j) => (j === i ? e.target.value : x)))} />)}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-semibold">Causas encontradas</p>
            <div className="space-y-2">
              {causas.map((c, i) => (
                <div key={i} className="flex flex-wrap gap-2">
                  <select aria-label="Categoria" className={`${caixa} max-w-[240px]`} value={c.categoria} onChange={(e) => setCausas(causas.map((x, j) => (j === i ? { ...x, categoria: e.target.value as CategoriaCausa } : x)))}>
                    {Object.entries(CATEGORIAS_CAUSA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input aria-label="Causa" className={`${caixa} flex-1`} value={c.texto} onChange={(e) => setCausas(causas.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)))} />
                  <button type="button" className="text-xs text-danger" onClick={() => setCausas(causas.filter((_, j) => j !== i))}>Remover</button>
                </div>
              ))}
            </div>
            <button type="button" className="mt-2 text-sm font-semibold text-primary" onClick={() => setCausas([...causas, { categoria: 'METODO', texto: '' }])}>+ Adicionar causa</button>
          </div>

          <div>
            <label htmlFor="inv-conclusao" className="mb-1.5 block text-sm font-semibold">Conclusão</label>
            <textarea id="inv-conclusao" className={caixa} rows={2} value={conclusao} onChange={(e) => setConclusao(e.target.value)} />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-semibold">Medidas para não repetir <span className="font-normal text-text/60">(entram no plano de ação)</span></p>
            <div className="space-y-2">
              {medidas.map((m, i) => (
                <div key={i} className="grid gap-2 rounded-card border border-border p-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                  <input aria-label="Medida" className={caixa} value={m.descricao} placeholder="O que fazer" onChange={(e) => setMedidas(medidas.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)))} />
                  <input aria-label="Responsável" className={caixa} value={m.responsavel} placeholder="Responsável" onChange={(e) => setMedidas(medidas.map((x, j) => (j === i ? { ...x, responsavel: e.target.value } : x)))} />
                  <input aria-label="Prazo" type="date" className={caixa} value={m.prazo} onChange={(e) => setMedidas(medidas.map((x, j) => (j === i ? { ...x, prazo: e.target.value } : x)))} />
                  <select aria-label="Prioridade" className={caixa} value={m.prioridade} onChange={(e) => setMedidas(medidas.map((x, j) => (j === i ? { ...x, prioridade: e.target.value as Prioridade } : x)))}>
                    {Object.entries(PRIORIDADE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button type="button" className="text-xs text-danger" onClick={() => setMedidas(medidas.filter((_, j) => j !== i))}>Remover</button>
                </div>
              ))}
            </div>
            <button type="button" className="mt-2 text-sm font-semibold text-primary" onClick={() => setMedidas([...medidas, medidaVazia()])}>+ Adicionar medida</button>
          </div>
          {!catId && (
            <label className="flex items-start gap-2 rounded-card border border-border bg-background p-3 text-sm">
              <input type="checkbox" className="h-6 w-6 shrink-0 accent-primary" checked={abrirCat} onChange={(e) => setAbrirCat(e.target.checked)} />
              <span>Alguém se machucou e ainda não tem CAT. <strong>Abrir a CAT logo depois de salvar</strong>, já com o local e a descrição desta investigação.</span>
            </label>
          )}
          <div className="flex justify-end"><Botao type="submit">{abrirCat && !catId ? 'Salvar e abrir a CAT' : 'Salvar investigação'}</Botao></div>
        </form>
      </Cartao>
      </NovoRegistro>

      <Cartao titulo="Investigações feitas">
        {lista === null ? <p className="text-sm text-text/60">Carregando…</p> : lista.length === 0 ? <p className="text-sm text-text/60">Nenhuma investigação ainda.</p> : (
          <ul className="divide-y divide-border text-sm">
            {lista.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span><strong>{i.titulo}</strong> · {data(i.dataOcorrencia)} · {i.local} · {i.causas.length} causa(s)
                  {i.catId && <> · <Etiqueta cor="bg-success/15 text-success">CAT ligada</Etiqueta></>}</span>
                <span className="flex flex-wrap gap-2">
                  {!i.catId && <Link href={linkCat(i.id)} className="rounded-card border border-border bg-white px-4 py-2 text-sm font-semibold text-primary hover:border-primary">Abrir CAT</Link>}
                  <Botao variante="secundario" onClick={async () => { try { salvarArquivo(await prevencao.pdfInvestigacao(empresaId, i.id), `Investigacao-${empresa.razaoSocial}.pdf`); } catch (e) { avisar('erro', (e as Error).message); } }}>Baixar PDF</Botao>
                  <Botao variante="secundario" onClick={() => { if (window.confirm('Apagar esta investigação? As ações do plano continuam.')) prevencao.removerInvestigacao(empresaId, i.id).then(carregar).catch((e: Error) => avisar('erro', e.message)); }}>Apagar</Botao>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

// Cada item do menu abre só a sua parte, com o mesmo nome do menu.
const TITULOS: Record<Aba, [string, string]> = {
  relatos: ['Relatos e denúncias', 'O que os trabalhadores contam pelo QR code: quase acidentes, condições inseguras e denúncias.'],
  acoes: ['Plano de ação', 'Tudo o que precisa ser feito na empresa, com responsável e prazo. É este plano que sai no PGR.'],
  investigacao: ['Investigação de acidentes', 'Descubra as causas do acidente para ele não se repetir. Sem procurar culpados.'],
};

export default function PrevencaoPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [aba, setAba] = useState<Aba>('relatos');
  useAbaDoEndereco(ABAS.map(([a]) => a), setAba);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  const [consultoria, setConsultoria] = useState(false);
  const [iaLigada, setIaLigada] = useState(false);
  const [deRelato, setDeRelato] = useState<Relato | null>(null);
  const avisar = useCallback<Avisar>((tipo, texto) => { setAviso({ tipo, texto }); }, []);

  useEffect(() => {
    setConsultoria(!ehEmpresa());
    buscarEmpresa(empresaId).then(setEmpresa).catch((e: Error) => setAviso({ tipo: 'erro', texto: e.message }));
    if (!ehEmpresa()) ia.status().then((s) => setIaLigada(s.ligada)).catch(() => setIaLigada(false));
  }, [empresaId]);

  const trocar = (a: Aba) => { setAba(a); history.replaceState(null, '', `#${a}`); setAviso(null); };
  const comum = { empresaId, iaLigada, avisar, aoMudar: () => undefined };

  if (!empresa) return <main className="p-6 md:p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando…'}</main>;
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-10">
      <TopoTela empresaId={empresaId} titulo={TITULOS[aba][0]} empresa={empresa.razaoSocial} frase={TITULOS[aba][1]} />
      {aviso && <div onClick={() => setAviso(null)}><Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso></div>}
      {aba === 'relatos' && <AbaRelatos {...comum} empresa={empresa} consultoria={consultoria} irParaInvestigacao={(r) => { setDeRelato(r); trocar('investigacao'); }} />}
      {aba === 'acoes' && <AbaAcoes empresaId={empresaId} avisar={avisar} aoMudar={comum.aoMudar} empresa={empresa} consultoria={consultoria} />}
      {aba === 'investigacao' && consultoria && <AbaInvestigacao {...comum} empresa={empresa} deRelato={deRelato} />}
    </main>
  );
}
