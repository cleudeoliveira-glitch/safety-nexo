'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import {
  centavos, Cobranca, comercial, ConfigComercial, Contrato, Empresa, ItemProposta, listarEmpresas, Proposta, reais, ReguaCobranca, ResumoComercial, salvarArquivo, Servico,
} from '@/lib/api';
import { ehEmpresa } from '@/lib/sessao';

type Aba = 'cobrancas' | 'propostas' | 'contratos' | 'servicos' | 'config';
type Agir = (acao: () => Promise<string>) => void;
const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const texto = (d: FormData, k: string) => String(d.get(k) ?? '').trim();
const hoje = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
const Etiqueta = ({ cor, children }: { cor: string; children: React.ReactNode }) => <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cor}`}>{children}</span>;

export default function ComercialPage() {
  const [aba, setAba] = useState<Aba>('cobrancas');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [config, setConfig] = useState<ConfigComercial | null>(null);
  const [resumo, setResumo] = useState<ResumoComercial | null>(null);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok' | 'info'; texto: string } | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const [e, c, r, p, ct, s, cb] = await Promise.all([listarEmpresas(), comercial.configuracao(), comercial.resumo(), comercial.propostas(), comercial.contratos(), comercial.servicos(), comercial.cobrancas()]);
      setEmpresas(e); setConfig(c); setResumo(r); setPropostas(p); setContratos(ct); setServicos(s); setCobrancas(cb);
    } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }, []);

  useEffect(() => {
    if (ehEmpresa()) { setAviso({ tipo: 'info', texto: 'O Comercial é da sua consultoria.' }); return; }
    recarregar();
  }, [recarregar]);

  const agir: Agir = async (acao) => {
    try { const t = await acao(); setAviso({ tipo: 'ok', texto: t }); await recarregar(); }
    catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  };
  const baixar = (gerar: () => Promise<Blob>, nome: string) => agir(async () => { salvarArquivo(await gerar(), `${nome}.pdf`); return 'Documento baixado.'; });

  if (!config || !resumo) return <main className="p-10">{aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : 'Carregando…'}</main>;

  const abas: [Aba, string][] = [['cobrancas', 'Cobranças'], ['propostas', 'Propostas'], ['contratos', 'Contratos'], ['servicos', 'Ordens de serviço'], ['config', 'Dados e Pix']];
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div>
        <Link href="/" className="text-sm text-primary">← Voltar ao painel</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Comercial</h1>
        <p className="text-text/60">{config.nome}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[['A receber', reais(resumo.emAberto), 'text-primary'], ['Vencido', reais(resumo.vencido), resumo.vencido ? 'text-danger' : 'text-text/40'],
          ['Recebido no mês', reais(resumo.recebidoNoMes), 'text-success'], ['Contratos ativos', String(resumo.contratosAtivos), 'text-primary']].map(([rotulo, valor, cor]) => (
          <div key={rotulo} className="rounded-card border border-border bg-white p-4">
            <p className="text-sm text-text/60">{rotulo}</p>
            <p className={`text-2xl font-semibold ${cor}`}>{valor}</p>
          </div>
        ))}
      </div>

      <div role="tablist" className="flex flex-wrap gap-2">
        {abas.map(([valor, nome]) => (
          <button key={valor} role="tab" aria-selected={aba === valor} onClick={() => { setAba(valor); setAviso(null); }}
            className={`rounded-card px-4 py-2 text-sm font-semibold ${aba === valor ? 'bg-primary text-white' : 'border border-border bg-white'}`}>{nome}</button>
        ))}
      </div>

      {aviso && <div className="sticky top-2 z-10 shadow-sm"><Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso></div>}
      {!config.pixChave && aba !== 'config' && <Aviso tipo="info">Cadastre a chave Pix em &quot;Dados e Pix&quot; para as cobranças saírem com QR Code.</Aviso>}

      {aba === 'cobrancas' && <AbaCobrancas empresas={empresas} lista={cobrancas} agir={agir} baixar={baixar} />}
      {aba === 'propostas' && <AbaPropostas empresas={empresas} lista={propostas} agir={agir} baixar={baixar} irParaContrato={() => setAba('contratos')} />}
      {aba === 'contratos' && <AbaContratos empresas={empresas} propostas={propostas} lista={contratos} agir={agir} baixar={baixar} />}
      {aba === 'servicos' && <AbaServicos empresas={empresas} contratos={contratos} lista={servicos} agir={agir} />}
      {aba === 'config' && <AbaConfig config={config} agir={agir} />}
    </main>
  );
}

function AbaCobrancas({ empresas, lista, agir, baixar }: { empresas: Empresa[]; lista: Cobranca[]; agir: Agir; baixar: (g: () => Promise<Blob>, n: string) => void }) {
  const [mes, setMes] = useState(hoje().slice(0, 7));
  const [chave, setChave] = useState(0);
  const [pix, setPix] = useState<{ id: string; copiaECola: string; qr: string } | null>(null);
  return (
    <div className="space-y-6">
      <CartaoRegua empresas={empresas} agir={agir} />
      <Cartao titulo="Mensalidades" acao={
        <div className="flex items-center gap-2">
          <input type="month" aria-label="Mês" value={mes} onChange={(e) => setMes(e.target.value)} className="rounded-card border border-border px-2 py-1.5 text-sm" />
          <Botao onClick={() => agir(async () => { const r = await comercial.mensalidades(mes); return r.criadas ? `${r.criadas} mensalidade(s) criada(s).` : 'As mensalidades deste mês já estavam criadas.'; })}>Gerar do mês</Botao>
        </div>}>
        <p className="text-sm text-text/60">Cria a cobrança do mês de cada contrato ativo com mensalidade. Pode clicar de novo: não repete.</p>
      </Cartao>
      <Cartao titulo="Nova cobrança avulsa">
        <form key={chave} className="grid gap-4 md:grid-cols-4" onSubmit={(ev) => {
          ev.preventDefault(); const d = new FormData(ev.currentTarget);
          agir(async () => {
            const valor = centavos(texto(d, 'valor'));
            if (!valor) throw new Error('Informe o valor, por exemplo 350,00.');
            await comercial.criarCobranca({ empresaId: texto(d, 'empresa'), descricao: texto(d, 'descricao'), valorCentavos: valor, vencimento: texto(d, 'vencimento') });
            setChave((k) => k + 1); return 'Cobrança criada.';
          });
        }}>
          <Selecao id="cb-emp" name="empresa" rotulo="Cliente" required><option value="">Escolha</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.razaoSocial}</option>)}</Selecao>
          <Campo id="cb-desc" name="descricao" rotulo="Descrição" required placeholder="Ex.: Laudo de insalubridade" />
          <Campo id="cb-valor" name="valor" rotulo="Valor (R$)" required inputMode="decimal" placeholder="350,00" />
          <Campo id="cb-venc" name="vencimento" type="date" rotulo="Vencimento" required />
          <div className="flex justify-end md:col-span-4"><Botao type="submit">Criar cobrança</Botao></div>
        </form>
      </Cartao>
      <Cartao titulo="Cobranças">
        {!lista.length ? <p className="text-sm text-text/60">Nenhuma cobrança ainda.</p> : (
          <ul className="divide-y divide-border">
            {lista.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{c.empresa.razaoSocial} · {reais(c.valorCentavos)}</p>
                    <p className="text-sm text-text/70">{c.descricao}</p>
                    <p className="text-xs text-text/50">Vence em {data(c.vencimento)}{c.pagoEm ? ` · paga em ${data(c.pagoEm)}` : ''}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {c.status === 'PAGA' ? <Etiqueta cor="bg-success/15 text-success">Paga</Etiqueta>
                      : c.status === 'CANCELADA' ? <Etiqueta cor="bg-border text-text/60">Cancelada</Etiqueta>
                      : c.vencida ? <Etiqueta cor="bg-danger/15 text-danger">Vencida</Etiqueta> : <Etiqueta cor="bg-warning/15 text-warning">Em aberto</Etiqueta>}
                    {c.status === 'ABERTA' && (<>
                      <button className="text-sm text-primary underline" onClick={async () => {
                        if (pix?.id === c.id) { setPix(null); return; }
                        try { const p = await comercial.pix(c.id); if (p) setPix({ id: c.id, ...p }); else agir(async () => { throw new Error('Cadastre a chave Pix em "Dados e Pix".'); }); } catch (e) { agir(async () => { throw e; }); }
                      }}>Pix</button>
                      <button className="text-sm text-primary underline" onClick={() => baixar(() => comercial.pdfCobranca(c.id), `Cobranca-${c.empresa.razaoSocial}`)}>PDF</button>
                      <Botao variante="secundario" onClick={() => agir(async () => { await comercial.pagar(c.id); return 'Pagamento registrado.'; })}>Recebi</Botao>
                      <button className="text-sm text-danger underline" onClick={() => confirm('Cancelar esta cobrança?') && agir(async () => { await comercial.cancelar(c.id); return 'Cobrança cancelada.'; })}>Cancelar</button>
                    </>)}
                  </div>
                </div>
                {pix?.id === c.id && (
                  <div className="mt-3 flex flex-wrap items-center gap-4 rounded-card border border-border bg-background p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pix.qr} alt="QR Code Pix" className="h-36 w-36" />
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-sm font-semibold">Pix copia e cola</p>
                      <p className="break-all font-mono text-xs">{pix.copiaECola}</p>
                      <button className="mt-2 text-sm text-primary underline" onClick={() => navigator.clipboard?.writeText(pix.copiaECola).then(() => agir(async () => 'Código Pix copiado. É só colar na mensagem para o cliente.'))}>Copiar código</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

// Régua de cobrança: e-mail automático para o cliente 3 dias antes, no dia, 3 e 10 dias depois do vencimento.
function CartaoRegua({ empresas, agir }: { empresas: Empresa[]; agir: Agir }) {
  const [r, setR] = useState<ReguaCobranca | null>(null);
  const [aberto, setAberto] = useState(false);
  useEffect(() => { comercial.regua().then(setR).catch(() => setR(null)); }, [empresas]);
  if (!r) return null;
  return (
    <Cartao titulo="Avisos automáticos de cobrança" acao={
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={r.ligada} onChange={(e) => agir(async () => { setR(await comercial.ligarRegua(e.target.checked)); return e.target.checked ? 'Avisos de cobrança ligados.' : 'Avisos de cobrança desligados.'; })} />
        {r.ligada ? 'Ligados' : 'Desligados'}
      </label>}>
      <p className="text-sm text-text/70">Quando ligado, o cliente recebe um e-mail com o valor, o Pix copia e cola e o PDF da cobrança <strong>3 dias antes</strong>, <strong>no dia</strong> e, se não constar como paga, <strong>3 e 10 dias depois</strong> do vencimento. Quando ele responder, a resposta vai para o seu e-mail.</p>
      {!r.emailLigado && <p className="mt-2 text-sm text-warning">O envio de e-mails ainda não está ligado no servidor.</p>}
      {r.ligada && r.semEmail.length > 0 && <p className="mt-2 text-sm text-danger">Sem e-mail de cobrança (não recebem aviso): {r.semEmail.join(', ')}.</p>}
      <button type="button" className="mt-3 text-sm text-primary underline" onClick={() => setAberto(!aberto)}>{aberto ? 'Fechar' : 'E-mail de cobrança de cada cliente'}</button>
      {aberto && (
        <ul className="mt-3 divide-y divide-border">
          {empresas.map((e) => (
            <li key={e.id} className="py-2">
              <form className="flex flex-wrap items-end gap-2" onSubmit={(ev) => {
                ev.preventDefault(); const email = texto(new FormData(ev.currentTarget), 'email');
                agir(async () => { await comercial.emailCobranca(e.id, email); setR(await comercial.regua()); return email ? `E-mail de cobrança de ${e.razaoSocial} salvo.` : `E-mail de cobrança de ${e.razaoSocial} apagado.`; });
              }}>
                <Campo id={`em-${e.id}`} name="email" type="email" rotulo={e.razaoSocial} defaultValue={e.emailCobranca ?? ''} placeholder="financeiro@cliente.com.br" className="min-w-64 flex-1" />
                <Botao type="submit" variante="secundario">Salvar</Botao>
              </form>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-text/50">Sem e-mail de cobrança, o aviso vai para o login da empresa cliente, se ela tiver.</p>
    </Cartao>
  );
}

// Link para o cliente aprovar a proposta pelo celular, com WhatsApp e e-mail prontos.
function LinkProposta({ p, agir }: { p: Proposta; agir: Agir }) {
  const [url, setUrl] = useState<string | null>(null);
  const mensagem = (u: string) => `Olá! Segue a proposta nº ${p.numero} de serviços de segurança do trabalho. Você pode ver e aprovar por este link: ${u}`;
  if (!url) {
    return <Botao variante="secundario" onClick={() => agir(async () => { const r = await comercial.linkProposta(p.id); setUrl(r.url); return 'Link pronto. Mande pelo WhatsApp ou por e-mail.'; })}>Link para aprovar</Botao>;
  }
  return (
    <div className="flex w-full flex-wrap items-center gap-3 rounded-card border border-border bg-background p-3 text-sm">
      <span className="min-w-0 flex-1 break-all font-mono text-xs">{url}</span>
      <button className="text-primary underline" onClick={() => navigator.clipboard?.writeText(url).then(() => agir(async () => 'Link copiado.'))}>Copiar</button>
      <a className="text-primary underline" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(mensagem(url))}`}>WhatsApp</a>
      <a className="text-primary underline" href={`mailto:?subject=${encodeURIComponent(`Proposta nº ${p.numero}`)}&body=${encodeURIComponent(mensagem(url))}`}>E-mail</a>
    </div>
  );
}

function AbaPropostas({ empresas, lista, agir, baixar, irParaContrato }: { empresas: Empresa[]; lista: Proposta[]; agir: Agir; baixar: (g: () => Promise<Blob>, n: string) => void; irParaContrato: () => void }) {
  const vazio = { descricao: '', quantidade: 1, valor: '' };
  const [itens, setItens] = useState([vazio]);
  const [empresa, setEmpresa] = useState('');
  const [chave, setChave] = useState(0);
  const total = itens.reduce((s, i) => s + (centavos(i.valor) ?? 0) * i.quantidade, 0);
  return (
    <div className="space-y-6">
      <Cartao titulo="Nova proposta">
        <form key={chave} className="grid gap-4 md:grid-cols-3" onSubmit={(ev) => {
          ev.preventDefault(); const d = new FormData(ev.currentTarget);
          agir(async () => {
            const lista: ItemProposta[] = itens.filter((i) => i.descricao.trim()).map((i) => {
              const v = centavos(i.valor); if (v === undefined) throw new Error(`Informe o valor de "${i.descricao}".`);
              return { descricao: i.descricao, quantidade: i.quantidade, valorCentavos: v };
            });
            await comercial.criarProposta({
              empresaId: empresa || undefined, clienteNome: empresa ? undefined : texto(d, 'nome'), clienteCnpj: empresa ? undefined : texto(d, 'cnpj') || undefined,
              clienteContato: texto(d, 'contato') || undefined, data: texto(d, 'data'), validadeDias: Number(texto(d, 'validade') || 15), itens: lista, observacoes: texto(d, 'obs') || undefined,
            });
            setItens([vazio]); setEmpresa(''); setChave((k) => k + 1); return 'Proposta criada. Baixe o PDF para enviar ao cliente.';
          });
        }}>
          <Selecao id="pr-emp" rotulo="Cliente" value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
            <option value="">Cliente novo (ainda não cadastrado)</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.razaoSocial}</option>)}
          </Selecao>
          {!empresa && <><Campo id="pr-nome" name="nome" rotulo="Nome do cliente" required /><Campo id="pr-cnpj" name="cnpj" rotulo="CNPJ" /></>}
          <Campo id="pr-contato" name="contato" rotulo="Aos cuidados de" placeholder="Nome de quem recebe" />
          <Campo id="pr-data" name="data" type="date" rotulo="Data" required defaultValue={hoje()} />
          <Campo id="pr-val" name="validade" type="number" min={1} rotulo="Validade (dias)" defaultValue={15} />
          <div className="space-y-2 md:col-span-3">
            <p className="text-sm font-semibold">Serviços</p>
            {itens.map((i, n) => (
              <div key={n} className="grid gap-2 md:grid-cols-[1fr_6rem_9rem_auto]">
                <input aria-label="Serviço" placeholder="Ex.: Elaboração do PGR" value={i.descricao} onChange={(e) => setItens(itens.map((x, k) => k === n ? { ...x, descricao: e.target.value } : x))} className="rounded-card border border-border bg-background px-3 py-2" />
                <input aria-label="Quantidade" type="number" min={1} value={i.quantidade} onChange={(e) => setItens(itens.map((x, k) => k === n ? { ...x, quantidade: Math.max(1, Number(e.target.value)) } : x))} className="rounded-card border border-border bg-background px-3 py-2" />
                <input aria-label="Valor unitário" inputMode="decimal" placeholder="R$ 0,00" value={i.valor} onChange={(e) => setItens(itens.map((x, k) => k === n ? { ...x, valor: e.target.value } : x))} className="rounded-card border border-border bg-background px-3 py-2" />
                <button type="button" className="text-sm text-danger" onClick={() => setItens(itens.length > 1 ? itens.filter((_, k) => k !== n) : [vazio])}>Tirar</button>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <button type="button" className="text-sm font-semibold text-primary" onClick={() => setItens([...itens, vazio])}>+ Outro serviço</button>
              <p className="text-sm">Total: <strong>{reais(total)}</strong></p>
            </div>
          </div>
          <Campo id="pr-obs" name="obs" rotulo="Condições (prazo, forma de pagamento)" className="md:col-span-3" />
          <div className="flex justify-end md:col-span-3"><Botao type="submit">Criar proposta</Botao></div>
        </form>
      </Cartao>
      <Cartao titulo="Propostas">
        {!lista.length ? <p className="text-sm text-text/60">Nenhuma proposta ainda.</p> : (
          <ul className="divide-y divide-border">
            {lista.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">Nº {p.numero} · {p.clienteNome}</p><p className="text-sm text-text/60">{data(p.data)} · {reais(p.total)}</p>
                  {p.respostaNome && <p className="text-xs text-text/60">{p.status === 'ACEITA' ? 'Aceita' : 'Recusada'} online por {p.respostaNome}{p.respostaCargo ? ` (${p.respostaCargo})` : ''}{p.respostaEm ? ` em ${new Date(p.respostaEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}{p.motivoRecusa ? `. Motivo: ${p.motivoRecusa}` : ''}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {p.status === 'ACEITA' ? <Etiqueta cor="bg-success/15 text-success">Aceita{p.contratos[0] ? ` · contrato nº ${p.contratos[0].numero}` : ''}</Etiqueta>
                    : p.status === 'RECUSADA' ? <Etiqueta cor="bg-border text-text/60">Recusada</Etiqueta> : <Etiqueta cor="bg-warning/15 text-warning">Aguardando cliente</Etiqueta>}
                  <button className="text-sm text-primary underline" onClick={() => baixar(() => comercial.pdfProposta(p.id), `Proposta-${p.numero}`)}>PDF</button>
                  {p.status === 'ACEITA' && !p.contratos[0] && <Botao variante="secundario" onClick={irParaContrato}>Fazer contrato</Botao>}
                  {p.status === 'ABERTA' && <>
                    <LinkProposta p={p} agir={agir} />
                    <Botao variante="secundario" onClick={irParaContrato}>Aceita: fazer contrato</Botao>
                    <button className="text-sm text-text/60 underline" onClick={() => agir(async () => { await comercial.statusProposta(p.id, 'RECUSADA'); return 'Proposta marcada como recusada.'; })}>Recusada</button>
                  </>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

function AbaContratos({ empresas, propostas, lista, agir, baixar }: { empresas: Empresa[]; propostas: Proposta[]; lista: Contrato[]; agir: Agir; baixar: (g: () => Promise<Blob>, n: string) => void }) {
  const [chave, setChave] = useState(0);
  const [proposta, setProposta] = useState('');
  const [empresa, setEmpresa] = useState('');
  const abertas = propostas.filter((p) => p.status === 'ABERTA' || (p.status === 'ACEITA' && !p.contratos.length));
  const escolhida = abertas.find((p) => p.id === proposta);
  return (
    <div className="space-y-6">
      <Cartao titulo="Novo contrato">
        <p className="mb-4 text-sm text-text/60">O contrato sai de um modelo simples de prestação de serviços de SST. Revise o texto antes de mandar assinar.</p>
        <form key={chave} className="grid gap-4 md:grid-cols-3" onSubmit={(ev) => {
          ev.preventDefault(); const d = new FormData(ev.currentTarget);
          agir(async () => {
            await comercial.criarContrato({
              empresaId: empresa, propostaId: proposta || undefined, objeto: texto(d, 'objeto'), valorMensalCentavos: centavos(texto(d, 'mensal')),
              diaVencimento: texto(d, 'dia') ? Number(texto(d, 'dia')) : undefined, inicio: texto(d, 'inicio'), fim: texto(d, 'fim') || undefined, observacoes: texto(d, 'obs') || undefined,
            });
            setChave((k) => k + 1); setProposta(''); setEmpresa(''); return 'Contrato criado.';
          });
        }}>
          <Selecao id="ct-prop" rotulo="A partir da proposta (opcional)" value={proposta} onChange={(e) => { setProposta(e.target.value); const p = abertas.find((x) => x.id === e.target.value); if (p?.empresaId) setEmpresa(p.empresaId); }}>
            <option value="">Sem proposta</option>{abertas.map((p) => <option key={p.id} value={p.id}>Nº {p.numero} · {p.clienteNome}</option>)}
          </Selecao>
          <Selecao id="ct-emp" rotulo="Empresa" required value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
            <option value="">Escolha</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.razaoSocial}</option>)}
          </Selecao>
          <Campo id="ct-ini" name="inicio" type="date" rotulo="Início" required defaultValue={hoje()} />
          <Campo key={proposta} id="ct-obj" name="objeto" rotulo="Serviços contratados" required className="md:col-span-3"
            defaultValue={escolhida ? escolhida.itens.map((i) => i.descricao).join('; ') : ''} placeholder="Ex.: Assessoria mensal em SST: PGR, PCMSO, treinamentos e eSocial" />
          <Campo id="ct-mensal" name="mensal" rotulo="Mensalidade (R$)" inputMode="decimal" placeholder="Deixe em branco se não houver" />
          <Campo id="ct-dia" name="dia" type="number" min={1} max={28} rotulo="Dia de vencimento" placeholder="Ex.: 10" />
          <Campo id="ct-fim" name="fim" type="date" rotulo="Fim (opcional)" />
          <Campo id="ct-obs" name="obs" rotulo="Condições adicionais" className="md:col-span-3" />
          <div className="flex justify-end md:col-span-3"><Botao type="submit">Criar contrato</Botao></div>
        </form>
      </Cartao>
      <Cartao titulo="Contratos">
        {!lista.length ? <p className="text-sm text-text/60">Nenhum contrato ainda.</p> : (
          <ul className="divide-y divide-border">
            {lista.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div><p className="font-semibold">Nº {c.numero} · {c.empresa.razaoSocial}</p>
                  <p className="text-sm text-text/60">Desde {data(c.inicio)}{c.fim ? ` até ${data(c.fim)}` : ''} · {c.valorMensalCentavos ? `${reais(c.valorMensalCentavos)} por mês, dia ${c.diaVencimento}` : 'por serviço'}</p></div>
                <div className="flex flex-wrap items-center gap-3">
                  {c.status === 'ATIVO' ? <Etiqueta cor="bg-success/15 text-success">Ativo</Etiqueta> : <Etiqueta cor="bg-border text-text/60">Encerrado</Etiqueta>}
                  <button className="text-sm text-primary underline" onClick={() => baixar(() => comercial.pdfContrato(c.id), `Contrato-${c.numero}`)}>PDF</button>
                  {c.status === 'ATIVO' && <button className="text-sm text-danger underline" onClick={() => confirm('Encerrar este contrato hoje?') && agir(async () => { await comercial.encerrarContrato(c.id); return 'Contrato encerrado.'; })}>Encerrar</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

function AbaServicos({ empresas, contratos, lista, agir }: { empresas: Empresa[]; contratos: Contrato[]; lista: Servico[]; agir: Agir }) {
  const [chave, setChave] = useState(0);
  const [empresa, setEmpresa] = useState('');
  const doCliente = contratos.filter((c) => c.empresaId === empresa && c.status === 'ATIVO');
  return (
    <div className="space-y-6">
      <Cartao titulo="Nova ordem de serviço">
        <p className="mb-4 text-sm text-text/60">Um trabalho para fazer no cliente: visita, medição, laudo, treinamento. Se tiver valor à parte, a cobrança sai sozinha quando você concluir.</p>
        <form key={chave} className="grid gap-4 md:grid-cols-3" onSubmit={(ev) => {
          ev.preventDefault(); const d = new FormData(ev.currentTarget);
          agir(async () => {
            await comercial.criarServico({ empresaId: empresa, contratoId: texto(d, 'contrato') || undefined, descricao: texto(d, 'descricao'), previsto: texto(d, 'previsto') || undefined, responsavel: texto(d, 'resp') || undefined, valorCentavos: centavos(texto(d, 'valor')) });
            setChave((k) => k + 1); setEmpresa(''); return 'Ordem de serviço aberta.';
          });
        }}>
          <Selecao id="os-emp" rotulo="Cliente" required value={empresa} onChange={(e) => setEmpresa(e.target.value)}><option value="">Escolha</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.razaoSocial}</option>)}</Selecao>
          <Selecao id="os-ct" name="contrato" rotulo="Contrato"><option value="">Sem contrato</option>{doCliente.map((c) => <option key={c.id} value={c.id}>Nº {c.numero}</option>)}</Selecao>
          <Campo id="os-prev" name="previsto" type="date" rotulo="Data prevista" />
          <Campo id="os-desc" name="descricao" rotulo="O que fazer" required className="md:col-span-2" placeholder="Ex.: Dosimetria de ruído no setor de produção" />
          <Campo id="os-resp" name="resp" rotulo="Responsável" />
          <Campo id="os-valor" name="valor" rotulo="Valor à parte (R$)" inputMode="decimal" placeholder="Em branco se já está no contrato" />
          <div className="flex items-end justify-end md:col-span-2"><Botao type="submit">Abrir ordem de serviço</Botao></div>
        </form>
      </Cartao>
      <Cartao titulo="Ordens de serviço">
        {!lista.length ? <p className="text-sm text-text/60">Nenhuma ordem de serviço ainda.</p> : (
          <ul className="divide-y divide-border">
            {lista.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div><p className="font-semibold">OS nº {s.numero} · {s.empresa.razaoSocial}</p>
                  <p className="text-sm text-text/70">{s.descricao}</p>
                  <p className="text-xs text-text/50">{s.previsto ? `Prevista para ${data(s.previsto)}` : 'Sem data'}{s.responsavel ? ` · ${s.responsavel}` : ''}{s.valorCentavos ? ` · ${reais(s.valorCentavos)}` : ''}{s.concluidoEm ? ` · concluída em ${data(s.concluidoEm)}` : ''}</p></div>
                {s.status === 'ABERTA'
                  ? <Botao variante="secundario" onClick={() => agir(async () => { const r = await comercial.concluirServico(s.id); return r.cobranca ? 'Concluída. A cobrança já está em Cobranças.' : 'Ordem de serviço concluída.'; })}>Concluir</Botao>
                  : <Etiqueta cor="bg-success/15 text-success">Concluída</Etiqueta>}
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

function AbaConfig({ config, agir }: { config: ConfigComercial; agir: Agir }) {
  return (
    <Cartao titulo="Dados da consultoria e Pix">
      <p className="mb-4 text-sm text-text/60">Esses dados saem na proposta, no contrato e no Pix das cobranças. O dinheiro cai direto na sua conta: quando receber, clique em &quot;Recebi&quot; na cobrança.</p>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={(ev) => {
        ev.preventDefault(); const d = new FormData(ev.currentTarget);
        agir(async () => { await comercial.salvarConfiguracao({ cnpj: texto(d, 'cnpj'), cidade: texto(d, 'cidade'), pixChave: texto(d, 'chave'), pixNome: texto(d, 'nome') }); return 'Dados salvos.'; });
      }}>
        <Campo id="cf-cnpj" name="cnpj" rotulo="CNPJ da consultoria" defaultValue={config.cnpj ?? ''} />
        <Campo id="cf-cidade" name="cidade" rotulo="Cidade" defaultValue={config.cidade ?? ''} placeholder="Ex.: São Paulo" />
        <Campo id="cf-chave" name="chave" rotulo="Chave Pix" defaultValue={config.pixChave ?? ''} />
        <Campo id="cf-nome" name="nome" rotulo="Nome do recebedor" defaultValue={config.pixNome ?? ''} placeholder="Como aparece no banco" />
        <div className="flex justify-end md:col-span-2"><Botao type="submit">Salvar</Botao></div>
      </form>
    </Cartao>
  );
}
