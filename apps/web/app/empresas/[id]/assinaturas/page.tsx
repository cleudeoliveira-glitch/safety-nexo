'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { pedirLocalizacao, QuadroAssinatura } from '@/components/QuadroAssinatura';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import { arquivo, assinaturas, buscarCertificado, buscarEmpresa, Empresa, ItemArquivo, PedidoAssinatura, salvarArquivo, SignatarioPedido } from '@/lib/api';
import { ehEmpresa } from '@/lib/sessao';

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
const Etiqueta = ({ cor, children }: { cor: string; children: React.ReactNode }) => <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cor}`}>{children}</span>;
const STATUS: Record<PedidoAssinatura['status'], [string, string]> = {
  ABERTO: ['Aguardando assinaturas', 'bg-warning/15 text-warning'], GERANDO: ['Gerando o PDF final', 'bg-primary/10 text-primary'],
  CONCLUIDO: ['Assinado por todos', 'bg-success/15 text-success'], CANCELADO: ['Cancelado', 'bg-border text-text/60'],
};

function AssinarAqui({ empresaId, pedido, s, fechar, agir }: { empresaId: string; pedido: PedidoAssinatura; s: SignatarioPedido; fechar: () => void; agir: (f: () => Promise<string>) => Promise<void> }) {
  const [imagem, setImagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  return (
    <div role="dialog" aria-label={`Assinatura de ${s.nome}`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-card bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-primary">{s.nome}</h2>
        <p className="mb-4 text-sm text-text/60">{s.papel} · assina &quot;{pedido.titulo}&quot; neste aparelho</p>
        <QuadroAssinatura onPronto={setImagem} />
        <div className="mt-4 flex justify-end gap-2">
          <Botao variante="secundario" onClick={fechar}>Voltar</Botao>
          <Botao disabled={!imagem || enviando} onClick={async () => {
            setEnviando(true);
            const local = await pedirLocalizacao();
            await agir(async () => {
              const r = await assinaturas.assinarAqui(empresaId, pedido.id, s.id, { imagem: imagem!, ...(local ?? {}) });
              return r.faltam ? `Assinatura de ${s.nome} registrada. Faltam ${r.faltam}.` : 'Todos assinaram. O PDF assinado já está no arquivo de documentos.';
            });
            setEnviando(false); fechar();
          }}>{enviando ? 'Registrando…' : 'Confirmar assinatura'}</Botao>
        </div>
      </div>
    </div>
  );
}

function NovoPedido({ empresaId, pdfs, inicial, temCertificado, agir }: { empresaId: string; pdfs: ItemArquivo[]; inicial: string; temCertificado: boolean; agir: (f: () => Promise<string>) => Promise<void> }) {
  const vazio = { nome: '', cpf: '', papel: '' };
  const [pessoas, setPessoas] = useState([vazio]);
  const [doc, setDoc] = useState(inicial);
  const [icp, setIcp] = useState(temCertificado);
  const [chave, setChave] = useState(0);
  useEffect(() => setDoc(inicial), [inicial]);
  useEffect(() => setIcp(temCertificado), [temCertificado]);
  const mudar = (i: number, campo: keyof typeof vazio, v: string) => setPessoas(pessoas.map((p, j) => (j === i ? { ...p, [campo]: v } : p)));

  return (
    <Cartao titulo="Pedir assinatura">
      <form key={chave} className="space-y-4" onSubmit={(ev) => {
        ev.preventDefault();
        agir(async () => {
          await assinaturas.criar(empresaId, { arquivoId: doc, icp, signatarios: pessoas.filter((p) => p.nome.trim()).map((p) => ({ nome: p.nome, papel: p.papel, cpf: p.cpf || undefined })) });
          setPessoas([vazio]); setChave((k) => k + 1);
          return 'Pedido criado. Mande o link para cada pessoa, ou colha a assinatura aqui mesmo.';
        });
      }}>
        <Selecao id="pa-doc" rotulo="Documento (PDF do arquivo)" required value={doc} onChange={(e) => setDoc(e.target.value)}>
          <option value="">Escolha</option>
          {pdfs.map((a) => <option key={a.id} value={a.id}>{a.titulo} · versão {a.versao}</option>)}
        </Selecao>
        <div className="space-y-2">
          <p className="text-sm font-semibold">Quem assina</p>
          {pessoas.map((p, i) => (
            <div key={i} className="grid gap-2 md:grid-cols-[2fr_1fr_2fr_auto]">
              <input aria-label="Nome" required={i === 0} placeholder="Nome completo" value={p.nome} onChange={(e) => mudar(i, 'nome', e.target.value)} className="rounded-card border border-border bg-background px-3 py-2" />
              <input aria-label="CPF" placeholder="CPF (pede para conferir)" value={p.cpf} onChange={(e) => mudar(i, 'cpf', e.target.value)} className="rounded-card border border-border bg-background px-3 py-2" />
              <input aria-label="Assina como" required={!!p.nome} placeholder="Assina como, ex.: Responsável legal" value={p.papel} onChange={(e) => mudar(i, 'papel', e.target.value)} className="rounded-card border border-border bg-background px-3 py-2" />
              <button type="button" className="text-sm text-danger" onClick={() => setPessoas(pessoas.length > 1 ? pessoas.filter((_, j) => j !== i) : [vazio])}>Tirar</button>
            </div>
          ))}
          <button type="button" className="text-sm font-semibold text-primary" onClick={() => setPessoas([...pessoas, vazio])}>+ Outra pessoa</button>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={icp} disabled={!temCertificado} onChange={(e) => setIcp(e.target.checked)} className="mt-1" />
          <span>Quando todos assinarem, assinar também com o certificado digital ICP-Brasil da consultoria.
            {!temCertificado && <> Cadastre o certificado na página <Link href={`/empresas/${empresaId}/esocial`} className="text-primary underline">eSocial</Link> para usar.</>}</span>
        </label>
        <div className="flex justify-end"><Botao type="submit">Criar pedido</Botao></div>
      </form>
    </Cartao>
  );
}

export default function AssinaturasPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [pedidos, setPedidos] = useState<PedidoAssinatura[]>([]);
  const [pdfs, setPdfs] = useState<ItemArquivo[]>([]);
  const [inicial, setInicial] = useState('');
  const [temCertificado, setTemCertificado] = useState(false);
  const [cliente, setCliente] = useState(false);
  const [assinando, setAssinando] = useState<{ pedido: PedidoAssinatura; s: SignatarioPedido } | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [e, p, a] = await Promise.all([buscarEmpresa(empresaId), assinaturas.listar(empresaId), arquivo.listar(empresaId)]);
      setEmpresa(e); setPedidos(p); setPdfs(a.filter((x) => x.mime === 'application/pdf' && !x.titulo.endsWith('(assinado)')));
    } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }, [empresaId]);
  useEffect(() => {
    const c = ehEmpresa(); setCliente(c);
    setInicial(new URLSearchParams(window.location.search).get('arquivo') ?? '');
    if (!c) buscarCertificado().then((x) => setTemCertificado(!!x)).catch(() => undefined);
    carregar();
  }, [carregar]);
  const agir = async (f: () => Promise<string>) => { try { setAviso({ tipo: 'ok', texto: await f() }); await carregar(); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); } };
  const copiar = (link: string, nome: string) => navigator.clipboard?.writeText(link).then(() => setAviso({ tipo: 'ok', texto: `Link de ${nome} copiado. Mande por WhatsApp ou e-mail.` }));

  if (!empresa) return <main className="p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando…'}</main>;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div>
        <Link href={`/empresas/${empresaId}/arquivo`} className="text-sm text-primary">← Arquivo de documentos</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Assinaturas</h1>
        <p className="text-text/60">{empresa.razaoSocial} · assinatura com o dedo na tela, por link ou no seu aparelho, com data, hora e local</p>
      </div>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      <NovoPedido empresaId={empresaId} pdfs={pdfs} inicial={inicial} temCertificado={temCertificado && !cliente} agir={agir} />

      <Cartao titulo="Pedidos">
        {!pedidos.length ? <p className="text-sm text-text/60">Nenhum pedido de assinatura ainda.</p> : (
          <ul className="divide-y divide-border">
            {pedidos.map((p) => (
              <li key={p.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{p.titulo}</p>
                    <p className="text-xs text-text/60">Pedido por {p.criadoPorNome} em {dataHora(p.criadoEm)} · código de conferência {p.codigo}{p.icp ? ' · com certificado ICP-Brasil' : ''}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <Etiqueta cor={STATUS[p.status][1]}>{STATUS[p.status][0]}</Etiqueta>
                    {p.arquivoFinalId && <button className="text-primary underline" onClick={async () => { try { salvarArquivo(await arquivo.baixar(empresaId, p.arquivoFinalId!), `${p.titulo}-assinado.pdf`); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); } }}>Baixar assinado</button>}
                    {p.status === 'CONCLUIDO' && <a className="text-primary underline" href={`/assinatura/${p.codigo}`} target="_blank" rel="noreferrer">Página de conferência</a>}
                    {p.status === 'ABERTO' && !cliente && <button className="text-danger underline" onClick={() => confirm('Cancelar este pedido? Os links deixam de funcionar.') && agir(async () => { await assinaturas.cancelar(empresaId, p.id); return 'Pedido cancelado.'; })}>Cancelar</button>}
                  </div>
                </div>
                <ul className="mt-3 space-y-2">
                  {p.signatarios.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border px-3 py-2 text-sm">
                      <span><strong>{s.nome}</strong> · {s.papel}</span>
                      {s.assinadoEm
                        ? <span className="text-success">Assinou em {dataHora(s.assinadoEm)}{s.presencial ? ' (aqui)' : ' (pelo link)'}{s.latitude !== null ? ' · com local' : ''}</span>
                        : p.status === 'ABERTO' && s.link ? (
                          <span className="flex flex-wrap gap-3">
                            <button className="text-primary underline" onClick={() => copiar(s.link!, s.nome)}>Copiar link</button>
                            <a className="text-primary underline" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Olá, ${s.nome}. Assine o documento "${p.titulo}" por este link: ${s.link}`)}`}>WhatsApp</a>
                            <button className="text-primary underline" onClick={() => setAssinando({ pedido: p, s })}>Assinar aqui</button>
                          </span>
                        ) : <span className="text-text/50">Não assinou</span>}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
      {assinando && <AssinarAqui empresaId={empresaId} pedido={assinando.pedido} s={assinando.s} fechar={() => setAssinando(null)} agir={agir} />}
    </main>
  );
}
