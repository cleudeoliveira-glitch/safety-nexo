'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import {
  adicionarMembroCipa,
  atualizarEleicao,
  atualizarMembroCipa,
  buscarEmpresa,
  Colaborador,
  criarEleicao,
  DocumentoEleicao,
  EleicaoCipa,
  Empresa,
  gerarDocumentoEleicao,
  listarColaboradores,
  listarEleicoes,
  removerMembroCipa,
  salvarArquivo,
} from '@/lib/api';

const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const dia = (iso: string | null) => iso?.slice(0, 10) ?? '';
const SITUACAO = { TITULAR: 'Titular', SUPLENTE: 'Suplente', NAO_ELEITO: 'Não eleito' } as const;

export default function EleicaoCipaPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [eleicao, setEleicao] = useState<EleicaoCipa | null | undefined>(undefined);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const [e, c, el] = await Promise.all([buscarEmpresa(empresaId), listarColaboradores(empresaId), listarEleicoes(empresaId)]);
      setEmpresa(e);
      setColaboradores(c);
      setEleicao(el[0] ?? null);
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }, [empresaId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  // Toda ação devolve a eleição atualizada; basta trocar o estado.
  async function agir(acao: () => Promise<EleicaoCipa>, sucesso?: string) {
    try {
      setEleicao(await acao());
      setAviso(sucesso ? { tipo: 'ok', texto: sucesso } : null);
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }

  async function baixar(documento: DocumentoEleicao, nome: string) {
    if (!eleicao) return;
    try {
      salvarArquivo(await gerarDocumentoEleicao(empresaId, eleicao.id, documento), `${nome}-${empresa?.razaoSocial ?? 'empresa'}.pdf`);
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }

  if (!empresa || eleicao === undefined) {
    return <main className="p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando…'}</main>;
  }

  const texto = (d: FormData, campo: string) => String(d.get(campo) ?? '').trim();
  const naEleicao = new Set([...(eleicao?.candidatos ?? []), ...(eleicao?.indicados ?? [])].map((m) => m.colaboradorId));
  const livres = colaboradores.filter((c) => !naEleicao.has(c.id));
  const Documento = ({ doc, nome, children }: { doc: DocumentoEleicao; nome: string; children: React.ReactNode }) => (
    <Botao variante="secundario" onClick={() => baixar(doc, nome)}>{children}</Botao>
  );

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <div>
        <Link href={`/empresas/${empresaId}#cipa`} className="text-sm text-primary">← Voltar à empresa</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Eleição da CIPA</h1>
        <p className="text-text/60">
          {empresa.razaoSocial}
          {eleicao && ` · ${eleicao.vagas.efetivos} titular(es) e ${eleicao.vagas.suplentes} suplente(s) eleitos pelos funcionários`}
        </p>
      </div>

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <Cartao titulo="1. Datas e edital">
        {eleicao ? (
          <div className="space-y-4 text-sm">
            <ul className="grid gap-2 md:grid-cols-4">
              {[
                ['Edital', eleicao.editalEm],
                ['Inscrições', null],
                ['Eleição', eleicao.eleicaoEm],
                ['Local', null],
              ].map(([rotulo, valor]) => (
                <li key={rotulo} className="rounded-card border border-border bg-background px-3 py-2">
                  <span className="block text-xs text-text/60">{rotulo}</span>
                  <strong>
                    {rotulo === 'Inscrições'
                      ? `${data(eleicao.inscricaoInicio)} a ${data(eleicao.inscricaoFim)}`
                      : rotulo === 'Local'
                        ? `${eleicao.localVotacao}, ${eleicao.horarioVotacao}`
                        : data(valor)}
                  </strong>
                </li>
              ))}
            </ul>
            {eleicao.avisos.map((a) => <Aviso key={a} tipo="erro">{a}</Aviso>)}
            <div className="flex flex-wrap gap-2">
              <Documento doc="edital" nome="Edital-CIPA">Baixar edital</Documento>
              <Documento doc="inscricao" nome="Ficha-inscricao-CIPA">Baixar ficha de inscrição</Documento>
            </div>
          </div>
        ) : (
          <form
            className="grid gap-4 md:grid-cols-3"
            onSubmit={(ev) => {
              ev.preventDefault();
              const d = new FormData(ev.currentTarget);
              agir(
                () =>
                  criarEleicao(empresaId, {
                    editalEm: texto(d, 'editalEm'),
                    inscricaoInicio: texto(d, 'inscricaoInicio'),
                    inscricaoFim: texto(d, 'inscricaoFim'),
                    eleicaoEm: texto(d, 'eleicaoEm'),
                    localVotacao: texto(d, 'localVotacao'),
                    horarioVotacao: texto(d, 'horarioVotacao'),
                  }),
                'Eleição criada. O sistema conferiu os prazos da NR-05.',
              );
            }}
          >
            <Campo id="edital" name="editalEm" type="date" rotulo="Publicação do edital" required
              ajuda={{ oQueE: 'Dia em que o edital é afixado ou enviado aos funcionários.', baseLegal: 'NR-05, 5.5.1: até 60 dias antes do fim do mandato' }} />
            <Campo id="insc-inicio" name="inscricaoInicio" type="date" rotulo="Início das inscrições" required />
            <Campo id="insc-fim" name="inscricaoFim" type="date" rotulo="Fim das inscrições" required
              ajuda={{ oQueE: 'As inscrições precisam ficar abertas por pelo menos 15 dias corridos.', baseLegal: 'NR-05, 5.5.3, b' }} />
            <Campo id="eleicao-dia" name="eleicaoEm" type="date" rotulo="Dia da eleição" required
              ajuda={{ oQueE: 'Em dia normal de trabalho, até 30 dias antes do fim do mandato.', baseLegal: 'NR-05, 5.5.3, f e g' }} />
            <Campo id="eleicao-local" name="localVotacao" rotulo="Local da votação" required placeholder="Ex.: Refeitório" />
            <Campo id="eleicao-horario" name="horarioVotacao" rotulo="Horário" required placeholder="Ex.: 8h às 17h" />
            <div className="flex justify-end md:col-span-3"><Botao type="submit">Criar eleição</Botao></div>
          </form>
        )}
      </Cartao>

      {eleicao && (
        <>
          <Cartao titulo="2. Candidatos e votos">
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(ev) => {
                ev.preventDefault();
                const colaboradorId = texto(new FormData(ev.currentTarget), 'colaboradorId');
                if (colaboradorId) agir(() => adicionarMembroCipa(empresaId, eleicao.id, { colaboradorId, representacao: 'EMPREGADOS' }), 'Candidato inscrito.');
              }}
            >
              <Selecao id="candidato" name="colaboradorId" rotulo="Inscrever candidato" className="min-w-64 flex-1">
                <option value="">Escolha um colaborador</option>
                {livres.map((c) => <option key={c.id} value={c.id}>{c.nome} · {c.cargo}</option>)}
              </Selecao>
              <Botao type="submit">Inscrever</Botao>
            </form>

            {eleicao.candidatos.length > 0 && (
              <>
                <p className="mt-5 text-sm text-text/60">
                  Depois da apuração, digite os votos de cada um. A ordem e quem fica titular ou suplente saem sozinhos; no empate, vence quem tem mais tempo de casa.
                </p>
                <table className="mt-2 w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text/60">
                      <th className="py-2">Candidato</th><th className="w-24">Votos</th><th>Resultado</th><th>Vice</th><th />
                    </tr>
                  </thead>
                  <tbody>
                    {eleicao.candidatos.map((c) => (
                      <tr key={c.membroId} className="border-b border-border">
                        <td className="py-2">{c.nome}<span className="block text-xs text-text/60">{c.cargo}</span></td>
                        <td>
                          <input
                            aria-label={`Votos de ${c.nome}`}
                            type="number"
                            min={0}
                            defaultValue={c.votos ?? ''}
                            className="w-20 rounded-card border border-border bg-background px-2 py-1.5"
                            onBlur={(ev) => {
                              const votos = Number(ev.currentTarget.value);
                              if (ev.currentTarget.value !== '' && votos !== c.votos) agir(() => atualizarMembroCipa(empresaId, eleicao.id, c.membroId, { votos }));
                            }}
                          />
                        </td>
                        <td className={c.situacao === 'NAO_ELEITO' ? 'text-text/60' : 'font-semibold text-success'}>
                          {c.votos === null ? '—' : `${c.posicao}º · ${SITUACAO[c.situacao]}`}
                        </td>
                        <td>
                          {c.situacao === 'TITULAR' && (
                            <input type="radio" name="vice" aria-label={`${c.nome} é vice-presidente`} checked={c.vice} className="accent-primary"
                              onChange={() => agir(() => atualizarMembroCipa(empresaId, eleicao.id, c.membroId, { vice: true }), 'Vice-presidente escolhido.')} />
                          )}
                        </td>
                        <td className="text-right">
                          <button className="text-xs text-danger hover:underline" onClick={() => agir(() => removerMembroCipa(empresaId, eleicao.id, c.membroId))}>Remover</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <form
              className="mt-5 flex flex-wrap items-end gap-3"
              onSubmit={(ev) => {
                ev.preventDefault();
                const votantes = Number(texto(new FormData(ev.currentTarget), 'votantes'));
                agir(() => atualizarEleicao(empresaId, eleicao.id, { votantes }), 'Participação salva.');
              }}
            >
              <Campo id="votantes" name="votantes" type="number" min={0} rotulo="Quantos funcionários votaram" defaultValue={eleicao.votantes ?? ''}
                ajuda={{ oQueE: 'Se votarem menos da metade dos funcionários, a votação é prorrogada antes de apurar.', baseLegal: 'NR-05, 5.5.4' }} />
              <Botao type="submit">Salvar participação</Botao>
              {eleicao.participacao && (
                <span className={`pb-3 text-sm font-semibold ${eleicao.participacao.valida ? 'text-success' : 'text-danger'}`}>
                  {eleicao.participacao.percentual.toLocaleString('pt-BR')}% de participação
                  {eleicao.participacao.valida ? ' · válida' : ' · abaixo de 50%: prorrogue a votação'}
                </span>
              )}
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              <Documento doc="inscritos" nome="Inscritos-CIPA">Baixar relação de inscritos</Documento>
              <Documento doc="cedulas" nome="Cedulas-CIPA">Baixar cédulas</Documento>
              <Documento doc="ata-eleicao" nome="Ata-eleicao-CIPA">Baixar ata de eleição</Documento>
            </div>
          </Cartao>

          <Cartao titulo="3. Indicados pela empresa">
            <p className="mb-4 text-sm text-text/60">
              A empresa indica {eleicao.vagas.efetivos} titular(es) e {eleicao.vagas.suplentes} suplente(s), e escolhe entre eles o presidente.
            </p>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(ev) => {
                ev.preventDefault();
                const d = new FormData(ev.currentTarget);
                const colaboradorId = texto(d, 'colaboradorId');
                if (colaboradorId) {
                  agir(
                    () => adicionarMembroCipa(empresaId, eleicao.id, { colaboradorId, representacao: 'ORGANIZACAO', titular: texto(d, 'titular') === 'sim' }),
                    'Indicado registrado.',
                  );
                }
              }}
            >
              <Selecao id="indicado" name="colaboradorId" rotulo="Indicar colaborador" className="min-w-64 flex-1">
                <option value="">Escolha um colaborador</option>
                {livres.map((c) => <option key={c.id} value={c.id}>{c.nome} · {c.cargo}</option>)}
              </Selecao>
              <Selecao id="indicado-tipo" name="titular" rotulo="Como">
                <option value="sim">Titular</option>
                <option value="nao">Suplente</option>
              </Selecao>
              <Botao type="submit">Indicar</Botao>
            </form>
            {eleicao.indicados.length > 0 && (
              <ul className="mt-4 divide-y divide-border text-sm">
                {eleicao.indicados.map((m) => (
                  <li key={m.membroId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>{m.nome} · {m.titular ? 'Titular' : 'Suplente'}</span>
                    <span className="flex items-center gap-4">
                      {m.titular && (
                        <label className="flex items-center gap-1.5">
                          <input type="radio" name="presidente" checked={m.presidente} className="accent-primary"
                            onChange={() => agir(() => atualizarMembroCipa(empresaId, eleicao.id, m.membroId, { presidente: true }), 'Presidente escolhido.')} />
                          Presidente
                        </label>
                      )}
                      <button className="text-xs text-danger hover:underline" onClick={() => agir(() => removerMembroCipa(empresaId, eleicao.id, m.membroId))}>Remover</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          <Cartao titulo="4. Posse e treinamento">
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(ev) => {
                ev.preventDefault();
                const d = new FormData(ev.currentTarget);
                const dados: Record<string, string> = {};
                for (const campo of ['posseEm', 'treinamentoInicio', 'treinamentoFim', 'instrutor']) if (texto(d, campo)) dados[campo] = texto(d, campo);
                agir(() => atualizarEleicao(empresaId, eleicao.id, dados), 'Posse e treinamento salvos. O calendário da CIPA passou a contar da nova posse.');
              }}
            >
              <Campo id="posse" name="posseEm" type="date" rotulo="Data da posse" defaultValue={dia(eleicao.posseEm)}
                ajuda={{ oQueE: 'Primeiro dia útil depois do fim do mandato anterior. Abre o novo mandato de um ano.', baseLegal: 'NR-05, 5.4.6 e 5.4.7' }} />
              <Campo id="instrutor" name="instrutor" rotulo="Instrutor(a) do treinamento" defaultValue={eleicao.instrutor ?? ''} placeholder="Ex.: Cleude Oliveira" />
              <Campo id="trein-inicio" name="treinamentoInicio" type="date" rotulo="Treinamento: início" defaultValue={dia(eleicao.treinamentoInicio)}
                ajuda={{ oQueE: `Antes da posse, com no mínimo ${eleicao.cargaHoraria ?? '—'} horas para o grau de risco desta empresa, no máximo 8 horas por dia.`, baseLegal: 'NR-05, 5.7.1 e 5.7.4' }} />
              <Campo id="trein-fim" name="treinamentoFim" type="date" rotulo="Treinamento: fim" defaultValue={dia(eleicao.treinamentoFim)} />
              <div className="flex justify-end md:col-span-2"><Botao type="submit">Salvar</Botao></div>
            </form>
            {eleicao.fimMandato && <p className="mt-2 text-sm">Mandato até <strong>{data(eleicao.fimMandato)}</strong>.</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Documento doc="ata-posse" nome="Ata-posse-CIPA">Baixar ata de posse</Documento>
              <Documento doc="certificados" nome="Certificados-CIPA">Baixar certificados</Documento>
            </div>
          </Cartao>
        </>
      )}
    </main>
  );
}
