'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import {
  atualizarEmpresa,
  AcessoEmpresa,
  buscarCipa,
  criarAcesso,
  listarAcessos,
  removerAcesso,
  reenviarConvite,
  buscarEmpresa,
  Cipa,
  Colaborador,
  criarColaborador,
  criarExame,
  criarGhe,
  atualizarGhe,
  excluirGhe,
  excluirEmpresa,
  DadosGhe,
  criarRisco,
  avaliarRisco,
  ajustarRisco,
  Risco,
  AvaliacaoRisco,
  AnexosLaudo,
  buscarAnexosLaudo,
  definirPericulosidade,
  TipoDocumento,
  definirMedico,
  Empresa,
  enviarLogoEmpresa,
  gerarCipa,
  gerarDocumento,
  gerarRelatorioPcmso,
  Ghe,
  listarColaboradores,
  listarGhes,
  salvarArquivo,
  salvarCipa,
  salvarCodigoExame,
  UNIDADES_ESOCIAL,
  RiscoEsocial,
  buscarTabelasEsocial,
  TabelasEsocial,
} from '@/lib/api';
import { EscolhaTabela } from '@/components/EscolhaTabela';
import { ehEmpresa } from '@/lib/sessao';
import { CopiarDados } from '@/components/CopiarDados';
import { FormGhe } from '@/components/FormGhe';
import { rolarParaAncora } from '@/lib/abaDoEndereco';

const TIPOS_RISCO = [
  ['FISICO', 'Físico'],
  ['QUIMICO', 'Químico'],
  ['BIOLOGICO', 'Biológico'],
  ['ERGONOMICO', 'Ergonômico'],
  ['ACIDENTE', 'Acidente'],
] as const;

const MOMENTOS = [
  ['admissional', 'Admissional'],
  ['periodico', 'Periódico'],
  ['retornoTrabalho', 'Retorno ao trabalho'],
  ['mudancaRisco', 'Mudança de risco'],
  ['demissional', 'Demissional'],
] as const;

export default function EmpresaPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [ghes, setGhes] = useState<Ghe[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [cipa, setCipa] = useState<Cipa | null>(null);
  const [cliente, setCliente] = useState(false);
  const [acessos, setAcessos] = useState<AcessoEmpresa[]>([]);
  const [convite, setConvite] = useState<Convite | null>(null);
  const [anexos, setAnexos] = useState<AnexosLaudo | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  useEffect(() => { const t = new URLSearchParams(window.location.search).get('aviso'); if (t) setAviso({ tipo: 'erro', texto: t }); }, []);

  const recarregar = useCallback(async () => {
    try {
      const [e, g, c, ci] = await Promise.all([
        buscarEmpresa(empresaId),
        listarGhes(empresaId),
        listarColaboradores(empresaId),
        buscarCipa(empresaId),
      ]);
      setEmpresa(e);
      setCipa(ci);
      // Logins da empresa cliente: só a consultoria vê e cria.
      if (!ehEmpresa()) {
        const [a, an] = await Promise.all([listarAcessos(empresaId), buscarAnexosLaudo()]);
        setAcessos(a);
        setAnexos(an);
      }
      setGhes(g);
      setColaboradores(c);
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }, [empresaId]);

  useEffect(() => {
    setCliente(ehEmpresa());
    recarregar();
  }, [recarregar]);

  // O menu lateral leva direto a uma parte desta tela (ex.: #colaboradores).
  const carregou = !!empresa;
  useEffect(() => {
    if (!carregou) return;
    const t = setTimeout(rolarParaAncora, 80);
    window.addEventListener('hashchange', rolarParaAncora);
    return () => { clearTimeout(t); window.removeEventListener('hashchange', rolarParaAncora); };
  }, [carregou]);

  // Envolve cada formulário: lê os campos, chama a API, limpa o formulário e recarrega.
  function enviar(acao: (dados: FormData) => Promise<unknown>, sucesso: string) {
    return async (evento: React.FormEvent<HTMLFormElement>) => {
      evento.preventDefault();
      const form = evento.currentTarget;
      try {
        await acao(new FormData(form));
        form.reset();
        setAviso({ tipo: 'ok', texto: sucesso });
        await recarregar();
      } catch (e) {
        setAviso({ tipo: 'erro', texto: (e as Error).message });
      }
    };
  }

  const NOMES: Record<TipoDocumento | 'cipa', [arquivo: string, aviso: string]> = {
    pgr: ['PGR', 'PGR gerado.'],
    pcmso: ['PCMSO', 'PCMSO gerado.'],
    ltcat: ['LTCAT', 'LTCAT gerado.'],
    lip: ['LIP', 'Laudo de insalubridade e periculosidade gerado.'],
    lpp: ['LPP', 'Laudo de periculosidade gerado.'],
    pgrtr: ['PGRTR', 'PGRTR gerado.'],
    os: ['Ordens-de-servico', 'Ordens de serviço geradas, uma página por colaborador.'],
    cipa: ['CIPA', 'Dimensionamento da CIPA gerado.'],
  };
  const [anoRelatorio, setAnoRelatorio] = useState(new Date().getFullYear() - 1);
  async function baixar(tipo: TipoDocumento | 'cipa') {
    try {
      const pdf = tipo === 'cipa' ? await gerarCipa(empresaId) : await gerarDocumento(empresaId, tipo);
      const [arquivo, texto] = NOMES[tipo];
      salvarArquivo(pdf, `${arquivo}-${empresa?.razaoSocial ?? 'empresa'}.pdf`);
      setAviso({ tipo: 'ok', texto });
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }

  async function agir(acao: () => Promise<unknown>, sucesso: string) {
    try {
      await acao();
      setAviso({ tipo: 'ok', texto: sucesso });
      await recarregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }

  // Salva o GHE e diz se deu certo, para o formulário saber se limpa os campos.
  async function salvarGhe(acao: () => Promise<unknown>, sucesso: string): Promise<boolean> {
    try {
      await acao();
      setAviso({ tipo: 'ok', texto: sucesso });
      await recarregar();
      return true;
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
      return false;
    }
  }
  const cargos = [...new Set(colaboradores.map((c) => c.cargo).filter(Boolean))].sort();

  if (!empresa) {
    return <main className="p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando empresa…'}</main>;
  }

  const texto = (dados: FormData, campo: string) => String(dados.get(campo) ?? '').trim();

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <div>
        <Link href={`/?empresa=${empresaId}`} className="text-sm text-primary">← Voltar ao painel</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">{empresa.razaoSocial}</h1>
        <p className="text-text/60">CNPJ {empresa.cnpj}</p>
      </div>

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      {cliente && <Aviso tipo="info">Aqui você cadastra os colaboradores e abre o ASO e o EPI de cada um. Os programas e documentos são feitos pela sua consultoria.</Aviso>}

      {!cliente && (<>
      <Cartao titulo="1. Dados da empresa" id="dados">
        <form
          className="grid gap-4 md:grid-cols-3"
          onSubmit={enviar(async (d) => {
            await atualizarEmpresa(empresaId, {
              cnae: texto(d, 'cnae') || undefined,
              grauRisco: texto(d, 'grauRisco') ? Number(texto(d, 'grauRisco')) : undefined,
              numFuncionarios: Number(texto(d, 'numFuncionarios') || 0),
              responsavelTecnicoNome: texto(d, 'rtNome') || undefined,
              responsavelTecnicoRegistro: texto(d, 'rtRegistro') || undefined,
              representanteLegalNome: texto(d, 'representante') || undefined,
              descricaoProcessos: texto(d, 'processos'),
            });
            const logo = d.get('logo');
            if (logo instanceof File && logo.size > 0) await enviarLogoEmpresa(empresaId, logo);
          }, 'Dados da empresa salvos.')}
        >
          <Campo id="cnae" name="cnae" rotulo="CNAE" defaultValue={empresa.cnae ?? ''} placeholder="Ex.: 10.91-1-01" />
          <Selecao id="grauRisco" name="grauRisco" rotulo="Grau de risco" defaultValue={empresa.grauRisco ?? ''}>
            <option value="">Pelo CNAE</option>
            {[1, 2, 3, 4].map((g) => <option key={g} value={g}>{g}</option>)}
          </Selecao>
          <Campo id="numFuncionarios" name="numFuncionarios" type="number" min={0} rotulo="Funcionários" defaultValue={empresa.numFuncionarios} />
          <Campo id="logo" name="logo" type="file" accept="image/png,image/jpeg" rotulo="Logo da empresa" className="md:col-span-2"
            dica={empresa.logoPath ? 'Logo já enviada. Envie outra para trocar.' : 'PNG ou JPG, até 2 MB. Sai no cabeçalho dos documentos.'} />
          <Campo id="rtNome" name="rtNome" rotulo="Responsável técnico" defaultValue={empresa.responsavelTecnicoNome ?? ''} placeholder="Ex.: Cleude Oliveira" />
          <Campo id="rtRegistro" name="rtRegistro" rotulo="Registro profissional" defaultValue={empresa.responsavelTecnicoRegistro ?? ''} placeholder="Ex.: CREA-SP 123456" />
          <Campo id="representante" name="representante" rotulo="Representante legal" defaultValue={empresa.representanteLegalNome ?? ''} placeholder="Quem assina o PPP pela empresa" />
          <Campo id="processos" name="processos" rotulo="Visão geral da empresa (opcional, vai no PGR)" className="md:col-span-3" defaultValue={empresa.descricaoProcessos ?? ''}
            placeholder="Ex.: Padaria com produção, estoque e loja. Turno único, 8 h."
            dica="Só um resumo. O ambiente de cada setor é descrito no próprio GHE, logo abaixo." />
          <div className="flex items-end justify-end md:col-span-3"><Botao type="submit">Salvar dados</Botao></div>
        </form>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-text/60">Excluir apaga a empresa e tudo dela: GHEs, colaboradores, ASOs, documentos e registros. Não dá para desfazer. Antes, baixe o que precisa guardar (prontuários e laudos ficam guardados por 20 anos).</p>
          <button type="button" className="rounded-card border border-danger px-4 py-2 text-sm font-semibold text-danger hover:bg-danger hover:text-white"
            onClick={async () => {
              const nome = prompt(`Para excluir de vez, digite o nome da empresa:\n${empresa.razaoSocial}`);
              if (!nome) return;
              try { await excluirEmpresa(empresaId, nome); alert(`Empresa ${empresa.razaoSocial} excluída.`); window.location.href = '/'; }
              catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
            }}>Excluir empresa</button>
        </div>
      </Cartao>

      <Cartao titulo="2. GHEs, riscos e exames" id="ghes" acao={<Link href={`/empresas/${empresaId}/importar-pdf`} className="text-sm font-semibold text-primary hover:underline">Já tem PGR antigo? Traga com IA →</Link>}>
        {!cliente && <div className="mb-4"><CopiarDados empresaId={empresaId} aoCopiar={(t, erro) => { setAviso({ tipo: erro ? 'erro' : 'ok', texto: t }); if (!erro) recarregar(); }} /></div>}
        <FuncoesDaEmpresa ghes={ghes} colaboradores={colaboradores} />
        <details className="rounded-card border border-primary/30 bg-primary/5 p-4" open={ghes.length === 0}>
          <summary className="cursor-pointer font-semibold text-primary">+ Novo GHE (por setor e função)</summary>
          <div className="mt-4">
            <FormGhe chave="novo" cargos={cargos} textoBotao="Adicionar GHE"
              salvar={(dados) => salvarGhe(() => criarGhe(empresaId, dados), `GHE do setor ${dados.setor} cadastrado.`)} />
          </div>
        </details>

        <div className="mt-6 space-y-6">
          {ghes.length === 0 && <p className="text-sm text-text/60">Nenhum GHE ainda. Comece pelo primeiro acima.</p>}
          {ghes.map((ghe) => (
            <article key={ghe.id} className="rounded-card border border-border p-4">
              <h3 className="font-semibold text-primary">
                {ghe.nome} <span className="text-sm font-normal text-text/60">· {ghe._count.colaboradores} colaborador(es)</span>
              </h3>
              <ResumoGhe ghe={ghe} cargos={cargos} salvar={(dados) => salvarGhe(() => atualizarGhe(empresaId, ghe.id, dados), `${ghe.nome} atualizado.`)}
                excluir={() => confirm(`Excluir ${ghe.nome}? Os riscos e exames dele saem junto. Os colaboradores continuam cadastrados, só ficam sem GHE.`) && agir(() => excluirGhe(empresaId, ghe.id), `${ghe.nome} excluído.`)} />

              <h4 className="mt-3 text-sm font-semibold">Riscos</h4>
              {ghe.riscos.length === 0 ? (
                <p className="text-sm text-warning">Nenhum risco. O PGR precisa de pelo menos um.</p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm">
                  {ghe.riscos.map((r) => (
                    <li key={r.id}>
                      {r.agente} · {r.fonteGeradora} · <SeloNivel severidade={r.severidade} probabilidade={r.probabilidade ?? 'MEDIA'} />
                      {!cliente && <AjustarRisco risco={r} salvar={(dados) => agir(() => ajustarRisco(empresaId, ghe.id, r.id, dados), `Classificação de ${r.agente} salva.`)} />}
                      {AGENTES_LTCAT.includes(r.tipo) && (
                        <AvaliarRisco risco={r} anexos={anexos} salvar={(dados) => agir(() => avaliarRisco(empresaId, ghe.id, r.id, dados), `Avaliação de ${r.agente} salva.`)} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <form
                className="mt-3 grid gap-3 md:grid-cols-4"
                onSubmit={enviar(
                  (d) =>
                    criarRisco(empresaId, ghe.id, {
                      tipo: texto(d, 'tipo'),
                      agente: texto(d, 'agente'),
                      fonteGeradora: texto(d, 'fonte'),
                      medidasControle: texto(d, 'medidas') || null,
                      severidade: texto(d, 'severidade'),
                      probabilidade: texto(d, 'probabilidade'),
                      possiveisLesoes: texto(d, 'lesoes') || null,
                    }),
                  'Risco adicionado.',
                )}
              >
                <Selecao id={`tipo-${ghe.id}`} name="tipo" rotulo="Tipo">
                  {TIPOS_RISCO.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
                </Selecao>
                <Campo id={`agente-${ghe.id}`} name="agente" rotulo="Agente ou perigo" required placeholder="Ex.: Ruído" />
                <Campo id={`fonte-${ghe.id}`} name="fonte" rotulo="Fonte geradora" required placeholder="Ex.: Misturadeira" />
                <Selecao id={`sev-${ghe.id}`} name="severidade" rotulo="Severidade" defaultValue="MEDIA">
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                </Selecao>
                <Selecao id={`prob-${ghe.id}`} name="probabilidade" rotulo="Probabilidade" defaultValue="MEDIA">
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                </Selecao>
                <Campo id={`lesoes-${ghe.id}`} name="lesoes" rotulo="Possíveis lesões ou agravos" className="md:col-span-3" placeholder="Ex.: Perda auditiva, zumbido" />
                <Campo id={`medidas-${ghe.id}`} name="medidas" rotulo="Medidas de controle" className="md:col-span-3" placeholder="Ex.: Protetor auricular tipo plug" />
                <div className="flex items-end justify-end"><Botao type="submit" variante="secundario">Adicionar risco</Botao></div>
              </form>

              {anexos && (
                <Periculosidade ghe={ghe} anexos={anexos}
                  salvar={(dados) => agir(() => definirPericulosidade(empresaId, ghe.id, dados), `Periculosidade de ${ghe.nome} salva.`)} />
              )}

              <h4 className="mt-5 text-sm font-semibold">Exames do PCMSO</h4>
              {ghe.exames.length === 0 ? (
                <p className="text-sm text-warning">Nenhum exame programado.</p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm">
                  {ghe.exames.map((e) => (
                    <li key={e.id}>
                      {e.nome} · {MOMENTOS.filter(([campo]) => e[campo]).map(([, nome]) => nome.toLowerCase()).join(', ')}
                      {e.periodicidadeMeses ? ` · a cada ${e.periodicidadeMeses} meses` : ''}
                      {' · '}
                      <CodigoExame id={e.id} valor={e.codigoEsocial ?? ''} salvar={(cod) => agir(() => salvarCodigoExame(empresaId, ghe.id, e.id, cod), `Código de ${e.nome} salvo.`)} />
                    </li>
                  ))}
                </ul>
              )}
              <form
                className="mt-3 grid gap-3 md:grid-cols-3"
                onSubmit={enviar(
                  (d) =>
                    criarExame(empresaId, ghe.id, {
                      nome: texto(d, 'nome'),
                      tipo: texto(d, 'tipo'),
                      admissional: d.has('admissional'),
                      periodico: d.has('periodico'),
                      retornoTrabalho: d.has('retornoTrabalho'),
                      mudancaRisco: d.has('mudancaRisco'),
                      demissional: d.has('demissional'),
                      periodicidadeMeses: texto(d, 'periodicidade') ? Number(texto(d, 'periodicidade')) : null,
                      codigoEsocial: texto(d, 'codigoEsocial') || undefined,
                    }),
                  'Exame programado.',
                )}
              >
                <Campo id={`exame-${ghe.id}`} name="nome" rotulo="Exame" required placeholder="Ex.: Audiometria" />
                <Selecao id={`exame-tipo-${ghe.id}`} name="tipo" rotulo="Tipo">
                  <option value="CLINICO">Clínico</option>
                  <option value="COMPLEMENTAR">Complementar</option>
                </Selecao>
                <Campo id={`exame-per-${ghe.id}`} name="periodicidade" type="number" min={1} max={60} rotulo="Periodicidade (meses)" placeholder="Ex.: 12" />
                <EscolhaT27 id={`exame-cod-${ghe.id}`} className="md:col-span-3" />
                <fieldset className="flex flex-wrap gap-4 text-sm md:col-span-2">
                  <legend className="mb-1 font-semibold">Quando é feito</legend>
                  {MOMENTOS.map(([campo, nome]) => (
                    <label key={campo} className="flex items-center gap-1.5">
                      <input type="checkbox" name={campo} defaultChecked={campo === 'admissional' || campo === 'periodico'} /> {nome}
                    </label>
                  ))}
                </fieldset>
                <div className="flex items-end justify-end"><Botao type="submit" variante="secundario">Adicionar exame</Botao></div>
              </form>
            </article>
          ))}
        </div>
      </Cartao>
      </>)}

      <Cartao titulo="3. Colaboradores" id="colaboradores">
        <form
          className="grid gap-4 md:grid-cols-3"
          onSubmit={enviar(
            (d) =>
              criarColaborador(empresaId, {
                nome: texto(d, 'nome'),
                cpf: texto(d, 'cpf') || null,
                dataAdmissao: texto(d, 'dataAdmissao') || null,
                cargo: texto(d, 'cargo'),
                cbo: texto(d, 'cbo') || null,
                gheId: texto(d, 'gheId') || null,
                matricula: texto(d, 'matricula') || null,
              }),
            'Colaborador cadastrado.',
          )}
        >
          <Campo id="colab-nome" name="nome" rotulo="Nome" required placeholder="Ex.: Maria Silva" />
          <Campo id="colab-cpf" name="cpf" rotulo="CPF" placeholder="Ex.: 123.456.789-00" />
          <Campo id="colab-cargo" name="cargo" rotulo="Cargo" required placeholder="Ex.: Padeira" />
          <Campo id="colab-admissao" name="dataAdmissao" type="date" rotulo="Admissão" />
          <Campo id="colab-cbo" name="cbo" rotulo="CBO" placeholder="Ex.: 8483-05" />
          <Campo id="colab-matricula" name="matricula" rotulo="Matrícula no eSocial" placeholder="Ex.: 000123" />
          <Selecao id="colab-ghe" name="gheId" rotulo="GHE">
            <option value="">Sem GHE</option>
            {ghes.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </Selecao>
          <div className="flex justify-end md:col-span-3"><Botao type="submit">Adicionar colaborador</Botao></div>
        </form>
        <ul className="mt-4 divide-y divide-border text-sm">
          {colaboradores.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className={c.dataDesligamento ? 'text-text/50' : ''}>{c.nome} · {c.cargo}{c.dataDesligamento ? ' · saiu da empresa' : ''}</span>
              <span className="flex items-center gap-4">
                <span className={c.gheId ? 'text-text/60' : 'text-warning'}>{ghes.find((g) => g.id === c.gheId)?.nome ?? 'Sem GHE'}</span>
                <Link href={`/empresas/${empresaId}/colaboradores/${c.id}`} className="font-semibold text-primary hover:underline">
                  ASO e EPI →
                </Link>
              </span>
            </li>
          ))}
        </ul>
      </Cartao>

      {!cliente && (
      <Cartao titulo="4. Médico responsável pelo PCMSO" id="medico">
        <form
          className="grid gap-4 md:grid-cols-3"
          onSubmit={enviar((d) => definirMedico(empresaId, { nome: texto(d, 'nome'), crm: texto(d, 'crm') }), 'Médico salvo.')}
        >
          <Campo id="medico-nome" name="nome" rotulo="Nome" required defaultValue={empresa.medicoPcmsoNome ?? ''} placeholder="Ex.: Dra. Ana Souza" />
          <Campo id="medico-crm" name="crm" rotulo="CRM" required defaultValue={empresa.medicoPcmsoCrm ?? ''} placeholder="Ex.: 123456-SP" />
          <div className="flex items-end justify-end"><Botao type="submit">Salvar médico</Botao></div>
        </form>
      </Cartao>
      )}

      {cipa && (
        <Cartao
          titulo="5. CIPA"
          id="cipa"
          acao={cipa.dimensionamento.situacao !== 'SEM_GRAU' && (
            <div className="flex flex-wrap gap-2">
              <Botao variante="secundario" onClick={() => baixar('cipa')}>Baixar dimensionamento</Botao>
              {cipa.dimensionamento.situacao === 'CIPA' && !cliente && (
                <Link href={`/empresas/${empresaId}/cipa`} className="rounded-card bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
                  Organizar eleição →
                </Link>
              )}
            </div>
          )}
        >
          <ResumoCipa cipa={cipa} />
          {cipa.dimensionamento.situacao !== 'SEM_GRAU' && !cliente && (
            <form
              className="mt-4 grid gap-4 md:grid-cols-3"
              onSubmit={enviar(
                (d) =>
                  salvarCipa(empresaId, {
                    atendidaSesmt: d.get('atendidaSesmt') === 'on',
                    ...(texto(d, 'inicioMandato') ? { inicioMandato: texto(d, 'inicioMandato') } : {}),
                    ...(d.has('representante') ? { representante: texto(d, 'representante') } : {}),
                  }),
                'CIPA salva.',
              )}
            >
              <Campo id="cipa-inicio" name="inicioMandato" type="date" rotulo="Início do mandato atual"
                defaultValue={cipa.calendario?.inicioMandato.slice(0, 10) ?? ''} />
              {cipa.dimensionamento.situacao === 'REPRESENTANTE' && (
                <Campo id="cipa-representante" name="representante" rotulo="Representante nomeado" placeholder="Ex.: João Lima"
                  defaultValue={cipa.representante ?? ''} />
              )}
              <label className="flex items-center gap-2 self-end pb-3 text-sm">
                <input type="checkbox" name="atendidaSesmt" defaultChecked={cipa.atendidaSesmt} className="h-4 w-4 accent-primary" />
                Empresa atendida por SESMT
              </label>
              <div className="flex justify-end md:col-span-3"><Botao type="submit">Salvar CIPA</Botao></div>
            </form>
          )}
        </Cartao>
      )}

      {!cliente && (<>
      <Cartao titulo="6. Documentos" id="documentos">
        <p className="mb-4 text-sm text-text/60">Cada documento sai em PDF com a logo da empresa no cabeçalho e a da sua consultoria no rodapé.
          O LTCAT e o LIP usam as avaliações dos riscos físicos, químicos e biológicos de cada GHE; o LPP usa a periculosidade de cada GHE.
          O PGRTR é a versão do PGR para atividade rural (NR-31). O PPP e a ordem de serviço de cada pessoa também ficam na página do colaborador.</p>
        {empresa.grauRisco && empresa.grauRisco <= 2 && ghes.length > 0 && !ghes.some((g) => g.riscos.some((r) => ['FISICO', 'QUIMICO', 'BIOLOGICO'].includes(r.tipo))) && (
          <div className="mb-4"><Aviso tipo="info">
            Esta empresa é grau de risco {empresa.grauRisco} e não tem risco físico, químico nem biológico cadastrado. Se ela for MEI, microempresa ou empresa
            de pequeno porte, pode ficar dispensada do PGR (NR-01, item 1.8). Para isso, a empresa precisa fazer a declaração digital de inexistência de riscos
            no gov.br. Os riscos ergonômicos e de acidente continuam precisando de atenção, e a NR-17 segue valendo.
          </Aviso></div>
        )}
        <div className="flex flex-wrap gap-3">
          <Botao onClick={() => baixar('pgr')}>Gerar PGR</Botao>
          <Botao onClick={() => baixar('pcmso')}>Gerar PCMSO</Botao>
          <span className="flex items-center gap-1">
            <select aria-label="Ano do relatório do PCMSO" value={anoRelatorio} onChange={(e) => setAnoRelatorio(Number(e.target.value))}
              className="rounded-card border border-border bg-white px-2 py-2 text-sm">
              {[0, 1, 2].map((n) => <option key={n} value={new Date().getFullYear() - n}>{new Date().getFullYear() - n}</option>)}
            </select>
            <Botao variante="secundario" title="Resumo do ano: exames feitos, resultados alterados, CATs e comparação com o ano anterior (NR-07)" onClick={async () => {
              try { salvarArquivo(await gerarRelatorioPcmso(empresaId, anoRelatorio), `Relatorio-PCMSO-${anoRelatorio}-${empresa?.razaoSocial ?? 'empresa'}.pdf`); setAviso({ tipo: 'ok', texto: `Relatório do PCMSO de ${anoRelatorio} gerado. Falta o médico escrever a análise e assinar.` }); }
              catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
            }}>Relatório anual do PCMSO</Botao>
          </span>
          <Botao onClick={() => baixar('ltcat')}>Gerar LTCAT</Botao>
          <Botao onClick={() => baixar('lip')}>Gerar LIP</Botao>
          <Botao onClick={() => baixar('lpp')}>Gerar LPP</Botao>
          <Botao onClick={() => baixar('pgrtr')} title="Para empresas com atividade rural (NR-31)">Gerar PGRTR</Botao>
          <Botao variante="secundario" onClick={() => baixar('os')}>Ordens de serviço (todos)</Botao>
          <Link href={`/empresas/${empresaId}/prontuario`} className="rounded-card border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">Prontuário: vacinas e exames →</Link>
          <Link href={`/empresas/${empresaId}/saude`} className="rounded-card border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">AET e CAT →</Link>
          <Link href={`/empresas/${empresaId}/esocial`} className="rounded-card border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">eSocial →</Link>
          <Link href={`/empresas/${empresaId}/historico`} className="rounded-card border border-border px-4 py-2 text-sm font-semibold text-text/70 hover:bg-primary/5">Histórico →</Link>
          <Link href={`/empresas/${empresaId}/cultura`} className="rounded-card border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">SIPAT e 5S →</Link>
          <Link href={`/empresas/${empresaId}/importar-pdf`} className="rounded-card border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">Trazer PGR antigo (IA) →</Link>
          <Link href={`/empresas/${empresaId}/ssma`} className="rounded-card border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">Painel SSMA →</Link>
          <Link href={`/empresas/${empresaId}/fap`} className="rounded-card border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">FAP e RAT →</Link>
          <Link href={`/empresas/${empresaId}/almoxarifado`} className="rounded-card border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">Almoxarifado de EPI →</Link>
          <Link href={`/empresas/${empresaId}/psicossocial`} className="rounded-card border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">Psicossocial →</Link>
          <Link href={`/empresas/${empresaId}/arquivo`} className="rounded-card border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">Arquivo de documentos →</Link>
          <Link href={`/empresas/${empresaId}/conectores`} className="rounded-card border border-border px-4 py-2 text-sm font-semibold text-text/70 hover:bg-primary/5">Importar do RH, terceiros e faltas →</Link>
        </div>
      </Cartao>

      <Cartao titulo="7. Acesso da empresa ao sistema" id="acessos">
        <p className="mb-4 text-sm text-text/60">
          Convide a empresa cliente. Ela recebe um link, cria a própria senha e vê só os dados dela: colaboradores, EPI, DDS, permissões de trabalho,
          treinamentos e vencimentos. Programas e documentos continuam com você.
        </p>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const form = ev.currentTarget;
            const d = new FormData(form);
            try {
              const r = await criarAcesso(empresaId, { nome: texto(d, 'nome'), email: texto(d, 'email') });
              setConvite({ nome: r.nome, link: r.link!, whatsapp: r.whatsapp!, emailEnviado: !!r.emailEnviado });
              form.reset();
              await recarregar();
            } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
          }}
        >
          <Campo id="acesso-nome" name="nome" rotulo="Nome de quem vai usar" required placeholder="Ex.: RH da Padaria" icone="cracha" />
          <Campo id="acesso-email" name="email" type="email" rotulo="E-mail" required placeholder="Ex.: rh@empresa.com.br" />
          <div className="flex justify-end md:col-span-2"><Botao type="submit">Convidar cliente</Botao></div>
        </form>
        {convite && <LinkConvite convite={convite} fechar={() => setConvite(null)} />}
        {acessos.length > 0 && (
          <ul className="mt-4 divide-y divide-border text-sm">
            {acessos.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{a.nome} · <span className="text-text/60">{a.email}</span></span>
                <span className="flex gap-3">
                  <button className="text-xs font-semibold text-primary hover:underline" onClick={async () => {
                    try { const r = await reenviarConvite(empresaId, a.id); setConvite({ nome: a.nome, ...r }); }
                    catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
                  }}>Mandar link de senha</button>
                  <button className="text-xs text-danger hover:underline" onClick={async () => {
                    try { await removerAcesso(empresaId, a.id); setAviso({ tipo: 'ok', texto: 'Acesso removido. Esse login para de funcionar na hora.' }); await recarregar(); }
                    catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
                  }}>Remover acesso</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
      </>)}
    </main>
  );
}

const dataBr = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

// Explica o resultado do Quadro I da NR-05 em linguagem simples.
function ResumoCipa({ cipa }: { cipa: Cipa }) {
  const d = cipa.dimensionamento;
  if (d.situacao === 'SEM_GRAU') {
    return <Aviso tipo="info">Informe o CNAE ou o grau de risco nos dados da empresa para o sistema calcular a CIPA.</Aviso>;
  }
  if (d.situacao === 'REPRESENTANTE') {
    return (
      <p className="text-sm">
        Com {cipa.numFuncionarios} funcionário(s) no grau de risco {cipa.grauRisco}, a empresa <strong>não precisa de CIPA</strong> (passa a precisar a
        partir de {d.minimoParaCipa}).{' '}
        {cipa.atendidaSesmt
          ? 'Como é atendida por SESMT, ele cumpre esse papel.'
          : 'Ela deve nomear um representante entre os funcionários para ajudar na prevenção.'}
      </p>
    );
  }
  const c = cipa.calendario;
  return (
    <div className="space-y-3 text-sm">
      <p>
        Com {cipa.numFuncionarios} funcionário(s) no grau de risco {cipa.grauRisco}, a CIPA precisa de{' '}
        <strong>{d.efetivos} efetivo(s) e {d.suplentes} suplente(s) eleitos pelos funcionários</strong>, e o mesmo número indicado pela empresa.
      </p>
      {c && (
        <ul className="grid gap-2 md:grid-cols-4">
          {[
            ['Fim do mandato', c.fimMandato],
            ['Publicar edital até', c.convocacaoAte],
            ['Eleição até', c.eleicaoAte],
            ['Posse da nova gestão', c.posse],
          ].map(([rotulo, data]) => (
            <li key={rotulo} className="rounded-card border border-border bg-background px-3 py-2">
              <span className="block text-xs text-text/60">{rotulo}</span>
              <strong>{dataBr(data)}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const AGENTES_LTCAT: string[] = ['FISICO', 'QUIMICO', 'BIOLOGICO'];

// Avaliação do agente para o LTCAT e o PPP. Fica fechada até a consultoria abrir.
// NR-01, 1.5.4.4.2: o nível de risco combina severidade e probabilidade (mesma matriz do PDF do PGR).
const PESO_GRAU: Record<string, number> = { BAIXA: 1, MEDIA: 2, ALTA: 3 };
function nivelDoRisco(severidade: string, probabilidade: string) {
  const p = (PESO_GRAU[severidade] ?? 2) * (PESO_GRAU[probabilidade] ?? 2);
  if (p >= 9) return { nome: 'Crítico', cor: 'bg-red-900 text-white' };
  if (p >= 6) return { nome: 'Alto', cor: 'bg-danger text-white' };
  if (p >= 3) return { nome: 'Moderado', cor: 'bg-warning text-white' };
  return { nome: 'Baixo', cor: 'bg-success text-white' };
}

function SeloNivel({ severidade, probabilidade }: { severidade: string; probabilidade: string }) {
  const n = nivelDoRisco(severidade, probabilidade);
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${n.cor}`} title="Nível de risco = severidade x probabilidade">Risco {n.nome.toLowerCase()}</span>;
}

function AjustarRisco({ risco, salvar }: { risco: Risco; salvar: (dados: { severidade: string; probabilidade: string; possiveisLesoes: string; medidasControle: string }) => void }) {
  return (
    <details className="ml-1 inline-block align-top">
      <summary className="cursor-pointer text-xs font-semibold text-primary hover:underline">Classificar</summary>
      <form
        className="mt-2 grid gap-2 rounded-card border border-border p-3 md:grid-cols-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          const d = new FormData(ev.currentTarget);
          salvar({ severidade: String(d.get('severidade')), probabilidade: String(d.get('probabilidade')), possiveisLesoes: String(d.get('lesoes') ?? ''), medidasControle: String(d.get('medidas') ?? '') });
        }}
      >
        <Selecao id={`aj-sev-${risco.id}`} name="severidade" rotulo="Severidade" defaultValue={risco.severidade}>
          <option value="BAIXA">Baixa</option><option value="MEDIA">Média</option><option value="ALTA">Alta</option>
        </Selecao>
        <Selecao id={`aj-prob-${risco.id}`} name="probabilidade" rotulo="Probabilidade" defaultValue={risco.probabilidade ?? 'MEDIA'}>
          <option value="BAIXA">Baixa</option><option value="MEDIA">Média</option><option value="ALTA">Alta</option>
        </Selecao>
        <Campo id={`aj-les-${risco.id}`} name="lesoes" rotulo="Possíveis lesões ou agravos" className="md:col-span-2" defaultValue={risco.possiveisLesoes ?? ''} />
        <Campo id={`aj-med-${risco.id}`} name="medidas" rotulo="Medidas de controle" className="md:col-span-2" defaultValue={risco.medidasControle ?? ''} />
        <div className="flex justify-end md:col-span-2"><Botao type="submit" variante="secundario">Salvar classificação</Botao></div>
      </form>
    </details>
  );
}

function AvaliarRisco({ risco, anexos, salvar }: { risco: Risco; anexos: AnexosLaudo | null; salvar: (dados: AvaliacaoRisco) => void }) {
  const avaliado = Boolean(risco.tipoAvaliacao);
  const [tipo, setTipo] = useState(risco.tipoAvaliacao ?? 'QUANTITATIVA');
  const [anexo, setAnexo] = useState(risco.anexoNr15 ?? '');
  const [grau, setGrau] = useState<string>(risco.grauInsalubridade ?? '');
  // Ao escolher o anexo, sugere o grau que a própria NR-15 define (quando define).
  function escolherAnexo(valor: string) {
    setAnexo(valor);
    const sugerido = anexos?.nr15.find((a) => a.anexo === valor)?.grau;
    if (sugerido && !grau) setGrau(sugerido);
  }
  const es = risco.esocial ?? {};
  const tabelas = useTabelas();
  const simNao = (v: FormDataEntryValue | null) => (v === 'S' ? true : v === 'N' ? false : null);
  const valor = (v: boolean | null | undefined) => (v === true ? 'S' : v === false ? 'N' : '');
  return (
    <details className="ml-1 inline">
      <summary className={`inline cursor-pointer text-xs font-semibold hover:underline ${avaliado ? 'text-success' : 'text-warning'}`}>
        {' '}· {avaliado ? `avaliado${risco.intensidade ? `: ${risco.intensidade}` : ''} (editar)` : 'falta avaliar para LTCAT/PPP'}
      </summary>
      <form
        className="mt-2 grid gap-3 rounded-card border border-border bg-background p-3 md:grid-cols-3"
        onSubmit={(ev) => {
          ev.preventDefault();
          const d = new FormData(ev.currentTarget);
          const t = (c: string) => String(d.get(c) ?? '').trim();
          salvar({
            tipoAvaliacao: tipo as AvaliacaoRisco['tipoAvaliacao'],
            intensidade: t('intensidade'),
            limiteTolerancia: t('limite'),
            tecnicaMedicao: t('tecnica'),
            epcEficaz: simNao(d.get('epc')),
            epiEficaz: simNao(d.get('epi')),
            epiCa: t('ca'),
            codigoAnexoIv: t('anexo'),
            aposentadoriaEspecial: d.get('especial') === 'S',
            anexoNr15: anexo || null,
            grauInsalubridade: (grau || null) as AvaliacaoRisco['grauInsalubridade'],
            esocial: {
              codAgNoc: t('codAgNoc') || undefined,
              unMed: t('unMed') ? Number(t('unMed')) : undefined,
              utilizEPC: t('utilizEPC') ? Number(t('utilizEPC')) : undefined,
              utilizEPI: t('utilizEPI') ? Number(t('utilizEPI')) : undefined,
              epiCompl: Object.fromEntries(REQUISITOS_EPI.map(([k]) => [k, d.has(k)])) as RiscoEsocial['epiCompl'],
            },
          });
        }}
      >
        <Selecao id={`av-tipo-${risco.id}`} rotulo="Avaliação" value={tipo} onChange={(e) => setTipo(e.target.value as AvaliacaoRisco['tipoAvaliacao'])}>
          <option value="QUANTITATIVA">Quantitativa (medida)</option>
          <option value="QUALITATIVA">Qualitativa</option>
        </Selecao>
        {tipo === 'QUANTITATIVA' && (<>
          <Campo id={`av-int-${risco.id}`} name="intensidade" rotulo="Resultado da medição" defaultValue={risco.intensidade ?? ''} placeholder="Ex.: 88 dB(A)" />
          <Campo id={`av-lim-${risco.id}`} name="limite" rotulo="Limite de tolerância" defaultValue={risco.limiteTolerancia ?? ''} placeholder="Ex.: 85 dB(A)" />
        </>)}
        <Campo id={`av-tec-${risco.id}`} name="tecnica" rotulo="Técnica utilizada" defaultValue={risco.tecnicaMedicao ?? ''} className="md:col-span-3"
          placeholder={tipo === 'QUANTITATIVA' ? 'Ex.: Dosimetria, NHO 01 da Fundacentro' : 'Ex.: Inspeção do ambiente e entrevista'} />
        <Selecao id={`av-epc-${risco.id}`} name="epc" rotulo="EPC eficaz?" defaultValue={valor(risco.epcEficaz)}>
          <option value="">Não se aplica</option><option value="S">Sim</option><option value="N">Não</option>
        </Selecao>
        <Selecao id={`av-epi-${risco.id}`} name="epi" rotulo="EPI eficaz?" defaultValue={valor(risco.epiEficaz)}>
          <option value="">Não se aplica</option><option value="S">Sim</option><option value="N">Não</option>
        </Selecao>
        <Campo id={`av-ca-${risco.id}`} name="ca" rotulo="CA do EPI" defaultValue={risco.epiCa ?? ''} placeholder="Ex.: 12345" />
        <Campo id={`av-anexo-${risco.id}`} name="anexo" rotulo="Código do Anexo IV" defaultValue={risco.codigoAnexoIv ?? ''} placeholder="Ex.: 2.0.1" />
        <Selecao id={`av-esp-${risco.id}`} name="especial" rotulo="Enseja aposentadoria especial?" defaultValue={risco.aposentadoriaEspecial ? 'S' : 'N'}>
          <option value="N">Não</option><option value="S">Sim</option>
        </Selecao>
        <Selecao id={`av-anexo15-${risco.id}`} rotulo="Anexo da NR-15" value={anexo} onChange={(e) => escolherAnexo(e.target.value)} className="md:col-span-2">
          <option value="">Não se enquadra / não avaliado</option>
          {anexos?.nr15.map((a) => <option key={a.anexo} value={a.anexo}>Anexo {a.anexo} · {a.nome}</option>)}
        </Selecao>
        <Selecao id={`av-grau-${risco.id}`} rotulo="Insalubridade" value={grau} onChange={(e) => setGrau(e.target.value)}>
          <option value="">Não avaliado</option>
          <option value="NAO">Não insalubre</option>
          <option value="MINIMO">Grau mínimo (10%)</option>
          <option value="MEDIO">Grau médio (20%)</option>
          <option value="MAXIMO">Grau máximo (40%)</option>
        </Selecao>
        <fieldset className="grid gap-3 border-t border-border pt-3 md:col-span-3 md:grid-cols-3">
          <legend className="text-sm font-semibold">Para o eSocial (S-2240)</legend>
          <EscolhaTabela id={`av-t24-${risco.id}`} name="codAgNoc" rotulo="Agente nocivo (Tabela 24)" itens={tabelas?.t24 ?? []} valor={es.codAgNoc}
            busca={risco.agente} className="md:col-span-3" />
          {tipo === 'QUANTITATIVA' && (
            <Selecao id={`av-un-${risco.id}`} name="unMed" rotulo="Unidade da medição" defaultValue={es.unMed ?? ''}>
              <option value="">Escolha</option>
              {UNIDADES_ESOCIAL.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
            </Selecao>
          )}
          <Selecao id={`av-uepc-${risco.id}`} name="utilizEPC" rotulo="Usa EPC?" defaultValue={es.utilizEPC ?? ''}>
            <option value="">Escolha</option><option value={0}>Não se aplica</option><option value={1}>Não implementa</option><option value={2}>Implementa</option>
          </Selecao>
          <Selecao id={`av-uepi-${risco.id}`} name="utilizEPI" rotulo="Usa EPI?" defaultValue={es.utilizEPI ?? ''}>
            <option value="">Escolha</option><option value={0}>Não se aplica</option><option value={1}>Não utiliza</option><option value={2}>Utiliza</option>
          </Selecao>
          <div className="space-y-1 text-sm md:col-span-3">
            <p className="font-semibold">Quando usa EPI, o que foi observado (NR-06 e NR-09):</p>
            {REQUISITOS_EPI.map(([k, n]) => (
              <label key={k} className="flex items-center gap-2"><input type="checkbox" name={k} defaultChecked={es.epiCompl ? es.epiCompl[k] : true} /> {n}</label>
            ))}
          </div>
        </fieldset>
        <div className="flex items-end justify-end md:col-span-3"><Botao type="submit" variante="secundario">Salvar avaliação</Botao></div>
      </form>
    </details>
  );
}

// Requisitos do EPI para o S-2240 (grupo epiCompl).
const REQUISITOS_EPI: [keyof NonNullable<RiscoEsocial['epiCompl']>, string][] = [
  ['medProtecao', 'Tentou primeiro proteção coletiva ou administrativa'],
  ['condFuncto', 'Condições de funcionamento do EPI conferidas ao longo do tempo'],
  ['usoInint', 'Uso sem interrupção ao longo do tempo'],
  ['przValid', 'CA válido na compra'],
  ['periodicTroca', 'Troca na periodicidade certa, com recibo assinado'],
  ['higienizacao', 'Higienização conforme o fabricante'],
];

// Periculosidade do GHE (NR-16): a atividade se enquadra em algum anexo?
function Periculosidade({ ghe, anexos, salvar }: { ghe: Ghe; anexos: AnexosLaudo; salvar: (dados: { anexo: string; justificativa?: string }) => void }) {
  const atual = anexos.nr16.find((a) => a.codigo === ghe.periculosidadeAnexo);
  const resumo = atual ? `perigoso · ${atual.anexo}` : ghe.periculosidadeAnexo === 'NENHUM' ? 'não perigoso' : 'falta avaliar';
  return (
    <details className="mt-3 text-sm">
      <summary className={`cursor-pointer font-semibold hover:underline ${ghe.periculosidadeAnexo ? 'text-success' : 'text-warning'}`}>
        Periculosidade (NR-16): {resumo}
      </summary>
      <form className="mt-2 grid gap-3 rounded-card border border-border bg-background p-3 md:grid-cols-3"
        onSubmit={(ev) => {
          ev.preventDefault();
          const d = new FormData(ev.currentTarget);
          salvar({ anexo: String(d.get('anexo') ?? ''), justificativa: String(d.get('justificativa') ?? '').trim() });
        }}>
        <Selecao id={`per-${ghe.id}`} name="anexo" rotulo="Enquadramento" defaultValue={ghe.periculosidadeAnexo ?? ''} required className="md:col-span-3">
          <option value="">Escolha</option>
          <option value="NENHUM">Não perigoso (não se enquadra na NR-16)</option>
          {anexos.nr16.map((a) => <option key={a.codigo} value={a.codigo}>{a.anexo} · {a.nome}</option>)}
        </Selecao>
        <Campo id={`per-just-${ghe.id}`} name="justificativa" rotulo="Fundamentação" defaultValue={ghe.periculosidadeJustificativa ?? ''} className="md:col-span-2"
          placeholder="Ex.: abastece o forno a gás e trabalha ao lado da central de GLP" />
        <div className="flex items-end justify-end"><Botao type="submit" variante="secundario">Salvar periculosidade</Botao></div>
      </form>
    </details>
  );
}

// Tabelas do eSocial, carregadas uma vez.
function useTabelas() {
  const [t, setT] = useState<TabelasEsocial | null>(null);
  useEffect(() => { buscarTabelasEsocial().then(setT).catch(() => setT(null)); }, []);
  return t;
}

function EscolhaT27({ id, className, valor, aoEscolher }: { id: string; className?: string; valor?: string | null; aoEscolher?: (c: string) => void }) {
  const t = useTabelas();
  return <EscolhaTabela id={id} name="codigoEsocial" rotulo="Procedimento no eSocial (Tabela 27)" itens={t?.t27 ?? []} valor={valor} busca="audiometria" className={className} aoEscolher={aoEscolher} />;
}

// Código da Tabela 27 de um exame já programado: mostra o código e abre a lista para trocar.
function CodigoExame({ id, valor, salvar }: { id: string; valor: string; salvar: (codigo: string) => void }) {
  return (
    <details className="inline">
      <summary className={`inline cursor-pointer text-xs font-semibold hover:underline ${valor ? 'text-success' : 'text-warning'}`}>
        {valor ? `eSocial ${valor} (trocar)` : 'falta o código do eSocial'}
      </summary>
      <div className="mt-2 max-w-xl rounded-card border border-border bg-background p-3">
        <EscolhaT27 id={`cod27-${id}`} valor={valor} aoEscolher={(c) => c && salvar(c)} />
      </div>
    </details>
  );
}

type Convite = { nome: string; link: string; whatsapp: string; emailEnviado: boolean };

// Link do convite pronto para mandar pelo WhatsApp ou copiar.
function LinkConvite({ convite, fechar }: { convite: Convite; fechar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="card-ok mt-4 space-y-3 rounded-card p-4 text-sm">
      <p className="font-semibold">Link de {convite.nome} pronto. {convite.emailEnviado ? 'Também mandamos por e-mail.' : 'Mande pelo WhatsApp ou copie e cole onde quiser.'}</p>
      <p className="break-all rounded-lg bg-white px-3 py-2 text-xs text-text/70">{convite.link}</p>
      <div className="flex flex-wrap gap-2">
        <a href={convite.whatsapp} target="_blank" rel="noreferrer" className="rounded-card bg-success px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">Mandar pelo WhatsApp</a>
        <Botao type="button" variante="secundario" onClick={async () => { try { await navigator.clipboard.writeText(convite.link); setCopiado(true); } catch { /* sem permissão */ } }}>{copiado ? 'Copiado' : 'Copiar link'}</Botao>
        <Botao type="button" variante="secundario" onClick={fechar}>Fechar</Botao>
      </div>
      <p className="text-xs text-text/60">O link vale 7 dias. Depois disso, use "Mandar link de senha" de novo.</p>
    </div>
  );
}

// Setor, funções e ambiente do GHE, com o botão para editar.
function ResumoGhe({ ghe, cargos, salvar, excluir }: { ghe: Ghe; cargos: string[]; salvar: (dados: DadosGhe) => Promise<boolean>; excluir: () => void }) {
  const [editando, setEditando] = useState(false);
  const funcoes = ghe.funcoes ?? [];
  const amb = ghe.ambiente ?? {};
  const temAmbiente = Object.values(amb).some((v) => v === true || (typeof v === 'string' && v.trim()));
  if (editando) {
    return (
      <div className="mt-3 rounded-card border border-border bg-background/60 p-4">
        <FormGhe chave={ghe.id} cargos={cargos} textoBotao="Salvar GHE" cancelar={() => setEditando(false)}
          inicial={{ setor: ghe.setor ?? '', nome: ghe.nome, funcoes, ambiente: amb, descricao: ghe.descricao ?? undefined }}
          salvar={async (dados) => { const ok = await salvar(dados); if (ok) setEditando(false); return ok; }} />
      </div>
    );
  }
  return (
    <div className="mt-2 space-y-1 text-sm">
      {!ghe.setor || !funcoes.length ? (
        <p className="text-warning">Complete o setor e as funções deste GHE. O PGR e o eSocial pedem isso.</p>
      ) : (
        <p><strong>Setor:</strong> {ghe.setor} · <strong>Funções:</strong> {funcoes.map((f) => f.nome).join(', ')}</p>
      )}
      {!temAmbiente && <p className="text-warning">Falta descrever o ambiente deste setor (edificação, piso, iluminação, ventilação, máquinas).</p>}
      <div className="flex flex-wrap gap-4">
        <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setEditando(true)}>Editar setor, funções e ambiente</button>
        <button type="button" className="text-danger hover:underline" onClick={excluir}>Excluir GHE</button>
      </div>
    </div>
  );
}

// Todas as funções da empresa num lugar só: em que GHE cada uma está e quantas pessoas têm essa função.
function FuncoesDaEmpresa({ ghes, colaboradores }: { ghes: Ghe[]; colaboradores: Colaborador[] }) {
  const chave = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  const ativos = colaboradores.filter((c) => !c.dataDesligamento);
  const linhas = ghes.flatMap((g) => (g.funcoes ?? []).map((f) => ({ funcao: f.nome, cbo: f.cbo, ghe: g.nome, pessoas: ativos.filter((c) => chave(c.cargo) === chave(f.nome)).length })));
  const conhecidas = new Set(linhas.map((l) => chave(l.funcao)));
  const soltas = [...new Set(ativos.map((c) => c.cargo).filter((c) => c && !conhecidas.has(chave(c))))].sort();
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap gap-6">
        <p><span className="text-2xl font-bold text-primary">{ghes.length}</span> <span className="text-sm text-text/60">GHEs</span></p>
        <p><span className="text-2xl font-bold text-primary">{linhas.length}</span> <span className="text-sm text-text/60">Funções</span></p>
      </div>
      {(linhas.length > 0 || soltas.length > 0) && (
        <details className="rounded-card border border-border p-4">
          <summary className="cursor-pointer font-semibold text-primary">Funções da empresa</summary>
          {linhas.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-text/60"><th className="py-1 pr-3">Função</th><th className="py-1 pr-3">CBO</th><th className="py-1 pr-3">GHE</th><th className="py-1">Pessoas</th></tr></thead>
                <tbody>{linhas.map((l, i) => <tr key={i} className="border-t border-border"><td className="py-1 pr-3">{l.funcao}</td><td className="py-1 pr-3">{l.cbo || '—'}</td><td className="py-1 pr-3">{l.ghe}</td><td className="py-1">{l.pessoas}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          {soltas.length > 0 && (
            <p className="mt-3 text-sm text-warning">Funções de colaboradores que ainda não estão em nenhum GHE: {soltas.join(', ')}. Inclua cada uma no GHE certo.</p>
          )}
        </details>
      )}
    </div>
  );
}
