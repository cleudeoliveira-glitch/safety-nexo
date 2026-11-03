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
  buscarEmpresa,
  Cipa,
  Colaborador,
  criarColaborador,
  criarExame,
  criarGhe,
  criarRisco,
  avaliarRisco,
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
  const [anexos, setAnexos] = useState<AnexosLaudo | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

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
      <Cartao titulo="1. Dados da empresa">
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
            });
            const logo = d.get('logo');
            if (logo instanceof File && logo.size > 0) await enviarLogoEmpresa(empresaId, logo);
          }, 'Dados da empresa salvos.')}
        >
          <Campo id="cnae" name="cnae" rotulo="CNAE" defaultValue={empresa.cnae ?? ''} placeholder="Ex.: 10.91-1-01"
            ajuda={{ oQueE: 'Código da atividade principal.', ondeAcho: 'No cartão do CNPJ.', baseLegal: 'NR-04, Anexo I' }} />
          <Selecao id="grauRisco" name="grauRisco" rotulo="Grau de risco" defaultValue={empresa.grauRisco ?? ''}
            ajuda={{ oQueE: 'Deixe em branco para o sistema preencher pelo CNAE.', baseLegal: 'NR-04, Anexo I' }}>
            <option value="">Pelo CNAE</option>
            {[1, 2, 3, 4].map((g) => <option key={g} value={g}>{g}</option>)}
          </Selecao>
          <Campo id="numFuncionarios" name="numFuncionarios" type="number" min={0} rotulo="Funcionários" defaultValue={empresa.numFuncionarios} />
          <Campo id="logo" name="logo" type="file" accept="image/png,image/jpeg" rotulo="Logo da empresa" className="md:col-span-2"
            dica={empresa.logoPath ? 'Logo já enviada. Envie outra para trocar.' : 'PNG ou JPG, até 2 MB. Sai no cabeçalho dos documentos.'} />
          <Campo id="rtNome" name="rtNome" rotulo="Responsável técnico" defaultValue={empresa.responsavelTecnicoNome ?? ''} placeholder="Ex.: Cleude Oliveira"
            ajuda={{ oQueE: 'Engenheiro(a) de segurança ou médico(a) do trabalho que assina o LTCAT e os registros ambientais do PPP.', baseLegal: 'Lei 8.213/91, art. 58' }} />
          <Campo id="rtRegistro" name="rtRegistro" rotulo="Registro profissional" defaultValue={empresa.responsavelTecnicoRegistro ?? ''} placeholder="Ex.: CREA-SP 123456" />
          <Campo id="representante" name="representante" rotulo="Representante legal" defaultValue={empresa.representanteLegalNome ?? ''} placeholder="Quem assina o PPP pela empresa"
            ajuda={{ oQueE: 'Sócio, diretor ou procurador que assina o PPP em nome da empresa.' }} />
          <div className="flex items-end justify-end md:col-span-3"><Botao type="submit">Salvar dados</Botao></div>
        </form>
      </Cartao>

      <Cartao titulo="2. GHEs, riscos e exames">
        <form
          className="grid gap-4 md:grid-cols-3"
          onSubmit={enviar((d) => criarGhe(empresaId, { nome: texto(d, 'nome'), descricao: texto(d, 'descricao') || undefined }), 'GHE cadastrado.')}
        >
          <Campo id="ghe-nome" name="nome" rotulo="Nome do GHE" required placeholder="Ex.: Produção"
            ajuda={{ oQueE: 'Grupo de trabalhadores expostos aos mesmos riscos, do mesmo jeito.', exemplo: 'Produção, Escritório, Manutenção' }} />
          <Campo id="ghe-descricao" name="descricao" rotulo="Descrição" placeholder="Ex.: Operadores de forno e masseiros" />
          <div className="flex items-end justify-end"><Botao type="submit">Adicionar GHE</Botao></div>
        </form>

        <div className="mt-6 space-y-6">
          {ghes.length === 0 && <p className="text-sm text-text/60">Nenhum GHE ainda. Comece pelo primeiro acima.</p>}
          {ghes.map((ghe) => (
            <article key={ghe.id} className="rounded-card border border-border p-4">
              <h3 className="font-semibold text-primary">
                {ghe.nome} <span className="text-sm font-normal text-text/60">· {ghe._count.colaboradores} colaborador(es)</span>
              </h3>

              <h4 className="mt-3 text-sm font-semibold">Riscos</h4>
              {ghe.riscos.length === 0 ? (
                <p className="text-sm text-warning">Nenhum risco. O PGR precisa de pelo menos um.</p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm">
                  {ghe.riscos.map((r) => (
                    <li key={r.id}>
                      {r.agente} · {r.fonteGeradora} · severidade {r.severidade.toLowerCase()}
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

      <Cartao titulo="3. Colaboradores">
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
          <Campo id="colab-cpf" name="cpf" rotulo="CPF" placeholder="Ex.: 123.456.789-00"
            ajuda={{ oQueE: 'CPF do trabalhador. Sai no ASO e na ficha de EPI.', ondeAcho: 'No documento do trabalhador ou com o RH.' }} />
          <Campo id="colab-cargo" name="cargo" rotulo="Cargo" required placeholder="Ex.: Padeira" />
          <Campo id="colab-admissao" name="dataAdmissao" type="date" rotulo="Admissão"
            ajuda={{ oQueE: 'Data em que o colaborador foi contratado. Desempata a eleição da CIPA (tempo de casa).', ondeAcho: 'Na carteira de trabalho ou com o RH.' }} />
          <Campo id="colab-cbo" name="cbo" rotulo="CBO" placeholder="Ex.: 8483-05"
            ajuda={{ oQueE: 'Código Brasileiro de Ocupações do cargo.', ondeAcho: 'Na carteira de trabalho ou com o RH.' }} />
          <Campo id="colab-matricula" name="matricula" rotulo="Matrícula no eSocial" placeholder="Ex.: 000123"
            ajuda={{ oQueE: 'A matrícula que o RH usou no evento de admissão do eSocial. É obrigatória para enviar ASO, riscos e CAT.', ondeAcho: 'Com o RH ou a contabilidade.' }} />
          <Selecao id="colab-ghe" name="gheId" rotulo="GHE">
            <option value="">Sem GHE</option>
            {ghes.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </Selecao>
          <div className="flex justify-end md:col-span-3"><Botao type="submit">Adicionar colaborador</Botao></div>
        </form>
        <ul className="mt-4 divide-y divide-border text-sm">
          {colaboradores.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>{c.nome} · {c.cargo}</span>
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
      <Cartao titulo="4. Médico responsável pelo PCMSO">
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
                defaultValue={cipa.calendario?.inicioMandato.slice(0, 10) ?? ''}
                ajuda={{
                  oQueE: 'Data da posse da gestão atual. Com ela o sistema calcula o fim do mandato e os prazos da próxima eleição.',
                  ondeAcho: 'Na ata de posse da CIPA.',
                  baseLegal: 'NR-05, itens 5.4.6, 5.5.1 e 5.5.3',
                }} />
              {cipa.dimensionamento.situacao === 'REPRESENTANTE' && (
                <Campo id="cipa-representante" name="representante" rotulo="Representante nomeado" placeholder="Ex.: João Lima"
                  defaultValue={cipa.representante ?? ''}
                  ajuda={{ oQueE: 'Empregado nomeado para ajudar nas ações de prevenção quando a empresa não precisa de CIPA.', baseLegal: 'NR-05, item 5.4.13' }} />
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
        <div className="flex flex-wrap gap-3">
          <Botao onClick={() => baixar('pgr')}>Gerar PGR</Botao>
          <Botao onClick={() => baixar('pcmso')}>Gerar PCMSO</Botao>
          <Botao onClick={() => baixar('ltcat')}>Gerar LTCAT</Botao>
          <Botao onClick={() => baixar('lip')}>Gerar LIP</Botao>
          <Botao onClick={() => baixar('lpp')}>Gerar LPP</Botao>
          <Botao onClick={() => baixar('pgrtr')} title="Para empresas com atividade rural (NR-31)">Gerar PGRTR</Botao>
          <Botao variante="secundario" onClick={() => baixar('os')}>Ordens de serviço (todos)</Botao>
          <Link href={`/empresas/${empresaId}/saude`} className="rounded-card border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">AET e CAT →</Link>
          <Link href={`/empresas/${empresaId}/esocial`} className="rounded-card border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">eSocial →</Link>
          <Link href={`/empresas/${empresaId}/historico`} className="rounded-card border border-border px-4 py-2 text-sm font-semibold text-text/70 hover:bg-primary/5">Histórico →</Link>
          <Link href={`/empresas/${empresaId}/cultura`} className="rounded-card border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">SIPAT e 5S →</Link>
          <Link href={`/empresas/${empresaId}/psicossocial`} className="rounded-card border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">Psicossocial →</Link>
          <Link href={`/empresas/${empresaId}/arquivo`} className="rounded-card border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">Arquivo de documentos →</Link>
          <Link href={`/empresas/${empresaId}/conectores`} className="rounded-card border border-border px-4 py-2 text-sm font-semibold text-text/70 hover:bg-primary/5">Importar do RH, terceiros e faltas →</Link>
        </div>
      </Cartao>

      <Cartao titulo="7. Acesso da empresa ao sistema" id="acessos">
        <p className="mb-4 text-sm text-text/60">
          Crie um login para a empresa cliente. Ela entra no Safety Nexo e vê só os dados dela: colaboradores, EPI, DDS, permissões de trabalho,
          treinamentos e vencimentos. Programas e documentos continuam com você.
        </p>
        <form
          className="grid gap-4 md:grid-cols-3"
          onSubmit={enviar(
            (d) => criarAcesso(empresaId, { nome: texto(d, 'nome'), email: texto(d, 'email'), senha: texto(d, 'senha') }),
            'Login criado. Envie o e-mail e a senha para a empresa.',
          )}
        >
          <Campo id="acesso-nome" name="nome" rotulo="Nome de quem vai usar" required placeholder="Ex.: RH da Padaria" />
          <Campo id="acesso-email" name="email" type="email" rotulo="E-mail" required placeholder="rh@empresa.com.br" />
          <Campo id="acesso-senha" name="senha" type="text" rotulo="Senha inicial" required minLength={8} placeholder="Mínimo 8 caracteres"
            ajuda={{ oQueE: 'Senha que você envia para a empresa. Use pelo menos 8 caracteres.' }} />
          <div className="flex justify-end md:col-span-3"><Botao type="submit">Criar login</Botao></div>
        </form>
        {acessos.length > 0 && (
          <ul className="mt-4 divide-y divide-border text-sm">
            {acessos.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{a.nome} · <span className="text-text/60">{a.email}</span></span>
                <button className="text-xs text-danger hover:underline" onClick={async () => {
                  try { await removerAcesso(empresaId, a.id); setAviso({ tipo: 'ok', texto: 'Acesso removido. Esse login para de funcionar na hora.' }); await recarregar(); }
                  catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
                }}>Remover acesso</button>
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
        <Selecao id={`av-tipo-${risco.id}`} rotulo="Avaliação" value={tipo} onChange={(e) => setTipo(e.target.value as AvaliacaoRisco['tipoAvaliacao'])}
          ajuda={{ oQueE: 'Quantitativa quando o agente foi medido com equipamento. Qualitativa quando a exposição foi caracterizada só por inspeção.', baseLegal: 'NR-09 e NR-15' }}>
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
        <Selecao id={`av-epi-${risco.id}`} name="epi" rotulo="EPI eficaz?" defaultValue={valor(risco.epiEficaz)}
          ajuda={{ oQueE: 'Se o EPI neutraliza a exposição. Vai para o PPP e pesa na aposentadoria especial.' }}>
          <option value="">Não se aplica</option><option value="S">Sim</option><option value="N">Não</option>
        </Selecao>
        <Campo id={`av-ca-${risco.id}`} name="ca" rotulo="CA do EPI" defaultValue={risco.epiCa ?? ''} placeholder="Ex.: 12345" />
        <Campo id={`av-anexo-${risco.id}`} name="anexo" rotulo="Código do Anexo IV" defaultValue={risco.codigoAnexoIv ?? ''} placeholder="Ex.: 2.0.1"
          ajuda={{ oQueE: 'Código do agente na lista de agentes nocivos da Previdência.', baseLegal: 'Decreto 3.048/99, Anexo IV' }} />
        <Selecao id={`av-esp-${risco.id}`} name="especial" rotulo="Enseja aposentadoria especial?" defaultValue={risco.aposentadoriaEspecial ? 'S' : 'N'}
          ajuda={{ oQueE: 'Sua conclusão técnica: a exposição dá direito à aposentadoria especial? Sai na conclusão do LTCAT.' }}>
          <option value="N">Não</option><option value="S">Sim</option>
        </Selecao>
        <Selecao id={`av-anexo15-${risco.id}`} rotulo="Anexo da NR-15" value={anexo} onChange={(e) => escolherAnexo(e.target.value)} className="md:col-span-2"
          ajuda={{ oQueE: 'O anexo da NR-15 que trata deste agente. Usado no laudo de insalubridade (LIP).', baseLegal: 'NR-15' }}>
          <option value="">Não se enquadra / não avaliado</option>
          {anexos?.nr15.map((a) => <option key={a.anexo} value={a.anexo}>Anexo {a.anexo} · {a.nome}</option>)}
        </Selecao>
        <Selecao id={`av-grau-${risco.id}`} rotulo="Insalubridade" value={grau} onChange={(e) => setGrau(e.target.value)}
          ajuda={{ oQueE: 'Sua conclusão para este agente, já considerando EPC e EPI. Quando o EPI neutraliza a exposição, marque "Não insalubre".', baseLegal: 'NR-15, itens 15.2 e 15.4' }}>
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
        <Selecao id={`per-${ghe.id}`} name="anexo" rotulo="Enquadramento" defaultValue={ghe.periculosidadeAnexo ?? ''} required className="md:col-span-3"
          ajuda={{ oQueE: 'Se as atividades deste grupo se enquadram em algum anexo da NR-16. Quando sim, o adicional é de 30% sobre o salário.', baseLegal: 'CLT, art. 193, e NR-16' }}>
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
