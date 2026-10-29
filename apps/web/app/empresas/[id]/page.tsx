'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import {
  atualizarEmpresa,
  buscarEmpresa,
  Colaborador,
  criarColaborador,
  criarExame,
  criarGhe,
  criarRisco,
  definirMedico,
  Empresa,
  enviarLogoEmpresa,
  gerarDocumento,
  Ghe,
  listarColaboradores,
  listarGhes,
  salvarArquivo,
} from '@/lib/api';

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
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const [e, g, c] = await Promise.all([buscarEmpresa(empresaId), listarGhes(empresaId), listarColaboradores(empresaId)]);
      setEmpresa(e);
      setGhes(g);
      setColaboradores(c);
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }, [empresaId]);

  useEffect(() => {
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

  async function baixar(tipo: 'pgr' | 'pcmso') {
    try {
      const pdf = await gerarDocumento(empresaId, tipo);
      salvarArquivo(pdf, `${tipo.toUpperCase()}-${empresa?.razaoSocial ?? 'empresa'}.pdf`);
      setAviso({ tipo: 'ok', texto: `${tipo.toUpperCase()} gerado.` });
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
        <Link href="/" className="text-sm text-primary">← Voltar ao painel</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">{empresa.razaoSocial}</h1>
        <p className="text-text/60">CNPJ {empresa.cnpj}</p>
      </div>

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <Cartao titulo="1. Dados da empresa">
        <form
          className="grid gap-4 md:grid-cols-3"
          onSubmit={enviar(async (d) => {
            await atualizarEmpresa(empresaId, {
              cnae: texto(d, 'cnae') || undefined,
              grauRisco: texto(d, 'grauRisco') ? Number(texto(d, 'grauRisco')) : undefined,
              numFuncionarios: Number(texto(d, 'numFuncionarios') || 0),
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
          <div className="flex items-end justify-end"><Botao type="submit">Salvar dados</Botao></div>
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
                    <li key={r.id}>{r.agente} · {r.fonteGeradora} · severidade {r.severidade.toLowerCase()}</li>
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

              <h4 className="mt-5 text-sm font-semibold">Exames do PCMSO</h4>
              {ghe.exames.length === 0 ? (
                <p className="text-sm text-warning">Nenhum exame programado.</p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm">
                  {ghe.exames.map((e) => (
                    <li key={e.id}>
                      {e.nome} · {MOMENTOS.filter(([campo]) => e[campo]).map(([, nome]) => nome.toLowerCase()).join(', ')}
                      {e.periodicidadeMeses ? ` · a cada ${e.periodicidadeMeses} meses` : ''}
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

      <Cartao titulo="3. Colaboradores">
        <form
          className="grid gap-4 md:grid-cols-5"
          onSubmit={enviar(
            (d) =>
              criarColaborador(empresaId, {
                nome: texto(d, 'nome'),
                cpf: texto(d, 'cpf') || null,
                cargo: texto(d, 'cargo'),
                cbo: texto(d, 'cbo') || null,
                gheId: texto(d, 'gheId') || null,
              }),
            'Colaborador cadastrado.',
          )}
        >
          <Campo id="colab-nome" name="nome" rotulo="Nome" required placeholder="Ex.: Maria Silva" />
          <Campo id="colab-cpf" name="cpf" rotulo="CPF" placeholder="Ex.: 123.456.789-00"
            ajuda={{ oQueE: 'CPF do trabalhador. Sai no ASO e na ficha de EPI.', ondeAcho: 'No documento do trabalhador ou com o RH.' }} />
          <Campo id="colab-cargo" name="cargo" rotulo="Cargo" required placeholder="Ex.: Padeira" />
          <Campo id="colab-cbo" name="cbo" rotulo="CBO" placeholder="Ex.: 8483-05"
            ajuda={{ oQueE: 'Código Brasileiro de Ocupações do cargo.', ondeAcho: 'Na carteira de trabalho ou com o RH.' }} />
          <Selecao id="colab-ghe" name="gheId" rotulo="GHE">
            <option value="">Sem GHE</option>
            {ghes.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </Selecao>
          <div className="flex justify-end md:col-span-5"><Botao type="submit">Adicionar colaborador</Botao></div>
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

      <Cartao titulo="5. Documentos" id="documentos">
        <p className="mb-4 text-sm text-text/60">Cada documento sai em PDF com a logo da empresa no cabeçalho e a da sua consultoria no rodapé.</p>
        <div className="flex flex-wrap gap-3">
          <Botao onClick={() => baixar('pgr')}>Gerar PGR</Botao>
          <Botao onClick={() => baixar('pcmso')}>Gerar PCMSO</Botao>
        </div>
      </Cartao>
    </main>
  );
}
