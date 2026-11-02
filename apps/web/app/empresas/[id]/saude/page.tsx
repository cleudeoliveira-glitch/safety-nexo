'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import {
  Aet,
  buscarEmpresa,
  Cat,
  Colaborador,
  criarAet,
  criarCat,
  Empresa,
  gerarAet,
  gerarCat,
  listarAets,
  listarCats,
  listarColaboradores,
  marcarCatEnviada,
  RecomendacaoAet,
  salvarArquivo,
} from '@/lib/api';
import { ehEmpresa } from '@/lib/sessao';

type Aba = 'aet' | 'cat';
type Avisar = (tipo: 'erro' | 'ok', texto: string) => void;

const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
// Data local (não UTC): à noite o UTC já está no dia seguinte.
const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

const TIPOS_CAT = [['INICIAL', 'Inicial'], ['REABERTURA', 'Reabertura'], ['OBITO', 'Comunicação de óbito']] as const;
const TIPOS_ACIDENTE = [['TIPICO', 'Típico (no trabalho)'], ['TRAJETO', 'Trajeto (casa ↔ trabalho)'], ['DOENCA', 'Doença do trabalho']] as const;

function Texto({ id, rotulo, ajuda, ...area }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; rotulo: string; ajuda?: string }) {
  return (
    <div className="md:col-span-3">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{rotulo}</label>
      {ajuda && <p className="mb-1.5 text-xs text-text/60">{ajuda}</p>}
      <textarea id={id} rows={3} {...area} className="w-full rounded-card border border-border bg-background px-3 py-2 text-sm" />
    </div>
  );
}

function AbaAet({ empresaId, lista, cliente, recarregar, avisar, baixar }: {
  empresaId: string; lista: Aet[]; cliente: boolean; recarregar: () => Promise<void>; avisar: Avisar; baixar: (id: string, nome: string) => void;
}) {
  const vazia: RecomendacaoAet = { recomendacao: '', prazo: '', responsavel: '' };
  const [recomendacoes, setRecomendacoes] = useState<RecomendacaoAet[]>([vazia]);
  const [chave, setChave] = useState(0);
  const mudar = (i: number, campo: keyof RecomendacaoAet, valor: string) =>
    setRecomendacoes((r) => r.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)));

  async function salvar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const d = new FormData(ev.currentTarget);
    const t = (c: string) => String(d.get(c) ?? '').trim();
    try {
      await criarAet(empresaId, {
        posto: t('posto'), data: t('data'), responsavel: t('responsavel'),
        demanda: t('demanda'), funcionamento: t('funcionamento'), metodos: t('metodos'), diagnostico: t('diagnostico'),
        recomendacoes: recomendacoes
          .filter((r) => r.recomendacao.trim())
          .map((r) => ({ recomendacao: r.recomendacao.trim(), ...(r.prazo?.trim() ? { prazo: r.prazo.trim() } : {}), ...(r.responsavel?.trim() ? { responsavel: r.responsavel.trim() } : {}) })),
        restituicao: t('restituicao'),
      });
      setRecomendacoes([vazia]);
      setChave((k) => k + 1);
      avisar('ok', 'AET salva. Clique em "Baixar AET" para gerar o PDF.');
      await recarregar();
    } catch (e) {
      avisar('erro', (e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      {!cliente && (
        <Cartao titulo="Nova Análise Ergonômica do Trabalho">
          <p className="mb-4 text-sm text-text/60">
            Siga as etapas da NR-17 (item 17.3.3). Use a AET quando a avaliação preliminar do PGR não bastar, quando houver queixas ou afastamentos ligados à ergonomia, ou quando o PCMSO indicar.
          </p>
          <form key={chave} className="grid gap-4 md:grid-cols-3" onSubmit={salvar}>
            <Campo id="aet-posto" name="posto" rotulo="Posto ou atividade analisada" required placeholder="Ex.: Balcão de atendimento" className="md:col-span-2" />
            <Campo id="aet-data" name="data" type="date" rotulo="Data" required defaultValue={hoje()} />
            <Campo id="aet-resp" name="responsavel" rotulo="Responsável pela AET" required placeholder="Ex.: Cleude Oliveira" className="md:col-span-3" />
            <Texto id="aet-demanda" name="demanda" rotulo="1. Análise da demanda" required ajuda="O que motivou a análise: queixas, afastamentos, mudança no posto, indicação do PCMSO." />
            <Texto id="aet-func" name="funcionamento" rotulo="2. Funcionamento da organização e situações de trabalho" required ajuda="Como o trabalho é feito de verdade: jornada, pausas, ritmo, metas, mobiliário, ferramentas." />
            <Texto id="aet-met" name="metodos" rotulo="3. Métodos, técnicas e ferramentas" required ajuda="Ex.: observação direta, entrevistas, questionário nórdico, RULA, REBA, filmagem." />
            <Texto id="aet-diag" name="diagnostico" rotulo="4. Diagnóstico" required ajuda="Os fatores que causam o problema, ligando o que foi observado ao que os trabalhadores relataram." />
            <div className="md:col-span-3">
              <p className="mb-1.5 text-sm font-semibold">5. Recomendações</p>
              <div className="space-y-2">
                {recomendacoes.map((r, i) => (
                  <div key={i} className="grid gap-2 md:grid-cols-6">
                    <input aria-label={`Recomendação ${i + 1}`} value={r.recomendacao} onChange={(e) => mudar(i, 'recomendacao', e.target.value)} placeholder="Ex.: Instalar banqueta semi-sentada"
                      className="rounded-card border border-border bg-background px-3 py-2 text-sm md:col-span-3" />
                    <input aria-label={`Prazo ${i + 1}`} value={r.prazo} onChange={(e) => mudar(i, 'prazo', e.target.value)} placeholder="Prazo"
                      className="rounded-card border border-border bg-background px-3 py-2 text-sm" />
                    <input aria-label={`Responsável ${i + 1}`} value={r.responsavel} onChange={(e) => mudar(i, 'responsavel', e.target.value)} placeholder="Responsável"
                      className="rounded-card border border-border bg-background px-3 py-2 text-sm" />
                    <button type="button" className="text-sm text-danger hover:underline disabled:opacity-40" disabled={recomendacoes.length === 1}
                      onClick={() => setRecomendacoes((x) => x.filter((_, j) => j !== i))}>Remover</button>
                  </div>
                ))}
              </div>
              <button type="button" className="mt-2 text-sm font-semibold text-primary hover:underline" onClick={() => setRecomendacoes((x) => [...x, vazia])}>
                + Outra recomendação
              </button>
            </div>
            <Texto id="aet-rest" name="restituicao" rotulo="6. Restituição dos resultados" required ajuda="Quando e como os resultados foram apresentados e validados com os trabalhadores." />
            <div className="flex justify-end md:col-span-3"><Botao type="submit">Salvar AET</Botao></div>
          </form>
        </Cartao>
      )}

      <Cartao titulo="AETs feitas">
        {lista.length === 0 ? <p className="text-sm text-text/60">Nenhuma AET ainda.</p> : (
          <ul className="divide-y divide-border text-sm">
            {lista.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span><strong>{a.posto}</strong> · {data(a.data)} · {a.recomendacoes.length} recomendação(ões)</span>
                <Botao variante="secundario" onClick={() => baixar(a.id, `AET-${a.posto}-${a.data.slice(0, 10)}`)}>Baixar AET</Botao>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

function AbaCat({ empresaId, colaboradores, lista, recarregar, avisar, baixar }: {
  empresaId: string; colaboradores: Colaborador[]; lista: Cat[]; recarregar: () => Promise<void>; avisar: Avisar; baixar: (id: string, nome: string) => void;
}) {
  const [chave, setChave] = useState(0);
  const [recibos, setRecibos] = useState<Record<string, string>>({});

  async function salvar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const d = new FormData(ev.currentTarget);
    const t = (c: string) => String(d.get(c) ?? '').trim();
    const opcional = (c: string) => (t(c) ? { [c]: t(c) } : {});
    try {
      await criarCat(empresaId, {
        colaboradorId: t('colaboradorId'),
        tipoCat: t('tipoCat') as Cat['tipoCat'],
        tipoAcidente: t('tipoAcidente') as Cat['tipoAcidente'],
        // A hora digitada é a de Brasília (sem horário de verão desde 2019), seja qual for o fuso do computador.
        dataHora: t('dataHora') ? `${t('dataHora')}:00-03:00` : '',
        local: t('local'), parteAtingida: t('parteAtingida'), agenteCausador: t('agenteCausador'),
        naturezaLesao: t('naturezaLesao'), descricao: t('descricao'),
        houveAfastamento: d.get('houveAfastamento') === 'S',
        houveObito: d.get('houveObito') === 'S',
        registroPolicial: d.get('registroPolicial') === 'S',
        ...opcional('horasTrabalhadas'), ...opcional('testemunhas'), ...opcional('medicoNome'), ...opcional('medicoCrm'), ...opcional('cid'),
        ...(t('atendimentoData') ? { atendimentoData: t('atendimentoData') } : {}),
        ...(t('diasTratamento') ? { diasTratamento: Number(t('diasTratamento')) } : {}),
      });
      setChave((k) => k + 1);
      avisar('ok', 'CAT registrada. Baixe o PDF, transmita pelo eSocial (S-2210) e depois marque como enviada com o número do recibo.');
      await recarregar();
    } catch (e) {
      avisar('erro', (e as Error).message);
    }
  }

  async function marcar(cat: Cat) {
    const recibo = (recibos[cat.id] ?? '').trim();
    if (!recibo) return avisar('erro', 'Preencha o número do recibo do eSocial.');
    try {
      await marcarCatEnviada(empresaId, cat.id, recibo);
      avisar('ok', 'CAT marcada como enviada.');
      await recarregar();
    } catch (e) {
      avisar('erro', (e as Error).message);
    }
  }

  const situacao = (c: Cat): [string, string] => {
    if (c.enviadaEm) return [`Enviada em ${data(c.enviadaEm)} · recibo ${c.recibo}`, 'text-success'];
    if (new Date(c.prazo) < new Date()) return [`Atrasada: o prazo era ${data(c.prazo)}`, 'text-danger'];
    return [`Enviar até ${data(c.prazo)}`, 'text-warning'];
  };

  return (
    <div className="space-y-6">
      <Cartao titulo="Registrar acidente (CAT)">
        <Aviso tipo="info">
          A CAT deve ser comunicada até o primeiro dia útil seguinte ao acidente. Em caso de morte, imediatamente. A transmissão oficial é pelo eSocial (evento S-2210).
        </Aviso>
        <form key={chave} className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={salvar}>
          <Selecao id="cat-colab" name="colaboradorId" rotulo="Acidentado(a)" required className="md:col-span-2">
            <option value="">Escolha o colaborador</option>
            {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome} · {c.cargo}</option>)}
          </Selecao>
          <Campo id="cat-data" name="dataHora" type="datetime-local" rotulo="Data e hora do acidente" required />
          <Selecao id="cat-tipo" name="tipoCat" rotulo="Tipo de CAT" ajuda={{ oQueE: 'Inicial para o primeiro registro. Reabertura quando a lesão volta a afastar. Óbito quando a morte acontece depois da CAT inicial.' }}>
            {TIPOS_CAT.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </Selecao>
          <Selecao id="cat-acidente" name="tipoAcidente" rotulo="Tipo de acidente">
            {TIPOS_ACIDENTE.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </Selecao>
          <Campo id="cat-horas" name="horasTrabalhadas" rotulo="Horas trabalhadas antes" placeholder="Ex.: 03:30" />
          <Campo id="cat-local" name="local" rotulo="Local do acidente" required placeholder="Ex.: Setor de forno" className="md:col-span-3" />
          <Campo id="cat-parte" name="parteAtingida" rotulo="Parte do corpo atingida" required placeholder="Ex.: Mão direita" />
          <Campo id="cat-agente" name="agenteCausador" rotulo="Agente causador" required placeholder="Ex.: Bandeja quente" />
          <Campo id="cat-natureza" name="naturezaLesao" rotulo="Natureza da lesão" required placeholder="Ex.: Queimadura" />
          <Texto id="cat-desc" name="descricao" rotulo="Como aconteceu" required ajuda="Descreva o que a pessoa fazia, o que deu errado e o resultado." />
          <Selecao id="cat-afast" name="houveAfastamento" rotulo="Houve afastamento?" defaultValue="N">
            <option value="N">Não</option><option value="S">Sim</option>
          </Selecao>
          <Selecao id="cat-obito" name="houveObito" rotulo="Houve óbito?" defaultValue="N">
            <option value="N">Não</option><option value="S">Sim</option>
          </Selecao>
          <Selecao id="cat-policia" name="registroPolicial" rotulo="Houve registro policial?" defaultValue="N">
            <option value="N">Não</option><option value="S">Sim</option>
          </Selecao>
          <Campo id="cat-test" name="testemunhas" rotulo="Testemunhas" placeholder="Nomes, se houver" className="md:col-span-3" />
          <p className="text-sm font-semibold md:col-span-3">Atendimento médico (se já houver)</p>
          <Campo id="cat-atend" name="atendimentoData" type="date" rotulo="Data do atendimento" />
          <Campo id="cat-medico" name="medicoNome" rotulo="Médico(a)" />
          <Campo id="cat-crm" name="medicoCrm" rotulo="CRM" />
          <Campo id="cat-cid" name="cid" rotulo="CID" placeholder="Ex.: T23.2" />
          <Campo id="cat-dias" name="diasTratamento" type="number" min={0} rotulo="Dias prováveis de tratamento" />
          <div className="flex items-end justify-end"><Botao type="submit">Registrar CAT</Botao></div>
        </form>
      </Cartao>

      <Cartao titulo="CATs registradas">
        {lista.length === 0 ? <p className="text-sm text-text/60">Nenhum acidente registrado.</p> : (
          <ul className="divide-y divide-border text-sm">
            {lista.map((c) => {
              const [rotulo, cor] = situacao(c);
              return (
                <li key={c.id} className="space-y-2 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <strong>{c.colaborador?.nome ?? 'Colaborador'}</strong> · {dataHora(c.dataHora)} · {c.naturezaLesao} ({c.parteAtingida}) ·{' '}
                      <span className={`font-semibold ${cor}`}>{rotulo}</span>
                    </span>
                    <Botao variante="secundario" onClick={() => baixar(c.id, `CAT-${c.colaborador?.nome ?? 'acidente'}-${c.dataHora.slice(0, 10)}`)}>Baixar CAT</Botao>
                  </div>
                  {!c.enviadaEm && (
                    <div className="flex flex-wrap items-end gap-2">
                      <Campo id={`recibo-${c.id}`} rotulo="Número do recibo do eSocial" value={recibos[c.id] ?? ''} className="min-w-64 flex-1"
                        onChange={(e) => setRecibos((r) => ({ ...r, [c.id]: e.target.value }))} placeholder="Ex.: 1.2.202611.0000001" />
                      <Botao variante="secundario" onClick={() => marcar(c)}>Marcar como enviada</Botao>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

export default function SaudePage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [aba, setAba] = useState<Aba>('aet');
  const [cliente, setCliente] = useState(false);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [aets, setAets] = useState<Aet[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const [e, c, a, ct] = await Promise.all([buscarEmpresa(empresaId), listarColaboradores(empresaId), listarAets(empresaId), listarCats(empresaId)]);
      setEmpresa(e); setColaboradores(c); setAets(a); setCats(ct);
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }, [empresaId]);

  useEffect(() => {
    const ehCliente = ehEmpresa();
    setCliente(ehCliente);
    // A empresa cliente costuma vir aqui para registrar um acidente.
    if (ehCliente || window.location.hash === '#cat') setAba('cat');
    recarregar();
  }, [recarregar]);

  const avisar: Avisar = (tipo, texto) => setAviso({ tipo, texto });
  const baixador = (gerar: (e: string, id: string) => Promise<Blob>) => async (id: string, nome: string) => {
    try {
      salvarArquivo(await gerar(empresaId, id), `${nome}.pdf`);
    } catch (e) {
      avisar('erro', (e as Error).message);
    }
  };

  if (!empresa) return <main className="p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando…'}</main>;

  const pendentes = cats.filter((c) => !c.enviadaEm).length;
  const abas: [Aba, string][] = [['aet', 'Ergonomia (AET)'], ['cat', `Acidentes (CAT)${pendentes ? ` · ${pendentes} a enviar` : ''}`]];

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div>
        <Link href={`/?empresa=${empresaId}`} className="text-sm text-primary">← Voltar ao painel</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Saúde ocupacional</h1>
        <p className="text-text/60">
          {empresa.razaoSocial}
          {!cliente && <> · <Link href={`/empresas/${empresaId}#documentos`} className="text-primary hover:underline">PGR, PCMSO e LTCAT →</Link></>}
        </p>
      </div>

      <div role="tablist" className="flex flex-wrap gap-2">
        {abas.map(([valor, nome]) => (
          <button key={valor} role="tab" aria-selected={aba === valor} onClick={() => { setAba(valor); setAviso(null); }}
            className={`rounded-card px-4 py-2 text-sm font-semibold ${aba === valor ? 'bg-primary text-white' : 'border border-border bg-white'}`}>
            {nome}
          </button>
        ))}
      </div>

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      {aba === 'aet' && <AbaAet empresaId={empresaId} lista={aets} cliente={cliente} recarregar={recarregar} avisar={avisar} baixar={baixador(gerarAet)} />}
      {aba === 'cat' && <AbaCat empresaId={empresaId} colaboradores={colaboradores} lista={cats} recarregar={recarregar} avisar={avisar} baixar={baixador(gerarCat)} />}
    </main>
  );
}
