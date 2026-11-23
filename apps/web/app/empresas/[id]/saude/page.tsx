'use client';

import { EscolhaOficial } from '@/components/EscolhaOficial';
import { PassosDoForm } from '@/components/PassosDoForm';
import { EscolherFoto } from '@/components/Foto';
import { NovoRegistro, useNovo } from '@/components/NovoRegistro';
import { TopoTela } from '@/components/TopoTela';
import Link from 'next/link';
import { useAbaDoEndereco } from '@/lib/abaDoEndereco';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import {
  listasCat,
  guardarFotos,
  type ListasCat,
  Aet,
  buscarEmpresa,
  Cat,
  Colaborador,
  criarAet,
  criarCat,
  Empresa,
  gerarAet,
  gerarCat,
  Investigacao,
  listarAets,
  listarCats,
  listarColaboradores,
  marcarCatEnviada,
  prevencao,
  RecomendacaoAet,
  salvarArquivo,
  excluir,
} from '@/lib/api';
import { BotaoExcluir } from '@/components/BotaoExcluir';
import { NomesSugeridos } from '@/components/NomesSugeridos';
import { lembrar, ultimo } from '@/lib/lembrar';
import { lerUsuario } from '@/lib/sessao';
import { ehEmpresa } from '@/lib/sessao';
import { AbaAfastamentos } from './AbaAfastamentos';

type Aba = 'aet' | 'cat' | 'afast';
type AfastarDaCat = { colaboradorId: string; catId: string; inicio: string };
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
  const novo = useNovo(lista.length === 0);
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
      lembrar({ 'aet.responsavel': t('responsavel') });
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
      <div className="card-total flex flex-wrap items-center justify-between gap-3 rounded-card p-4">
        <p className="text-sm"><strong>Comece pela AEP.</strong> A avaliação ergonômica preliminar (NR-17, item 17.3.1) é uma avaliação rápida do posto. O que der &quot;não conforme&quot; vira ação no plano. A AET é para quando a AEP não basta.</p>
        <Link href={`/empresas/${empresaId}/operacao#checklist`} className="rounded-card bg-primary px-4 py-2 text-sm font-semibold text-white">Fazer a AEP</Link>
      </div>
      {!cliente && (
        <NovoRegistro rotulo="Nova AET" {...novo}>
        <Cartao titulo="Nova Análise Ergonômica do Trabalho">
          <p className="mb-4 text-sm text-text/60">
            Siga as etapas da NR-17 (item 17.3.3). Use a AET quando a avaliação preliminar do PGR não bastar, quando houver queixas ou afastamentos ligados à ergonomia, ou quando o PCMSO indicar.
          </p>
          <form key={chave} className="grid gap-4 md:grid-cols-3" onSubmit={salvar}>
            <PassosDoForm salvar={<Botao type="submit">Salvar AET</Botao>} passos={[
              { titulo: 'Posto e responsável', conteudo: <>
                <Campo id="aet-posto" name="posto" rotulo="Posto ou atividade analisada" required placeholder="Ex.: Balcão de atendimento" className="md:col-span-2" />
                <Campo id="aet-data" name="data" type="date" rotulo="Data" required defaultValue={hoje()} />
                <Campo id="aet-resp" name="responsavel" rotulo="Responsável pela AET" required placeholder="Quem fez a análise" className="md:col-span-3" list="nomes-pessoas" defaultValue={ultimo('aet.responsavel') || lerUsuario()?.nome || ''} />
                <NomesSugeridos />
              </> },
              { titulo: 'Demanda e como o trabalho funciona', conteudo: <>
                <Texto id="aet-demanda" name="demanda" rotulo="1. Análise da demanda" required ajuda="O que motivou a análise: queixas, afastamentos, mudança no posto, indicação do PCMSO." />
                <Texto id="aet-func" name="funcionamento" rotulo="2. Funcionamento da organização e situações de trabalho" required ajuda="Como o trabalho é feito de verdade: jornada, pausas, ritmo, metas, mobiliário, ferramentas." />
              </> },
              { titulo: 'Métodos e diagnóstico', conteudo: <>
                <Texto id="aet-met" name="metodos" rotulo="3. Métodos, técnicas e ferramentas" required ajuda="Ex.: observação direta, entrevistas, questionário nórdico, RULA, REBA, filmagem." />
                <Texto id="aet-diag" name="diagnostico" rotulo="4. Diagnóstico" required ajuda="Os fatores que causam o problema, ligando o que foi observado ao que os trabalhadores relataram." />
              </> },
              { titulo: 'Recomendações e retorno aos trabalhadores', conteudo: <>
                <div className="md:col-span-3">
                  <p className="mb-1.5 text-sm font-semibold">5. Recomendações</p>
                  <div className="space-y-2">
                    {recomendacoes.map((r, i) => (
                      <div key={i} className="grid gap-2 md:grid-cols-6">
                        <input aria-label={`Recomendação ${i + 1}`} value={r.recomendacao} onChange={(e) => mudar(i, 'recomendacao', e.target.value)} placeholder="Ex.: Instalar banqueta semi-sentada"
                          className="min-h-[48px] rounded-card border border-border bg-background px-3 py-2 text-base md:col-span-3" />
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
              </> },
            ]} />
          </form>
        </Cartao>
        </NovoRegistro>
      )}

      <Cartao titulo="AETs feitas">
        {lista.length === 0 ? <p className="text-sm text-text/60">Nenhuma AET ainda.</p> : (
          <ul className="divide-y divide-border text-sm">
            {lista.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span><strong>{a.posto}</strong> · {data(a.data)} · {a.recomendacoes.length} recomendação(ões)</span>
                <span className="flex flex-wrap gap-2">
                  <Botao variante="secundario" onClick={() => baixar(a.id, `AET-${a.posto}-${a.data.slice(0, 10)}`)}>Baixar AET</Botao>
                  <BotaoExcluir pergunta={`Excluir a AET de "${a.posto}" (${data(a.data)})?`}
                    excluir={() => excluir.aet(empresaId, a.id)} aoTerminar={async () => { avisar('ok', 'AET excluída.'); await recarregar(); }} aoErrar={(m) => avisar('erro', m)} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

function AbaCat({ empresaId, colaboradores, lista, recarregar, avisar, baixar, afastar }: {
  empresaId: string; colaboradores: Colaborador[]; lista: Cat[]; recarregar: () => Promise<void>; avisar: Avisar; baixar: (id: string, nome: string) => void;
  afastar: (a: AfastarDaCat) => void;
}) {
  // Se a CAT diz que houve afastamento, oferece registrar o afastamento já preenchido.
  const [pedirAfast, setPedirAfast] = useState<(AfastarDaCat & { nome: string }) | null>(null);
  const novo = useNovo(lista.length === 0);
  const [chave, setChave] = useState(0);
  const [recibos, setRecibos] = useState<Record<string, string>>({});
  // Vindo da investigação ("Abrir CAT"): já traz o local e o relato do acidente.
  const [deInv, setDeInv] = useState<Investigacao | null>(null);
  const [listas, setListas] = useState<ListasCat | null>(null);
  const [fotoCat, setFotoCat] = useState<Blob | null>(null);
  useEffect(() => { listasCat(empresaId).then(setListas).catch(() => setListas(null)); }, [empresaId]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('investigacao');
    if (!id) return;
    prevencao.investigacoes(empresaId).then((l) => { const inv = l.find((x) => x.id === id && !x.catId) ?? null; setDeInv(inv); if (inv) novo.abrir(); }).catch(() => setDeInv(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  async function salvar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const d = new FormData(ev.currentTarget);
    const t = (c: string) => String(d.get(c) ?? '').trim();
    const opcional = (c: string) => (t(c) ? { [c]: t(c) } : {});
    try {
      const acidentado = colaboradores.find((c) => c.id === t('colaboradorId'))?.nome ?? 'acidentado';
      const criada = await criarCat(empresaId, {
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
        ...(deInv ? { investigacaoId: deInv.id } : {}),
        // Códigos oficiais escolhidos na lista: o S-2210 já sai com eles.
        ...(t('codParteAting') || t('codAgntCausador') || t('codLesao') ? { esocial: {
          ...(t('codParteAting') ? { codParteAting: t('codParteAting') } : {}),
          ...(t('codAgntCausador') ? { codAgntCausador: t('codAgntCausador') } : {}),
          ...(t('codLesao') ? { codLesao: t('codLesao') } : {}),
        } } : {}),
      });
      // As fotos vão para o Arquivo da empresa depois da CAT salva. Se falharem, a CAT fica salva do mesmo jeito.
      let avisoFoto = '';
      if (fotoCat) {
        try { await guardarFotos(empresaId, [fotoCat], `Foto do local - CAT de ${acidentado} ${t('dataHora').slice(0, 10).split('-').reverse().join('-')}`, t('local')); avisoFoto = 'A foto ficou no Arquivo, na pasta Fotos. '; }
        catch { avisoFoto = 'A foto não foi enviada; tente de novo pelo Arquivo. '; }
        setFotoCat(null);
      }
      setPedirAfast(t('houveAfastamento') === 'S' ? { colaboradorId: t('colaboradorId'), catId: criada.id, inicio: t('dataHora').slice(0, 10), nome: acidentado } : null);
      setChave((k) => k + 1);
      if (deInv) { setDeInv(null); window.history.replaceState(null, '', `${window.location.pathname}#cat`); }
      avisar('ok', (deInv ? 'CAT registrada e ligada à investigação. ' : 'CAT registrada. ') + avisoFoto + 'Baixe o PDF, transmita pelo eSocial (S-2210) e depois marque como enviada com o número do recibo.');
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
      {pedirAfast && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-warning/50 bg-warning/10 p-4">
          <p className="w-full text-sm sm:w-auto sm:flex-1"><strong>{pedirAfast.nome} ficou afastado(a).</strong> Registre o afastamento agora: o nome, a data e a CAT já vão preenchidos.</p>
          <Botao type="button" onClick={() => { afastar(pedirAfast); setPedirAfast(null); }}>Registrar afastamento →</Botao>
          <button type="button" onClick={() => setPedirAfast(null)} className="min-h-[44px] px-2 text-sm text-text/60">Depois</button>
        </div>
      )}
      <NovoRegistro rotulo="Registrar acidente (CAT)" {...novo}>
      <Cartao titulo="Registrar acidente (CAT)">
        {deInv && (
          <div className="mt-3"><Aviso tipo="info">Abrindo a CAT da investigação <strong>{deInv.titulo}</strong> (ocorrência em {data(deInv.dataOcorrencia)}). O local e a descrição já vieram de lá. Escolha o acidentado e confira a data e a hora.</Aviso></div>
        )}
        <form key={`${chave}-${deInv?.id ?? ''}`} className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={salvar}>
          <PassosDoForm salvar={<Botao type="submit">Registrar CAT</Botao>} passos={[
            { titulo: 'Quem se acidentou e quando', conteudo: <>
              <Selecao id="cat-colab" name="colaboradorId" rotulo="Acidentado(a)" required className="md:col-span-2">
                <option value="">Escolha o colaborador</option>
                {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome} · {c.cargo}</option>)}
              </Selecao>
              <Campo id="cat-data" name="dataHora" type="datetime-local" rotulo="Data e hora do acidente" required />
              <Selecao id="cat-tipo" name="tipoCat" rotulo="Tipo de CAT">
                {TIPOS_CAT.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
              </Selecao>
              <Selecao id="cat-acidente" name="tipoAcidente" rotulo="Tipo de acidente">
                {TIPOS_ACIDENTE.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
              </Selecao>
              <Campo id="cat-horas" name="horasTrabalhadas" rotulo="Horas trabalhadas antes" placeholder="Ex.: 03:30" />
            </> },
            { titulo: 'Onde e o que machucou', conteudo: <>
              <Campo id="cat-local" name="local" rotulo="Local do acidente" required placeholder="Ex.: Setor de forno" className="md:col-span-3" defaultValue={deInv?.local} />
              <EscolhaOficial id="cat-parte" name="parteAtingida" nameCodigo="codParteAting" rotulo="Parte do corpo atingida" required itens={listas?.t13 ?? []}
                comuns={[['755070000', 'Dedo'], ['755050000', 'Mão'], ['753070100', 'Olho'], ['757050000', 'Pé'], ['757010400', 'Joelho'], ['753510000', 'Braço'], ['757010000', 'Perna'], ['756040000', 'Costas e coluna'], ['753080000', 'Cabeça']]} exemplo="mão, joelho"
                ajuda={{ oQueE: 'Onde a pessoa se machucou.', exemplo: 'Toque num botão ou procure: "dedo", "joelho". A lista é a oficial do eSocial (Tabela 13), então a CAT já sai pronta para o envio.' }} />
              <EscolhaOficial id="cat-agente" name="agenteCausador" nameCodigo="codAgntCausador" rotulo="O que causou" required itens={listas?.t14 ?? []}
                comuns={[['302010300', 'Piso'], ['302030900', 'Escada'], ['303010120', 'Faca'], ['303020900', 'Máquina'], ['303010900', 'Ferramenta manual'], ['303060000', 'Forno ou fogão'], ['303075900', 'Veículo'], ['305004900', 'Produto químico']]} exemplo="faca, forno, escada"
                ajuda={{ oQueE: 'O objeto, máquina ou situação que machucou a pessoa.', exemplo: 'Procure pelo nome: "faca", "forno". Lista oficial do eSocial (Tabela 14).' }} />
              <EscolhaOficial id="cat-natureza" name="naturezaLesao" nameCodigo="codLesao" rotulo="Tipo de lesão" required itens={listas?.t17 ?? []}
                comuns={[['702010000', 'Corte'], ['702015000', 'Pancada (contusão)'], ['702035000', 'Fratura'], ['702040000', 'Queimadura'], ['702020000', 'Torção'], ['702005000', 'Arranhão (escoriação)']]} exemplo="corte, queimadura"
                ajuda={{ oQueE: 'Que machucado foi.', exemplo: 'Corte, fratura, queimadura. Lista oficial do eSocial (Tabela 17).' }} />
                <div className="md:col-span-3">
                  <p className="mb-1.5 text-sm font-semibold">Foto do local (opcional)</p>
                  <EscolherFoto foto={fotoCat} mudar={setFotoCat} rotulo="Tirar foto do local" />
                </div>
            </> },
            { titulo: 'Como aconteceu', conteudo: <>
              <Texto id="cat-desc" name="descricao" rotulo="Como aconteceu" required ajuda="Descreva o que a pessoa fazia, o que deu errado e o resultado." defaultValue={deInv?.descricao} />
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
            </> },
            { titulo: 'Atendimento médico (se já houver)', conteudo: <>
              <Campo id="cat-atend" name="atendimentoData" type="date" rotulo="Data do atendimento" />
              <Campo id="cat-medico" name="medicoNome" rotulo="Médico(a)" />
              <Campo id="cat-crm" name="medicoCrm" rotulo="CRM" />
              <Campo id="cat-cid" name="cid" rotulo="CID" placeholder="Ex.: T23.2" />
              <Campo id="cat-dias" name="diasTratamento" type="number" min={0} rotulo="Dias prováveis de tratamento" />
            </> },
          ]} />
        </form>
      </Cartao>
      </NovoRegistro>

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
                    <span className="flex flex-wrap gap-2">
                      <Botao variante="secundario" onClick={() => baixar(c.id, `CAT-${c.colaborador?.nome ?? 'acidente'}-${c.dataHora.slice(0, 10)}`)}>Baixar CAT</Botao>
                      {!c.enviadaEm && (
                        <BotaoExcluir pergunta={`Excluir a CAT de ${c.colaborador?.nome ?? 'colaborador'} (${dataHora(c.dataHora)})?`}
                          excluir={() => excluir.cat(empresaId, c.id)} aoTerminar={async () => { avisar('ok', 'CAT excluída.'); await recarregar(); }} aoErrar={(m) => avisar('erro', m)} />
                      )}
                    </span>
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

// Cada item do menu abre só a sua parte, com o mesmo nome do menu.
const TITULOS: Record<Aba, [string, string]> = {
  aet: ['Ergonomia (AET)', 'Avalie o posto de trabalho e registre as melhorias de ergonomia (NR-17).'],
  cat: ['Acidentes (CAT)', 'Registre o acidente e gere a CAT. Prazo: primeiro dia útil depois do acidente (em caso de morte, na hora). Vai ao eSocial no S-2210.'],
  afast: ['Afastamentos', 'Acompanhe quem está afastado, desde quando e a volta ao trabalho.'],
};

export default function SaudePage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [aba, setAba] = useState<Aba>('aet');
  useAbaDoEndereco<Aba>(['aet', 'cat', 'afast'], setAba, { afastamentos: 'afast' });
  const [cliente, setCliente] = useState(false);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [aets, setAets] = useState<Aet[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  const [afastarDe, setAfastarDe] = useState<AfastarDaCat | null>(null);

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
    if (window.location.hash === '#afastamentos') setAba('afast');
    else if (ehCliente || window.location.hash === '#cat') setAba('cat');
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

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <TopoTela empresaId={empresaId} titulo={TITULOS[aba][0]} empresa={empresa.razaoSocial}
        frase={aba === 'cat' && pendentes ? `${TITULOS[aba][1]} ${pendentes} CAT(s) ainda a enviar ao eSocial.` : TITULOS[aba][1]} />

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      {aba === 'aet' && <AbaAet empresaId={empresaId} lista={aets} cliente={cliente} recarregar={recarregar} avisar={avisar} baixar={baixador(gerarAet)} />}
      {aba === 'afast' && <AbaAfastamentos key={afastarDe?.catId ?? 'novo'} empresaId={empresaId} colaboradores={colaboradores} cats={cats} avisar={avisar} inicial={afastarDe} />}
      {aba === 'cat' && <AbaCat empresaId={empresaId} colaboradores={colaboradores} lista={cats} recarregar={recarregar} avisar={avisar} baixar={baixador(gerarCat)}
        afastar={(a) => { setAfastarDe(a); setAviso(null); setAba('afast'); window.history.replaceState(null, '', `${window.location.pathname}#afastamentos`); window.scrollTo({ top: 0 }); }} />}
    </main>
  );
}
