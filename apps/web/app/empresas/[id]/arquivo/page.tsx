'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import { AcessoArquivo, arquivo, buscarEmpresa, Empresa, ItemArquivo, salvarArquivo } from '@/lib/api';
import { ehEmpresa } from '@/lib/sessao';

const CATEGORIAS = ['Programas e laudos', 'Funcionários', 'Saúde ocupacional', 'CIPA', 'Operação diária', 'Treinamentos', 'Emergência', 'Terceirizadas', 'Contratos e propostas', 'Outros'];
const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
const tamanho = (b: number) => (b > 1_000_000 ? `${(b / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(b / 1000))} KB`);

// O trecho vem com «palavra» marcando onde a busca achou.
function Trecho({ texto }: { texto: string }) {
  const partes = texto.split(/(«[^»]*»)/g);
  return <p className="mt-1 rounded bg-background px-2 py-1 text-xs text-text/70">…{partes.map((p, i) => (p.startsWith('«') ? <mark key={i} className="bg-warning/30 text-text">{p.slice(1, -1)}</mark> : p))}…</p>;
}

function Item({ a, empresaId, cliente, agir, abrir }: { a: ItemArquivo; empresaId: string; cliente: boolean; agir: (f: () => Promise<string>) => void; abrir: (id: string, nome: string, baixar?: boolean) => void }) {
  const [painel, setPainel] = useState<'versoes' | 'acessos' | null>(null);
  const [acessos, setAcessos] = useState<AcessoArquivo[] | null>(null);
  const novaVersao = useRef<HTMLInputElement>(null);

  async function verAcessos() {
    if (painel === 'acessos') return setPainel(null);
    setPainel('acessos');
    try { setAcessos(await arquivo.acessos(empresaId, a.id)); } catch (e) { agir(async () => { throw e; }); }
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{a.titulo} <span className="text-sm font-normal text-text/50">· versão {a.versao}</span></p>
          <p className="text-xs text-text/60">
            {a.origem === 'GERADO' ? 'Gerado pelo sistema' : 'Enviado'} por {a.criadoPorNome} em {dataHora(a.criadoEm)} · {tamanho(a.tamanho)}
            {a.descricao ? ` · ${a.descricao}` : ''}
          </p>
          {a.trecho && <Trecho texto={a.trecho} />}
          {a.achadoNaVersao && <p className="mt-1 text-xs text-warning">Achado na versão {a.achadoNaVersao}, que não é a atual.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button className="text-primary underline" onClick={() => abrir(a.id, a.nomeArquivo)}>Abrir</button>
          <button className="text-primary underline" onClick={() => abrir(a.id, a.nomeArquivo, true)}>Baixar</button>
          {a.mime === 'application/pdf' && !a.titulo.endsWith('(assinado)') && <Link className="text-primary underline" href={`/empresas/${empresaId}/assinaturas?arquivo=${a.id}`}>Pedir assinatura</Link>}
          {a.anteriores.length > 0 && <button className="text-primary underline" onClick={() => setPainel(painel === 'versoes' ? null : 'versoes')}>Versões anteriores ({a.anteriores.length})</button>}
          <button className="text-primary underline" onClick={verAcessos}>Quem abriu ({a.visualizacoes})</button>
          {a.origem === 'ENVIADO' && (<>
            <button className="text-primary underline" onClick={() => novaVersao.current?.click()}>Nova versão</button>
            <input ref={novaVersao} type="file" aria-label={`Nova versão de ${a.titulo}`} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) agir(async () => { await arquivo.enviar(empresaId, f, { versaoDe: a.id }); return `Versão ${a.versao + 1} de "${a.titulo}" guardada.`; }); e.target.value = ''; }} />
            {!cliente && <button className="text-danger underline" onClick={() => confirm(`Apagar a versão ${a.versao} de "${a.titulo}"?`) && agir(async () => { await arquivo.remover(empresaId, a.id); return 'Documento apagado.'; })}>Apagar</button>}
          </>)}
        </div>
      </div>
      {painel === 'versoes' && (
        <ul className="mt-2 space-y-1 rounded-card border border-border bg-background p-3 text-sm">
          {a.anteriores.map((v) => (
            <li key={v.id} className="flex flex-wrap justify-between gap-2">
              <span>Versão {v.versao} · {dataHora(v.criadoEm)} · {v.criadoPorNome}</span>
              <button className="text-primary underline" onClick={() => abrir(v.id, v.nomeArquivo)}>Abrir</button>
            </li>
          ))}
        </ul>
      )}
      {painel === 'acessos' && (
        <div className="mt-2 rounded-card border border-border bg-background p-3 text-sm">
          {!acessos ? 'Carregando…' : !acessos.length ? <p className="text-text/60">Ninguém abriu ainda.</p> : (
            <ul className="space-y-1">
              {acessos.map((x) => <li key={x.id}>{x.usuarioNome} <span className="text-text/50">({x.papel === 'EMPRESA' ? 'empresa cliente' : 'consultoria'})</span> abriu a versão {x.arquivo.versao} em {dataHora(x.em)}</li>)}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

export default function ArquivoPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [cliente, setCliente] = useState(false);
  const [lista, setLista] = useState<ItemArquivo[]>([]);
  const [busca, setBusca] = useState('');
  const [buscado, setBuscado] = useState('');
  const [categoria, setCategoria] = useState('');
  const [chave, setChave] = useState(0);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

  const carregar = useCallback(async (termo: string) => {
    try { const [e, l] = await Promise.all([buscarEmpresa(empresaId), arquivo.listar(empresaId, termo)]); setEmpresa(e); setLista(l); setBuscado(termo); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }, [empresaId]);
  useEffect(() => { setCliente(ehEmpresa()); carregar(''); }, [carregar]);

  const agir = async (f: () => Promise<string>) => {
    try { setAviso({ tipo: 'ok', texto: await f() }); setChave((k) => k + 1); await carregar(buscado); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  };
  async function abrir(id: string, nome: string, baixar = false) {
    try {
      const blob = await arquivo.baixar(empresaId, id);
      if (baixar || blob.type !== 'application/pdf') salvarArquivo(blob, nome);
      else { const url = URL.createObjectURL(blob); window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 60_000); }
      await carregar(buscado);
    } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }

  if (!empresa) return <main className="p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando…'}</main>;
  const filtrada = categoria ? lista.filter((a) => a.categoria === categoria) : lista;
  const cats = CATEGORIAS.filter((c) => lista.some((a) => a.categoria === c)).concat([...new Set(lista.map((a) => a.categoria))].filter((c) => !CATEGORIAS.includes(c)));

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div>
        <Link href={`/?empresa=${empresaId}`} className="text-sm text-primary">← Voltar ao painel</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Arquivo de documentos</h1>
        <p className="text-text/60">{empresa.razaoSocial} · todo PDF gerado no sistema fica guardado aqui, com as versões e quem abriu · <Link href={`/empresas/${empresaId}/assinaturas`} className="text-primary hover:underline">Assinaturas →</Link></p>
      </div>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); carregar(busca.trim()); }}>
        <input type="search" aria-label="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar dentro dos documentos, ex.: ruído, NR-35, Maria"
          className="min-w-0 flex-1 rounded-card border border-border bg-white px-4 py-2.5" />
        <Botao type="submit">Buscar</Botao>
        {buscado && <Botao type="button" variante="secundario" onClick={() => { setBusca(''); carregar(''); }}>Limpar</Botao>}
      </form>

      {cats.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {['', ...cats].map((c) => (
            <button key={c || 'todas'} onClick={() => setCategoria(c)} className={`rounded-full px-3 py-1 text-sm ${categoria === c ? 'bg-primary text-white' : 'border border-border bg-white'}`}>
              {c || 'Todas'} <span className="opacity-70">{c ? lista.filter((a) => a.categoria === c).length : lista.length}</span>
            </button>
          ))}
        </div>
      )}

      <Cartao titulo={buscado ? `${filtrada.length} documento(s) com "${buscado}"` : 'Documentos'}>
        {!filtrada.length ? <p className="text-sm text-text/60">{buscado ? 'Nada encontrado. Tente outra palavra.' : 'Nenhum documento ainda. Gere um PGR ou envie um arquivo abaixo.'}</p> : (
          <ul className="divide-y divide-border">
            {filtrada.map((a) => <Item key={a.id} a={a} empresaId={empresaId} cliente={cliente} agir={agir} abrir={abrir} />)}
          </ul>
        )}
      </Cartao>

      <Cartao titulo="Enviar documento">
        <p className="mb-4 text-sm text-text/60">Para guardar o que veio de fora: PGR assinado, laudo de outra empresa, documento da terceirizada, foto da inspeção. Aceita PDF, imagem, Word e Excel até 20 MB. Se o PDF tiver texto, ele entra na busca.</p>
        <form key={chave} className="grid gap-4 md:grid-cols-3" onSubmit={(ev) => {
          ev.preventDefault(); const d = new FormData(ev.currentTarget); const f = d.get('arquivo');
          agir(async () => {
            if (!(f instanceof File) || !f.size) throw new Error('Escolha o arquivo.');
            await arquivo.enviar(empresaId, f, { titulo: String(d.get('titulo') ?? ''), categoria: String(d.get('categoria') ?? ''), descricao: String(d.get('descricao') ?? '') });
            return 'Documento guardado.';
          });
        }}>
          <Campo id="ar-titulo" name="titulo" rotulo="Nome do documento" required placeholder="Ex.: PGR assinado 2026" />
          <Selecao id="ar-cat" name="categoria" rotulo="Pasta" defaultValue="Outros">{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</Selecao>
          <Campo id="ar-desc" name="descricao" rotulo="Observação" />
          <div className="md:col-span-2">
            <label htmlFor="ar-arquivo" className="mb-1.5 block text-sm font-semibold">Arquivo</label>
            <input id="ar-arquivo" name="arquivo" type="file" required accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx" className="block text-sm" />
          </div>
          <div className="flex items-end justify-end"><Botao type="submit">Guardar</Botao></div>
        </form>
      </Cartao>
    </main>
  );
}
