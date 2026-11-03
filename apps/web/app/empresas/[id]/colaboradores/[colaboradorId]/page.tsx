'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraRosto } from '@/components/CameraRosto';
import { guardarCaptura } from '@/lib/rosto-offline';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import { buscarColaborador, ColaboradorDetalhe, gerarAso, gerarFichaEpi, gerarOs, gerarPpp, registrarAso, registrarEpi, rosto, estoque, fotoColaborador, salvarArquivo, type ConfigRosto, type ItemEstoque, type StatusRosto } from '@/lib/api';

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

  const recarregar = useCallback(async () => {
    try {
      setColaborador(await buscarColaborador(empresaId, colaboradorId));
      rosto.config().then(setCfgRosto).catch(() => setCfgRosto(null));
      rosto.status(empresaId, colaboradorId).then(setStRosto).catch(() => setStRosto(null));
      fotoColaborador.ver(empresaId, colaboradorId).then((f) => setFoto(f.foto)).catch(() => setFoto(null));
      estoque.listar(empresaId).then((l) => setItensEstoque(l.filter((i) => i.ativo))).catch(() => setItensEstoque([]));
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
    return { ...base, epi: texto(d, 'epi'), ca: texto(d, 'ca'), ...(texto(d, 'validadeCa') ? { validadeCa: texto(d, 'validadeCa') } : {}) };
  };
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
          <Campo id="epi-ca" name="ca" rotulo="Número do CA" required placeholder="Ex.: 12345"
            ajuda={{ oQueE: 'Certificado de Aprovação: número que prova que o EPI foi aprovado pelo Ministério do Trabalho.', ondeAcho: 'Gravado no próprio EPI ou na embalagem.', baseLegal: 'NR-06' }} />
          <Campo id="epi-validade" name="validadeCa" type="date" rotulo="Validade do CA"
            ajuda={{ oQueE: 'Até quando o CA vale. Com o CA vencido, o EPI não deve ser entregue.', ondeAcho: 'Na consulta de CA do Ministério do Trabalho.' }} />
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
              const vencido = e.validadeCa !== null && new Date(e.validadeCa) < new Date();
              return (
                <li key={e.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                  <span>
                    <strong>{e.epi}</strong> · CA {e.ca} · {e.quantidade} un. · {nomeDe(MOTIVOS_EPI, e.motivo)}
                    {confirmadas.has(e.id) && <> · <button className="text-primary underline" onClick={() => baixar(() => rosto.pdf(empresaId, confirmadas.get(e.id)!), `Comprovante-facial-${colaborador.nome}.pdf`)}>confirmada pelo rosto</button></>}
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

      {camera === 'cadastro' && (
        <CameraRosto titulo={`Cadastrar o rosto de ${colaborador.nome}`} modo="cadastro" onFechar={() => setCamera(null)}
          onCaptura={async (c) => { setStRosto(await rosto.cadastrar(empresaId, colaboradorId, c.descritores, consente)); return 'Rosto cadastrado. Já pode usar na entrega de EPI e nas presenças.'; }} />
      )}
      {camera === 'epi' && (
        <CameraRosto titulo={`Entrega de EPI para ${colaborador.nome}`} modo="unico" pedirFotoItem onFechar={() => setCamera(null)}
          guardarOffline={async (c) => { await guardarCaptura({ tipo: 'EPI', empresaId, refId: colaboradorId, titulo: colaborador.nome, dados: { ...dadosEpi(), descritor: c.descritor, foto: c.foto, ...(c.fotoItem ? { fotoItem: c.fotoItem } : {}), latitude: c.latitude, longitude: c.longitude, precisao: c.precisao, provaDeVida: c.provaDeVida } }); formEpi.current?.reset(); setItemId(''); return 'Sem internet: guardado no aparelho. Será conferido e enviado quando a internet voltar.'; }}
          onCaptura={async (c) => {
            const r = await rosto.entregarEpi(empresaId, colaboradorId, { ...dadosEpi(), descritor: c.descritor, foto: c.foto, ...(c.fotoItem ? { fotoItem: c.fotoItem } : {}), latitude: c.latitude, longitude: c.longitude, precisao: c.precisao, provaDeVida: c.provaDeVida });
            setComprovante(r.codigo); formEpi.current?.reset(); setItemId(''); await recarregar();
            return `Rosto conferido. Entrega de ${r.entrega.epi} registrada.`;
          }} />
      )}
    </main>
  );
}
