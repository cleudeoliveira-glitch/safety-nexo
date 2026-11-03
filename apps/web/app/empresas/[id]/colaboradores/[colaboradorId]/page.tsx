'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import { buscarColaborador, ColaboradorDetalhe, gerarAso, gerarFichaEpi, gerarOs, gerarPpp, registrarAso, registrarEpi, salvarArquivo } from '@/lib/api';

const TIPOS_ASO = [
  ['ADMISSIONAL', 'Admissional'],
  ['PERIODICO', 'Periódico'],
  ['RETORNO_TRABALHO', 'Retorno ao trabalho'],
  ['MUDANCA_RISCO', 'Mudança de risco'],
  ['DEMISSIONAL', 'Demissional'],
] as const;

const MOTIVOS_EPI = [
  ['ENTREGA_INICIAL', 'Entrega inicial'],
  ['DESGASTE', 'Troca por desgaste'],
  ['PERDA', 'Perda'],
  ['DANO', 'Dano'],
] as const;

const nomeDe = (lista: readonly (readonly [string, string])[], valor: string) => lista.find(([v]) => v === valor)?.[1] ?? valor;
const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
// Data local (não UTC): à noite o UTC já está no dia seguinte.
const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function ColaboradorPage({ params }: { params: { id: string; colaboradorId: string } }) {
  const { id: empresaId, colaboradorId } = params;
  const [colaborador, setColaborador] = useState<ColaboradorDetalhe | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setColaborador(await buscarColaborador(empresaId, colaboradorId));
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }, [empresaId, colaboradorId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

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

  async function baixar(gerar: () => Promise<Blob>, nome: string) {
    try {
      salvarArquivo(await gerar(), nome);
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }

  if (!colaborador) {
    return <main className="p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando colaborador…'}</main>;
  }

  const texto = (dados: FormData, campo: string) => String(dados.get(campo) ?? '').trim();
  const examesPrevistos = colaborador.ghe?.exames.map((e) => e.nome) ?? [];

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <div>
        <Link href={`/empresas/${empresaId}`} className="text-sm text-primary">← Voltar à empresa</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-semibold text-primary">{colaborador.nome}</h1>
          <div className="flex flex-wrap gap-2">
            <Botao variante="secundario" onClick={() => baixar(() => gerarOs(empresaId, colaboradorId), `Ordem-de-servico-${colaborador.nome}.pdf`)}>Ordem de serviço</Botao>
            <Botao variante="secundario" onClick={() => baixar(() => gerarPpp(empresaId, colaboradorId), `PPP-${colaborador.nome}.pdf`)}>Baixar PPP</Botao>
            <Link href={`/empresas/${empresaId}/prontuario?colaborador=${colaboradorId}`} className="rounded-card border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">Prontuário de saúde</Link>
          </div>
        </div>
        <p className="text-text/60">
          {colaborador.cargo} · {colaborador.ghe?.nome ?? 'Sem GHE'}
          {colaborador.cpf ? ` · CPF ${colaborador.cpf}` : ''}
        </p>
      </div>

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      {!colaborador.ghe && (
        <Aviso tipo="info">
          Este colaborador ainda não tem GHE. O ASO sai sem riscos e sem exames: vincule um GHE no cadastro da empresa antes de emitir.
        </Aviso>
      )}

      <Cartao titulo="Atestado de Saúde Ocupacional (ASO)">
        <p className="mb-4 text-sm text-text/60">
          Os riscos e exames vêm do GHE do colaborador
          {examesPrevistos.length > 0 ? ` (${examesPrevistos.join(', ')})` : ''}. A data do próximo exame é calculada sozinha.
        </p>
        <form
          className="grid gap-4 md:grid-cols-3"
          onSubmit={enviar(
            (d) =>
              registrarAso(empresaId, colaboradorId, {
                tipo: texto(d, 'tipo'),
                dataExame: texto(d, 'dataExame'),
                resultado: texto(d, 'resultado'),
                medicoExaminadorNome: texto(d, 'medicoNome'),
                medicoExaminadorCrm: texto(d, 'medicoCrm'),
              }),
            'ASO registrado. Clique em "Baixar ASO" para gerar o PDF.',
          )}
        >
          <Selecao id="aso-tipo" name="tipo" rotulo="Tipo de exame" required
            ajuda={{ oQueE: 'O momento do exame: ao contratar, de tempos em tempos, ao voltar de afastamento, ao mudar de risco ou ao desligar.', baseLegal: 'NR-07, item 7.5.6' }}>
            {TIPOS_ASO.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </Selecao>
          <Campo id="aso-data" name="dataExame" type="date" rotulo="Data do exame" required defaultValue={hoje()} />
          <Selecao id="aso-resultado" name="resultado" rotulo="Resultado" required>
            <option value="APTO">Apto</option>
            <option value="INAPTO">Inapto</option>
          </Selecao>
          <Campo id="aso-medico" name="medicoNome" rotulo="Médico examinador" required placeholder="Ex.: Dr. João Souza"
            className="md:col-span-2" ajuda={{ oQueE: 'Médico que fez o exame. Pode ser diferente do responsável pelo PCMSO.' }} />
          <Campo id="aso-crm" name="medicoCrm" rotulo="CRM" required placeholder="Ex.: 123456-SP" />
          <div className="flex justify-end md:col-span-3"><Botao type="submit">Registrar ASO</Botao></div>
        </form>

        {colaborador.asos.length > 0 && (
          <ul className="mt-5 divide-y divide-border text-sm">
            {colaborador.asos.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>
                  <strong>{nomeDe(TIPOS_ASO, a.tipo)}</strong> · {data(a.dataExame)} ·{' '}
                  <span className={a.resultado === 'APTO' ? 'text-success' : 'text-danger'}>{a.resultado === 'APTO' ? 'Apto' : 'Inapto'}</span>
                  {a.proximoExame && <span className="text-text/60"> · próximo em {data(a.proximoExame)}</span>}
                </span>
                <Botao variante="secundario" onClick={() => baixar(() => gerarAso(empresaId, colaboradorId, a.id), `ASO-${colaborador.nome}-${a.dataExame.slice(0, 10)}.pdf`)}>
                  Baixar ASO
                </Botao>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <Cartao
        titulo="Ficha de EPI"
        acao={
          colaborador.entregasEpi.length > 0 && (
            <Botao onClick={() => baixar(() => gerarFichaEpi(empresaId, colaboradorId), `Ficha-EPI-${colaborador.nome}.pdf`)}>Baixar ficha de EPI</Botao>
          )
        }
      >
        <form
          className="grid gap-4 md:grid-cols-3"
          onSubmit={enviar(
            (d) =>
              registrarEpi(empresaId, colaboradorId, {
                epi: texto(d, 'epi'),
                ca: texto(d, 'ca'),
                ...(texto(d, 'validadeCa') ? { validadeCa: texto(d, 'validadeCa') } : {}),
                quantidade: Number(texto(d, 'quantidade') || 1),
                motivo: texto(d, 'motivo'),
                dataEntrega: texto(d, 'dataEntrega'),
              }),
            'Entrega de EPI registrada.',
          )}
        >
          <Campo id="epi-nome" name="epi" rotulo="EPI" required placeholder="Ex.: Luva térmica" />
          <Campo id="epi-ca" name="ca" rotulo="Número do CA" required placeholder="Ex.: 12345"
            ajuda={{ oQueE: 'Certificado de Aprovação: número que prova que o EPI foi aprovado pelo Ministério do Trabalho.', ondeAcho: 'Gravado no próprio EPI ou na embalagem.', baseLegal: 'NR-06' }} />
          <Campo id="epi-validade" name="validadeCa" type="date" rotulo="Validade do CA"
            ajuda={{ oQueE: 'Até quando o CA vale. Com o CA vencido, o EPI não deve ser entregue.', ondeAcho: 'Na consulta de CA do Ministério do Trabalho.' }} />
          <Campo id="epi-qtd" name="quantidade" type="number" min={1} rotulo="Quantidade" required defaultValue={1} />
          <Selecao id="epi-motivo" name="motivo" rotulo="Motivo" required>
            {MOTIVOS_EPI.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </Selecao>
          <Campo id="epi-data" name="dataEntrega" type="date" rotulo="Data da entrega" required defaultValue={hoje()} />
          <div className="flex justify-end md:col-span-3"><Botao type="submit">Registrar entrega</Botao></div>
        </form>

        {colaborador.entregasEpi.length > 0 && (
          <ul className="mt-5 divide-y divide-border text-sm">
            {colaborador.entregasEpi.map((e) => {
              const vencido = e.validadeCa !== null && new Date(e.validadeCa) < new Date();
              return (
                <li key={e.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                  <span>
                    <strong>{e.epi}</strong> · CA {e.ca} · {e.quantidade} un. · {nomeDe(MOTIVOS_EPI, e.motivo)}
                  </span>
                  <span className={vencido ? 'text-danger' : 'text-text/60'}>
                    {data(e.dataEntrega)}
                    {e.validadeCa && ` · CA ${vencido ? 'vencido em' : 'válido até'} ${data(e.validadeCa)}`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>
    </main>
  );
}
