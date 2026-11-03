'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Localizacao, pedirLocalizacao, QuadroAssinatura } from '@/components/QuadroAssinatura';
import { Aviso, Botao } from '@/components/ui';
import { gerarPdfOperacao, gerarPdfTurma, listaToque, ListaToque, PessoaLista, salvarArquivo, TipoListaToque } from '@/lib/api';
import { fotografar } from '@/lib/rosto';
import { guardarCaptura, listarCapturas } from '@/lib/rosto-offline';

// A lista fica guardada no aparelho: abre e recebe assinaturas mesmo sem internet.
const PREFIXO = 'safety-nexo:lista:';
export type ListaGuardada = { empresaId: string; tipo: TipoListaToque; refId: string; lista: ListaToque; salvoEm: string };
const guardarLista = (g: ListaGuardada) => { try { localStorage.setItem(`${PREFIXO}${g.tipo}:${g.refId}`, JSON.stringify(g)); } catch { /* sem espaço: segue sem guardar */ } };
const lerLista = (tipo: string, refId: string): ListaGuardada | null => { try { const b = localStorage.getItem(`${PREFIXO}${tipo}:${refId}`); return b ? JSON.parse(b) : null; } catch { return null; } };

const iniciais = (nome: string) => nome.split(/\s+/).filter(Boolean).map((p) => p[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase();
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function Rosto({ p, grande }: { p: Pick<PessoaLista, 'nome' | 'foto'>; grande?: boolean }) {
  const t = grande ? 'h-24 w-24 text-3xl' : 'h-16 w-16 text-xl';
  // eslint-disable-next-line @next/next/no-img-element
  return p.foto ? <img src={p.foto} alt="" className={`${t} shrink-0 rounded-full object-cover`} /> : <span aria-hidden className={`${t} flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary`}>{iniciais(p.nome)}</span>;
}

// Lista de presença para assinar com o dedo: o tablet ou celular passa de mão em mão.
export default function ListaToquePage({ params }: { params: { id: string; tipo: string; refId: string } }) {
  const empresaId = params.id;
  const tipo = (params.tipo === 'turmas' ? 'turmas' : 'dds') as TipoListaToque;
  const voltar = tipo === 'dds' ? `/empresas/${empresaId}/operacao` : `/empresas/${empresaId}/treinamentos`;
  const [lista, setLista] = useState<ListaToque | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok' | 'info'; texto: string } | null>(null);
  const [aberta, setAberta] = useState<PessoaLista | null>(null);
  const [pendentes, setPendentes] = useState<Set<string>>(new Set());
  const [semRede, setSemRede] = useState(false);
  const local = useRef<Localizacao>(null);

  // Junta o que veio do sistema (ou do aparelho) com as assinaturas guardadas esperando internet.
  const juntar = useCallback(async (l: ListaToque) => {
    const guardadas = (await listarCapturas()).filter((c) => c.tipo === 'TOQUE' && c.refId === params.refId && c.toque);
    setPendentes(new Set(guardadas.map((c) => c.toque!.colaboradorId)));
    const pessoas = l.pessoas.map((p) => { const g = guardadas.find((c) => c.toque!.colaboradorId === p.colaboradorId); return g && !p.assinadoEm ? { ...p, assinadoEm: g.criadoEm, testemunha: g.dados.aRogo ? l.responsavel : null } : p; });
    return { ...l, pessoas, assinadas: pessoas.filter((p) => p.assinadoEm).length };
  }, [params.refId]);

  const carregar = useCallback(async () => {
    try {
      const l = await listaToque.ver(empresaId, tipo, params.refId);
      guardarLista({ empresaId, tipo, refId: params.refId, lista: l, salvoEm: new Date().toISOString() });
      setSemRede(false); setLista(await juntar(l));
    } catch (e) {
      const g = lerLista(tipo, params.refId);
      if (e instanceof TypeError && g) { setSemRede(true); setLista(await juntar(g.lista)); return; }
      setAviso({ tipo: 'erro', texto: e instanceof TypeError ? 'Sem internet, e esta lista ainda não foi aberta neste aparelho. Abra uma vez com internet.' : (e as Error).message });
    }
  }, [empresaId, tipo, params.refId, juntar]);
  useEffect(() => {
    carregar(); pedirLocalizacao().then((l) => { local.current = l; });
    const voltou = () => carregar();
    const caiu = () => setSemRede(true);
    window.addEventListener('capturas-enviadas', voltou); window.addEventListener('offline', caiu);
    return () => { window.removeEventListener('capturas-enviadas', voltou); window.removeEventListener('offline', caiu); };
  }, [carregar]);

  const baixar = async (doc: 'lista' | 'certificados') => {
    try {
      const pdf = tipo === 'dds' ? await gerarPdfOperacao(empresaId, 'dds', params.refId) : await gerarPdfTurma(empresaId, params.refId, doc);
      salvarArquivo(pdf, `${doc === 'lista' ? 'Lista-presenca' : 'Certificados'}-${lista?.titulo ?? ''}.pdf`);
    } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  };

  if (!lista) return <main className="p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando…'}</main>;
  const faltam = lista.pessoas.filter((p) => !p.assinadoEm);

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-8">
      <div>
        <Link href={voltar} className="text-sm text-primary">← Voltar</Link>
        <h1 className="mt-3 text-2xl font-semibold text-primary md:text-3xl">{lista.titulo}</h1>
        <p className="text-text/60">{lista.subtitulo} · {tipo === 'dds' ? 'Ministrante' : 'Instrutor(a)'}: {lista.responsavel}</p>
      </div>
      {semRede && <Aviso tipo="info">Sem internet: pode seguir assinando. As assinaturas ficam guardadas neste aparelho e vão sozinhas quando a internet voltar.</Aviso>}
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <div className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-white p-4">
        <p className="text-lg"><strong>{lista.assinadas}</strong> de {lista.pessoas.length} assinaram{pendentes.size > 0 && <span className="ml-2 text-sm text-warning">({pendentes.size} esperando internet)</span>}</p>
        <div className="ml-auto flex flex-wrap gap-2">
          {lista.foraDaLista > 0 && !semRede && <Botao variante="secundario" onClick={async () => { try { setLista(await listaToque.marcarTodos(empresaId, tipo, params.refId)); setAviso({ tipo: 'ok', texto: 'Todos os funcionários estão na lista. Quem não assinar sai como falta no PDF.' }); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); } }}>Marcar todos ({lista.foraDaLista} fora)</Botao>}
          {!semRede && <Botao variante="secundario" onClick={() => baixar('lista')}>Baixar lista em PDF</Botao>}
          {tipo === 'turmas' && !semRede && <Botao variante="secundario" onClick={() => baixar('certificados')}>Certificados</Botao>}
        </div>
      </div>

      {lista.pessoas.length === 0 ? <Aviso tipo="info">Ninguém na lista ainda. Toque em &quot;Marcar todos&quot; ou inclua as pessoas no {tipo === 'dds' ? 'DDS' : 'treinamento'}.</Aviso> : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.pessoas.map((p) => (
            <li key={p.colaboradorId} className={`flex flex-col gap-3 rounded-card border bg-white p-4 ${p.assinadoEm ? 'border-success/50' : 'border-border'}`}>
              <div className="flex items-center gap-3">
                <Rosto p={p} />
                <div className="min-w-0"><p className="truncate text-lg font-semibold">{p.nome}</p><p className="truncate text-sm text-text/60">{p.cargo}{p.cpf ? ` · ${p.cpf}` : ''}</p></div>
              </div>
              {p.assinadoEm
                ? <p className="rounded-card bg-success/10 px-3 py-3 text-center font-semibold text-success">✓ Assinou às {hora(p.assinadoEm)}{p.testemunha ? ' (a rogo)' : ''}{pendentes.has(p.colaboradorId) && <span className="block text-xs font-normal text-warning">guardada no aparelho, envia quando a internet voltar</span>}</p>
                : <button className="rounded-card bg-primary px-3 py-4 text-lg font-bold tracking-wide text-white active:scale-[0.98]" onClick={() => setAberta(p)}>TOCAR PARA ASSINAR</button>}
            </li>
          ))}
        </ul>
      )}

      {aberta && (
        <Assinar pessoa={aberta} responsavel={lista.responsavel} onFechar={() => setAberta(null)}
          onAssinar={async (d) => {
            const dados = { ...d, ...(local.current ?? {}) };
            let nova: ListaToque;
            try {
              if (!navigator.onLine) throw new TypeError('sem internet');
              nova = await juntar(await listaToque.assinar(empresaId, tipo, params.refId, aberta.colaboradorId, dados));
              guardarLista({ empresaId, tipo, refId: params.refId, lista: nova, salvoEm: new Date().toISOString() });
            } catch (e) {
              if (!(e instanceof TypeError)) throw e;
              await guardarCaptura({ tipo: 'TOQUE', empresaId, refId: params.refId, titulo: `${aberta.nome} · ${lista.titulo}`, dados, toque: { lista: tipo, colaboradorId: aberta.colaboradorId } });
              setSemRede(true);
              nova = await juntar(lista);
            }
            setLista(nova);
            const proxima = nova.pessoas.find((x) => !x.assinadoEm);
            setAviso({ tipo: 'ok', texto: `${aberta.nome} assinou.${proxima ? ` Passe para ${proxima.nome}.` : ' Todos assinaram.'}` });
            setAberta(null);
          }} />
      )}
      {faltam.length === 0 && lista.pessoas.length > 0 && <Aviso tipo="ok">Lista completa. Baixe o PDF: ele sai com a assinatura, a hora e o local de cada um.</Aviso>}
    </main>
  );
}

function Assinar({ pessoa, responsavel, onAssinar, onFechar }: { pessoa: PessoaLista; responsavel: string; onAssinar: (d: { imagem: string; foto?: string; aRogo?: boolean }) => Promise<void>; onFechar: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [imagem, setImagem] = useState<string | null>(null);
  const [aRogo, setARogo] = useState(false);
  const [camera, setCamera] = useState<'abrindo' | 'ok' | 'sem'>('abrindo');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Foto automática na hora da assinatura (câmera da frente). Sem câmera, a assinatura vale sem foto.
  useEffect(() => {
    let fluxo: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user', width: { ideal: 480 } }, audio: false })
      .then(async (f) => { fluxo = f; if (video.current) { video.current.srcObject = f; await video.current.play(); setCamera('ok'); } })
      .catch(() => setCamera('sem'));
    return () => fluxo?.getTracks().forEach((t) => t.stop());
  }, []);

  async function confirmar() {
    if (!imagem) { setErro('Faça um X ou a assinatura no quadro.'); return; }
    setEnviando(true); setErro('');
    try {
      const foto = camera === 'ok' && video.current?.videoWidth ? fotografar(video.current, 240) : undefined;
      await onAssinar({ imagem, ...(foto ? { foto } : {}), ...(aRogo ? { aRogo: true } : {}) });
    } catch (e) { setErro((e as Error).message); setEnviando(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Assinatura de ${pessoa.nome}`}>
      <div className="max-h-full w-full max-w-xl overflow-auto rounded-t-card bg-white p-5 shadow-xl sm:rounded-card">
        <div className="flex items-center gap-4">
          <Rosto p={pessoa} grande />
          <div className="min-w-0 flex-1"><p className="text-xl font-semibold">{pessoa.nome}</p><p className="text-sm text-text/60">{pessoa.cargo}{pessoa.cpf ? ` · CPF ${pessoa.cpf}` : ''}</p></div>
          <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-card bg-black/80">
            <video ref={video} className="h-full w-full -scale-x-100 object-cover" muted playsInline />
            {camera !== 'ok' && <span className="absolute inset-0 flex items-center justify-center p-1 text-center text-[10px] text-white">{camera === 'sem' ? 'sem câmera' : 'abrindo…'}</span>}
          </div>
        </div>
        <p className="mt-2 text-xs text-text/60">Confira se é a pessoa certa. A foto é tirada sozinha quando você confirmar.</p>
        <div className="mt-4"><QuadroAssinatura rotulo="Faça um X ou assine com o dedo" onPronto={setImagem} /></div>
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={aRogo} onChange={(e) => setARogo(e.target.checked)} />
          <span>Não sabe ler ou escrever: {responsavel} assina como testemunha.</span>
        </label>
        {erro && <p className="mt-2 text-sm text-danger" role="alert">{erro}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Botao variante="secundario" onClick={onFechar} disabled={enviando}>Cancelar</Botao>
          <Botao onClick={confirmar} disabled={enviando}>{enviando ? 'Guardando…' : 'Confirmar assinatura'}</Botao>
        </div>
      </div>
    </div>
  );
}
