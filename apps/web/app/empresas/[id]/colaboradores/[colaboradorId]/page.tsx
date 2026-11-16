'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraRosto } from '@/components/CameraRosto';
import { conferirNoAparelho, guardarCaptura } from '@/lib/rosto-offline';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import { abrirAsoClinica, anexarAsoClinica, buscarColaborador, CATEGORIAS_CNH, ColaboradorDetalhe, devolverEpi, editarColaborador, Ghe, listarGhes, MOTIVOS_DEVOLUCAO, gerarAso, gerarFichaEpi, gerarOs, gerarPpp, registrarAso, registrarDesligamento, type SituacaoDemissional, registrarEpi, rosto, estoque, fotoColaborador, salvarArquivo, type ConfigRosto, type ItemEstoque, type StatusRosto } from '@/lib/api';

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

// Reduz a foto para 240 px (fica leve na lista).
async function reduzirFoto(arq: File): Promise<string> {
  const img = await createImageBitmap(arq);
  const lado = Math.min(img.width, img.height);
  const c = document.createElement('canvas'); c.width = 240; c.height = 240;
  c.getContext('2d')!.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 240, 240);
  return c.toDataURL('image/jpeg', 0.82);
}

export default function ColaboradorPage({ params }: { params: { id: string; colaboradorId: string } }) {
  const { id: empresaId, colaboradorId } = params;
  const [colaborador, setColaborador] = useState<ColaboradorDetalhe | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  const [cfgRosto, setCfgRosto] = useState<ConfigRosto | null>(null);
  const [stRosto, setStRosto] = useState<StatusRosto | null>(null);
  const [consente, setConsente] = useState(false);
  const [camera, setCamera] = useState<null | 'cadastro' | 'epi'>(null);
  const [comprovante, setComprovante] = useState<string | null>(null);
  const formEpi = useRef<HTMLFormElement>(null);
  const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);
  const [itemId, setItemId] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [ghes, setGhes] = useState<Ghe[]>([]);
  const [editando, setEditando] = useState(false);
  const [devolvendo, setDevolvendo] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setColaborador(await buscarColaborador(empresaId, colaboradorId));
      rosto.config().then(setCfgRosto).catch(() => setCfgRosto(null));
      rosto.status(empresaId, colaboradorId).then(setStRosto).catch(() => setStRosto(null));
      fotoColaborador.ver(empresaId, colaboradorId).then((f) => setFoto(f.foto)).catch(() => setFoto(null));
      estoque.listar(empresaId).then((l) => setItensEstoque(l.filter((i) => i.ativo))).catch(() => setItensEstoque([]));
      listarGhes(empresaId).then(setGhes).catch(() => setGhes([]));
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
  const confirmadas = new Map((colaborador.presencasFaciais ?? []).map((p) => [p.refId, p.codigo]));
  const dadosEpi = () => {
    const d = new FormData(formEpi.current!);
    const base = { quantidade: Number(texto(d, 'quantidade') || 1), motivo: texto(d, 'motivo') };
    if (itemId) return { ...base, estoqueId: itemId };
    return { ...base, epi: texto(d, 'epi'), ca: texto(d, 'ca'), ...(texto(d, 'validadeCa') ? { validadeCa: texto(d, 'validadeCa') } : {}), ...(texto(d, 'fabricante') ? { fabricante: texto(d, 'fabricante') } : {}) };
  };
  const examesPrevistos = colaborador.ghe?.exames.map((e) => e.nome) ?? [];

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <div>
        <Link href={`/empresas/${empresaId}/colaboradores`} className="text-sm text-primary">← Voltar aos colaboradores</Link>
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
          {colaborador.cnhCategoria ? ` · CNH ${colaborador.cnhCategoria}` : ''}
        </p>
      </div>

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      {!colaborador.ghe && (
        <Aviso tipo="info">
          Este colaborador ainda não tem GHE. O ASO sai sem riscos e sem exames: escolha o GHE em &quot;Dados do colaborador&quot; antes de emitir.
        </Aviso>
      )}

      <Cartao titulo="Dados do colaborador" acao={!editando && <Botao variante="secundario" onClick={() => setEditando(true)}>Editar dados</Botao>}>
        {editando ? (
          <form
            className="grid gap-4 md:grid-cols-3"
            onSubmit={async (ev) => {
              ev.preventDefault();
              const d = new FormData(ev.currentTarget);
              const campos = ['nome', 'cargo', 'cpf', 'cbo', 'matricula', 'dataAdmissao', 'gheId', 'cnhCategoria', 'cnhValidade'];
              try {
                await editarColaborador(empresaId, colaboradorId, Object.fromEntries(campos.map((c) => [c, texto(d, c)])));
                setEditando(false);
                setAviso({ tipo: 'ok', texto: 'Dados salvos.' });
                await recarregar();
              } catch (e) {
                setAviso({ tipo: 'erro', texto: (e as Error).message });
              }
            }}
          >
            <Campo id="ed-nome" name="nome" rotulo="Nome" required defaultValue={colaborador.nome} />
            <Campo id="ed-cargo" name="cargo" rotulo="Cargo" required defaultValue={colaborador.cargo} />
            <Campo id="ed-cpf" name="cpf" rotulo="CPF" defaultValue={colaborador.cpf ?? ''} placeholder="Ex.: 123.456.789-00" />
            <Campo id="ed-admissao" name="dataAdmissao" type="date" rotulo="Admissão" defaultValue={colaborador.dataAdmissao?.slice(0, 10) ?? ''} />
            <Campo id="ed-cbo" name="cbo" rotulo="CBO" defaultValue={colaborador.cbo ?? ''} placeholder="Ex.: 8483-05" />
            <Campo id="ed-matricula" name="matricula" rotulo="Matrícula no eSocial" defaultValue={colaborador.matricula ?? ''} />
            <Selecao id="ed-ghe" name="gheId" rotulo="GHE" defaultValue={colaborador.gheId ?? ''}>
              <option value="">Sem GHE</option>
              {ghes.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </Selecao>
            <Selecao id="ed-cnh" name="cnhCategoria" rotulo="CNH (se dirige pela empresa)" defaultValue={colaborador.cnhCategoria ?? ''}
              ajuda={{ oQueE: 'Motorista com CNH C, D ou E precisa do exame toxicológico, que vai para o eSocial (S-2221).', baseLegal: 'CLT, art. 168, §6º' }}>
              <option value="">Não dirige</option>
              {CATEGORIAS_CNH.map((c) => <option key={c} value={c}>Categoria {c}</option>)}
            </Selecao>
            <Campo id="ed-cnh-validade" name="cnhValidade" type="date" rotulo="Validade da CNH" defaultValue={colaborador.cnhValidade?.slice(0, 10) ?? ''} />
            <div className="flex justify-end gap-2 md:col-span-3">
              <Botao type="button" variante="secundario" onClick={() => setEditando(false)}>Cancelar</Botao>
              <Botao type="submit">Salvar dados</Botao>
            </div>
          </form>
        ) : (
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 md:grid-cols-3">
            {([
              ['Cargo', colaborador.cargo],
              ['CPF', colaborador.cpf],
              ['Admissão', colaborador.dataAdmissao ? data(colaborador.dataAdmissao) : null],
              ['CBO', colaborador.cbo],
              ['Matrícula no eSocial', colaborador.matricula],
              ['GHE', colaborador.ghe?.nome],
              ['CNH', colaborador.cnhCategoria ? `Categoria ${colaborador.cnhCategoria}${colaborador.cnhValidade ? `, vale até ${data(colaborador.cnhValidade)}` : ''}` : 'Não dirige pela empresa'],
            ] as [string, string | null | undefined][]).map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt className="text-xs text-text/60">{rotulo}</dt>
                <dd className={valor ? '' : 'text-warning'}>{valor || 'Não preenchido'}</dd>
              </div>
            ))}
          </dl>
        )}
        {colaborador.cnhCategoria && ['C', 'D', 'E', 'AC', 'AD', 'AE'].includes(colaborador.cnhCategoria) && (
          <p className="mt-3 text-sm text-text/70">CNH categoria {colaborador.cnhCategoria}: registre o exame toxicológico no <Link href={`/empresas/${empresaId}/esocial`} className="font-semibold text-primary underline">eSocial (S-2221)</Link>.</p>
        )}
        {colaborador.cnhValidade && new Date(colaborador.cnhValidade) < new Date() && (
          <div className="mt-3"><Aviso tipo="erro">A CNH venceu em {data(colaborador.cnhValidade)}. Ele não pode dirigir pela empresa até renovar.</Aviso></div>
        )}
      </Cartao>

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
          <Selecao id="aso-tipo" name="tipo" rotulo="Tipo de exame" required>
            {TIPOS_ASO.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </Selecao>
          <Campo id="aso-data" name="dataExame" type="date" rotulo="Data do exame" required defaultValue={hoje()} />
          <Selecao id="aso-resultado" name="resultado" rotulo="Resultado" required>
            <option value="APTO">Apto</option>
            <option value="INAPTO">Inapto</option>
          </Selecao>
          <Campo id="aso-medico" name="medicoNome" rotulo="Médico examinador" required placeholder="Ex.: Dr. João Souza"
            className="md:col-span-2" />
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
                <span className="flex flex-wrap gap-2">
                  {a.arquivoPath ? (
                    <Botao variante="secundario" onClick={() => baixar(() => abrirAsoClinica(empresaId, colaboradorId, a.id), `ASO-clinica-${colaborador.nome}-${a.dataExame.slice(0, 10)}.pdf`)}>
                      PDF da clínica
                    </Botao>
                  ) : null}
                  <label className="cursor-pointer rounded-card border border-border bg-white px-4 py-2.5 text-sm font-semibold hover:border-primary">
                    {a.arquivoPath ? 'Trocar PDF da clínica' : 'Subir PDF da clínica'}
                    <input type="file" accept="application/pdf" className="hidden" onChange={async (ev) => {
                      const arq = ev.target.files?.[0];
                      ev.target.value = '';
                      if (!arq) return;
                      try { await anexarAsoClinica(empresaId, colaboradorId, a.id, arq); setAviso({ tipo: 'ok', texto: 'PDF do ASO guardado.' }); await recarregar(); }
                      catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
                    }} />
                  </label>
                  <Botao variante="secundario" onClick={() => baixar(() => gerarAso(empresaId, colaboradorId, a.id), `ASO-${colaborador.nome}-${a.dataExame.slice(0, 10)}.pdf`)}>
                    Baixar ASO
                  </Botao>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <Cartao titulo="Foto para a lista de assinatura">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {foto ? <img src={foto} alt={`Foto de ${colaborador.nome}`} className="h-20 w-20 rounded-full object-cover" /> : <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">{colaborador.nome.split(/\s+/).map((p) => p[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase()}</span>}
          <p className="min-w-48 flex-1 text-text/70">Opcional. Aparece na lista de presença do DDS e do treinamento para conferir quem está assinando. Sem foto, aparecem as iniciais.</p>
          <label className="cursor-pointer rounded-card border border-primary px-4 py-2 font-semibold text-primary">
            {foto ? 'Trocar foto' : 'Tirar ou escolher foto'}
            <input type="file" accept="image/*" capture="user" className="sr-only" onChange={async (ev) => {
              const arq = ev.target.files?.[0]; ev.target.value = ''; if (!arq) return;
              try { setFoto((await fotoColaborador.salvar(empresaId, colaboradorId, await reduzirFoto(arq))).foto); setAviso({ tipo: 'ok', texto: 'Foto guardada.' }); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
            }} />
          </label>
          {foto && <Botao variante="secundario" onClick={async () => { try { setFoto((await fotoColaborador.apagar(empresaId, colaboradorId)).foto); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); } }}>Apagar foto</Botao>}
        </div>
      </Cartao>

      {cfgRosto?.ativo && stRosto && (
        <Cartao titulo="Reconhecimento facial">
          {stRosto.cadastrado ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p><span className="font-semibold text-success">Rosto cadastrado</span> com autorização do funcionário em {new Date(stRosto.consentimentoEm!).toLocaleDateString('pt-BR')}. Pode entregar EPI e marcar presença pelo rosto.</p>
              <div className="flex gap-2">
                <Botao variante="secundario" onClick={() => setCamera('cadastro')}>Cadastrar de novo</Botao>
                <Botao variante="secundario" onClick={async () => { if (!confirm('Apagar o rosto cadastrado? O funcionário volta a assinar à mão.')) return; try { setStRosto(await rosto.remover(empresaId, colaboradorId)); setAviso({ tipo: 'ok', texto: 'Rosto apagado. A autorização foi retirada.' }); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); } }}>Apagar rosto</Botao>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <p>Com o rosto cadastrado, o funcionário confirma a entrega de EPI e a presença em DDS e treinamentos só olhando para a câmera. A assinatura à mão continua valendo para quem preferir.</p>
              <label className="flex items-start gap-2 rounded-card border border-border bg-background p-3">
                <input type="checkbox" className="mt-1" checked={consente} onChange={(e) => setConsente(e.target.checked)} />
                <span>{cfgRosto.textoConsentimento}</span>
              </label>
              <div className="flex justify-end"><Botao disabled={cfgRosto.consentimentoObrigatorio && !consente} onClick={() => setCamera('cadastro')}>Cadastrar rosto</Botao></div>
            </div>
          )}
        </Cartao>
      )}

      <Cartao
        titulo="Ficha de EPI"
        acao={
          colaborador.entregasEpi.length > 0 && (
            <Botao onClick={() => baixar(() => gerarFichaEpi(empresaId, colaboradorId), `Ficha-EPI-${colaborador.nome}.pdf`)}>Baixar ficha de EPI</Botao>
          )
        }
      >
        <p className="mb-3 text-sm text-text/70">Vai entregar EPI em campo, onde pode faltar internet? Use a tela <Link href="/campo?aba=epi" className="font-semibold text-primary underline">Entrega de EPI no campo</Link>: funciona sem sinal, confere o rosto no próprio celular e envia sozinha quando a internet voltar.</p>
        <form
          ref={formEpi}
          className="grid gap-4 md:grid-cols-3"
          onSubmit={enviar(
            (d) =>
              registrarEpi(empresaId, colaboradorId, { ...dadosEpi(), dataEntrega: texto(d, 'dataEntrega') }),
            'Entrega de EPI registrada.',
          )}
        >
          {itensEstoque.length > 0 && (
            <Selecao id="epi-estoque" rotulo="Do almoxarifado" value={itemId} onChange={(e) => setItemId(e.target.value)} className="md:col-span-3">
              <option value="">Não, vou digitar o EPI e o CA</option>
              {itensEstoque.map((i) => <option key={i.id} value={i.id} disabled={i.quantidade < 1 || i.caVencido}>{i.epi}{i.tamanho ? ` (${i.tamanho})` : ''} · CA {i.ca} · saldo {i.quantidade}{i.caVencido ? ' · CA vencido' : ''}</option>)}
            </Selecao>
          )}
          {!itemId && (<>
          <Campo id="epi-nome" name="epi" rotulo="EPI" required placeholder="Ex.: Luva térmica" />
          <Campo id="epi-ca" name="ca" rotulo="Número do CA" required placeholder="Ex.: 12345" />
          <Campo id="epi-validade" name="validadeCa" type="date" rotulo="Validade do CA" />
          <Campo id="epi-fabricante" name="fabricante" rotulo="Fabricante ou fornecedor" placeholder="Ex.: 3M" className="md:col-span-3" />
          </>)}
          <Campo id="epi-qtd" name="quantidade" type="number" min={1} rotulo="Quantidade" required defaultValue={1} />
          <Selecao id="epi-motivo" name="motivo" rotulo="Motivo" required>
            {MOTIVOS_EPI.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </Selecao>
          <Campo id="epi-data" name="dataEntrega" type="date" rotulo="Data da entrega" required defaultValue={hoje()} />
          <div className="flex flex-wrap justify-end gap-2 md:col-span-3">
            <Botao type="submit" variante={stRosto?.cadastrado ? 'secundario' : 'primario'}>Registrar entrega</Botao>
            {cfgRosto?.ativo && stRosto?.cadastrado && (
              <Botao type="button" onClick={() => { if (formEpi.current?.reportValidity()) { setComprovante(null); setCamera('epi'); } }}>Entregar com reconhecimento facial</Botao>
            )}
          </div>
          {comprovante && (
            <div className="md:col-span-3"><Aviso tipo="ok">Entrega confirmada pelo rosto. <button type="button" className="underline" onClick={() => baixar(() => rosto.pdf(empresaId, comprovante), `Comprovante-facial-${colaborador.nome}.pdf`)}>Baixar comprovante</button></Aviso></div>
          )}
        </form>

        {colaborador.entregasEpi.length > 0 && (
          <ul className="mt-5 divide-y divide-border text-sm">
            {colaborador.entregasEpi.map((e) => {
              const vencido = !e.devolvidoEm && e.validadeCa !== null && new Date(e.validadeCa) < new Date();
              return (
                <li key={e.id} className={`flex flex-wrap justify-between gap-2 py-2.5 ${e.devolvidoEm ? 'text-text/50' : ''}`}>
                  <span>
                    <strong>{e.epi}</strong> · CA {e.ca}{e.fabricante ? ` · ${e.fabricante}` : ''} · {e.quantidade} un. · {nomeDe(MOTIVOS_EPI, e.motivo)}
                    {confirmadas.has(e.id) && <> · <button className="text-primary underline" onClick={() => baixar(() => rosto.pdf(empresaId, confirmadas.get(e.id)!), `Comprovante-facial-${colaborador.nome}.pdf`)}>confirmada pelo rosto</button></>}
                  </span>
                  <span className="flex flex-wrap items-center gap-3">
                    <span className={vencido ? 'text-danger' : 'text-text/60'}>
                      {data(e.dataEntrega)}
                      {e.devolvidoEm
                        ? ` · devolvido em ${data(e.devolvidoEm)} (${nomeDe(MOTIVOS_DEVOLUCAO, e.motivoDevolucao ?? '').toLowerCase()})`
                        : e.validadeCa && ` · CA ${vencido ? 'vencido em' : 'válido até'} ${data(e.validadeCa)}`}
                    </span>
                    {!e.devolvidoEm && devolvendo !== e.id && (
                      <button type="button" className="text-primary hover:underline" onClick={() => setDevolvendo(e.id)}>Registrar devolução</button>
                    )}
                  </span>
                  {devolvendo === e.id && (
                    <form
                      className="grid w-full gap-3 rounded-card border border-border bg-background p-3 md:grid-cols-3"
                      onSubmit={async (ev) => {
                        ev.preventDefault();
                        const d = new FormData(ev.currentTarget);
                        try {
                          await devolverEpi(empresaId, colaboradorId, e.id, { data: texto(d, 'data'), motivo: texto(d, 'motivo'), voltaAoEstoque: d.get('voltaAoEstoque') === 'on' });
                          setDevolvendo(null);
                          setAviso({ tipo: 'ok', texto: `Devolução de ${e.epi} registrada.` });
                          await recarregar();
                        } catch (erro) {
                          setAviso({ tipo: 'erro', texto: (erro as Error).message });
                        }
                      }}
                    >
                      <Campo id={`dev-data-${e.id}`} name="data" type="date" rotulo="Data da devolução" required defaultValue={hoje()} />
                      <Selecao id={`dev-motivo-${e.id}`} name="motivo" rotulo="Motivo" required>
                        {MOTIVOS_DEVOLUCAO.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                      </Selecao>
                      {e.estoqueId ? (
                        <label className="flex items-center gap-2 self-end pb-3">
                          <input type="checkbox" name="voltaAoEstoque" className="h-4 w-4 accent-primary" />
                          Está em bom estado e volta ao almoxarifado
                        </label>
                      ) : <span />}
                      <div className="flex justify-end gap-2 md:col-span-3">
                        <Botao type="button" variante="secundario" onClick={() => setDevolvendo(null)}>Cancelar</Botao>
                        <Botao type="submit">Salvar devolução</Botao>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>

      <CartaoSaida
        dataDesligamento={colaborador.dataDesligamento ?? null}
        demissional={colaborador.demissional ?? null}
        salvar={async (d) => {
          try {
            await registrarDesligamento(empresaId, colaboradorId, d);
            setAviso({ tipo: 'ok', texto: d ? 'Saída registrada. O histórico fica guardado, mas ele não aparece mais nos alertas.' : 'Saída desfeita. Ele volta a aparecer nos alertas.' });
            await recarregar();
          } catch (e) {
            setAviso({ tipo: 'erro', texto: (e as Error).message });
          }
        }}
      />

      {camera === 'cadastro' && (
        <CameraRosto titulo={`Cadastrar o rosto de ${colaborador.nome}`} modo="cadastro" onFechar={() => setCamera(null)}
          onCaptura={async (c) => { setStRosto(await rosto.cadastrar(empresaId, colaboradorId, c.descritores, consente)); return 'Rosto cadastrado. Já pode usar na entrega de EPI e nas presenças.'; }} />
      )}
      {camera === 'epi' && (
        <CameraRosto titulo={`Entrega de EPI para ${colaborador.nome}`} modo="unico" pedirFotoItem onFechar={() => setCamera(null)}
          guardarOffline={async (c) => {
            const conf = await conferirNoAparelho(empresaId, colaboradorId, c.descritor);
            if (conf === 'nao-confere') throw new Error(`O rosto não confere com o cadastro de ${colaborador.nome}. Tente de novo com boa luz, ou registre a entrega com assinatura.`);
            await guardarCaptura({ tipo: 'EPI', empresaId, refId: colaboradorId, titulo: colaborador.nome, conferido: conf === 'confere', dados: { ...dadosEpi(), descritor: c.descritor, foto: c.foto, ...(c.fotoItem ? { fotoItem: c.fotoItem } : {}), latitude: c.latitude, longitude: c.longitude, precisao: c.precisao, provaDeVida: c.provaDeVida } });
            formEpi.current?.reset(); setItemId('');
            return conf === 'confere' ? 'Rosto conferido neste aparelho. Entrega guardada e será enviada sozinha quando a internet voltar.' : 'Sem internet: guardado no aparelho. Será conferido e enviado quando a internet voltar.';
          }}
          onCaptura={async (c) => {
            const r = await rosto.entregarEpi(empresaId, colaboradorId, { ...dadosEpi(), descritor: c.descritor, foto: c.foto, ...(c.fotoItem ? { fotoItem: c.fotoItem } : {}), latitude: c.latitude, longitude: c.longitude, precisao: c.precisao, provaDeVida: c.provaDeVida });
            setComprovante(r.codigo); formEpi.current?.reset(); setItemId(''); await recarregar();
            return `Rosto conferido. Entrega de ${r.entrega.epi} registrada.`;
          }} />
      )}
    </main>
  );
}

// Saída da empresa: guarda a data e diz o que falta do exame demissional.
function CartaoSaida({ dataDesligamento, demissional, salvar }: {
  dataDesligamento: string | null; demissional: SituacaoDemissional | null; salvar: (data: string | null) => Promise<void>;
}) {
  const [valor, setValor] = useState(dataDesligamento?.slice(0, 10) ?? '');
  useEffect(() => setValor(dataDesligamento?.slice(0, 10) ?? ''), [dataDesligamento]);
  return (
    <Cartao titulo="Saída da empresa">
      {dataDesligamento ? (
        <div className="space-y-3 text-sm">
          <p>Saiu em <strong>{data(dataDesligamento)}</strong>. Os documentos dele continuam guardados, e o PPP já sai com essa data no fim do período.</p>
          {demissional && !demissional.feito && (
            demissional.dispensa ? (
              <Aviso tipo="info">O último exame foi há {demissional.dias} dias. Como é menos de {demissional.limite} dias, o demissional pode ser dispensado (NR-07). Confirme com o médico do PCMSO.</Aviso>
            ) : (
              <Aviso tipo="erro">Falta o exame demissional. Ele precisa ser feito até 10 dias depois da saída.</Aviso>
            )
          )}
          <Botao variante="secundario" onClick={() => salvar(null)}>Desfazer saída</Botao>
        </div>
      ) : (
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (valor) salvar(new Date(valor).toISOString()); }}>
          <div className="w-48"><Campo id="saida" type="date" rotulo="Data de saída" value={valor} onChange={(e) => setValor(e.target.value)} required /></div>
          <Botao type="submit">Registrar saída</Botao>
          <p className="w-full text-xs text-text/60">Quem saiu deixa de aparecer nos alertas de ASO, EPI e treinamento, mas todo o histórico continua aqui.</p>
        </form>
      )}
    </Cartao>
  );
}
