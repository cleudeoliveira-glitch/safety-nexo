'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao } from '@/components/ui';
import { AvisoNorma, BuscaNormas, normas, NovoAvisoNorma } from '@/lib/api';
import { AbasAdm } from '@/components/AbasAdm';

const data = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const caixa = 'w-full rounded-card border border-border bg-background px-3 py-2 text-sm';
const lista = (s: string) => s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
type Linha = AvisoNorma & { _count: { lidos: number } };

// Painel ADM: a dona da plataforma escreve os avisos de mudança nas normas para todas as consultorias.
export default function AdminNormasPage() {
  const [itens, setItens] = useState<Linha[] | null>(null);
  const [editando, setEditando] = useState<Linha | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  const [chave, setChave] = useState(0);
  const [busca, setBusca] = useState<{ ultima: BuscaNormas | null; iaLigada: boolean } | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);

  const carregar = () => normas.adminListar().then(setItens).catch((e: Error) => setAviso({ tipo: 'erro', texto: e.message }));
  useEffect(() => { carregar(); normas.adminBusca().then(setBusca).catch(() => undefined); }, []);

  const rascunhos = (itens ?? []).filter((a) => a.status === 'RASCUNHO');
  const publicados = (itens ?? []).filter((a) => a.status !== 'RASCUNHO');

  async function buscarAgora() {
    setBuscando(true); setAviso(null);
    try {
      const r = await normas.adminBuscarAgora();
      setBusca((b) => ({ iaLigada: b?.iaLigada ?? false, ultima: r }));
      setAviso({ tipo: r.erros.length ? 'erro' : 'ok', texto: r.novos.length ? `Achei ${r.novos.length} mudança(s) nova(s). Estão em "Para conferir".` : r.erros.length ? `A busca teve problema: ${r.erros[0]}` : 'Nenhuma mudança nova nas NRs no Diário Oficial.' });
      await carregar();
    } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); } finally { setBuscando(false); }
  }

  async function publicar(a: Linha) {
    try { await normas.adminPublicar(a.id); setAviso({ tipo: 'ok', texto: `"${a.titulo}" publicado para as consultorias.` }); await carregar(); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }

  async function descartar(a: Linha) {
    if (!window.confirm(`Descartar "${a.titulo}"? Ele não vai para as consultorias e a busca não traz de novo.`)) return;
    try { await normas.adminDescartar(a.id); await carregar(); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }

  async function salvar(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const d = new FormData(ev.currentTarget);
    const v = (k: string) => String(d.get(k) ?? '').trim();
    const num = (k: string) => (v(k) ? Number(v(k)) : undefined);
    const dados: NovoAvisoNorma = {
      titulo: v('titulo'), normas: lista(v('normas')), resumo: v('resumo'), oQueFazer: v('oQueFazer') || undefined, linkOficial: v('linkOficial') || undefined,
      publicadaEm: v('publicadaEm') || undefined, vigenciaEm: v('vigenciaEm') || undefined, cnaePrefixos: lista(v('cnaePrefixos')),
      grauRiscoMin: num('grauRiscoMin'), funcionariosMin: num('funcionariosMin'),
    };
    try {
      if (editando) await normas.adminAtualizar(editando.id, dados); else await normas.adminCriar(dados);
      const publicarAoSalvar = (ev.nativeEvent as SubmitEvent).submitter?.getAttribute('data-publicar') === 'sim';
      const publicou = !!editando && editando.status === 'RASCUNHO' && publicarAoSalvar;
      if (publicou) await normas.adminPublicar(editando.id);
      setAviso({ tipo: 'ok', texto: publicou ? 'Ajustado e publicado para as consultorias.' : editando ? (editando.status === 'RASCUNHO' ? 'Rascunho salvo. Ainda não foi para as consultorias.' : 'Aviso atualizado.') : 'Aviso publicado para todas as consultorias.' });
      setEditando(null); setChave((k) => k + 1); await carregar();
    } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }

  async function remover(a: Linha) {
    if (!window.confirm(`Apagar o aviso "${a.titulo}"? Ele some para todas as consultorias.`)) return;
    try { await normas.adminRemover(a.id); await carregar(); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }

  const e = editando;
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-10">
      <div>
        <AbasAdm />
        <h1 className="mt-5 text-2xl font-bold text-primary">Avisos de mudança nas normas</h1>
        <p className="mt-1 text-sm text-text/70">O que você publicar aqui aparece para todas as consultorias, com a lista das empresas de cada uma que são afetadas, e vai no e-mail da semana.</p>
      </div>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      <Cartao
        titulo={`Para conferir${rascunhos.length ? ` (${rascunhos.length})` : ''}`}
        acao={<Botao variante="secundario" onClick={buscarAgora} disabled={buscando}>{buscando ? 'Procurando no Diário Oficial…' : 'Procurar agora'}</Botao>}
      >
        <p className="mb-3 text-sm text-text/70">
          Todo dia de manhã o sistema procura no Diário Oficial da União as portarias do Ministério do Trabalho que mudam alguma NR. O que ele acha fica aqui, já explicado e com as empresas afetadas. Nada vai para as consultorias até você tocar em <strong>Publicar</strong>.
        </p>
        {busca?.ultima && (
          <p className="mb-3 text-xs text-text/60">
            Última busca: {quando(busca.ultima.em)} · {busca.ultima.mudancas} ato(s) mexendo em NR · {busca.ultima.novos.length} novo(s)
            {busca.ultima.erros.length ? <span className="text-danger"> · {busca.ultima.erros.length} problema(s): {busca.ultima.erros[0]}</span> : null}
          </p>
        )}
        {busca && !busca.iaLigada && <p className="mb-3 text-xs text-text/60">A explicação está sendo montada com o próprio texto oficial (do que trata e os primeiros artigos). Com a IA ligada, ela vem reescrita em linguagem de conversa, com o antes e o depois.</p>}
        {itens === null ? <p className="text-sm text-text/60">Carregando…</p> : rascunhos.length === 0 ? <p className="text-sm text-text/60">Nada para conferir agora.</p> : (
          <ul className="space-y-4">
            {rascunhos.map((a) => (
              <li key={a.id} className="rounded-card border border-border p-4 text-sm">
                <p className="font-semibold">{a.titulo}</p>
                <p className="mt-0.5 text-xs text-text/60">
                  {a.origem === 'AUTOMATICO' ? 'Achado no Diário Oficial' : 'Rascunho'} · publicada em {data(a.publicadaEm)} · vale em {data(a.vigenciaEm)}
                  {' · '}{a.cnaePrefixos.length ? `afeta CNAE ${a.cnaePrefixos.join(', ')}` : 'vale para todas as empresas'}
                </p>
                <p className="mt-2 whitespace-pre-line">{a.resumo}</p>
                {a.oQueFazer && <p className="mt-2"><strong>O que fazer:</strong> {a.oQueFazer}</p>}
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  {a.linkOficial && <a href={a.linkOficial} target="_blank" rel="noreferrer" className="text-primary underline">Abrir no Diário Oficial</a>}
                  {a.textoOficial && <button type="button" className="text-primary underline" onClick={() => setAberto(aberto === a.id ? null : a.id)}>{aberto === a.id ? 'Esconder texto oficial' : 'Ver texto oficial aqui'}</button>}
                </div>
                {aberto === a.id && a.textoOficial && <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-card bg-background p-3 font-sans text-xs">{a.textoOficial}</pre>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Botao onClick={() => publicar(a)}>Publicar</Botao>
                  <Botao variante="secundario" onClick={() => { setEditando(a); window.scrollTo(0, document.getElementById('form-aviso')?.offsetTop ?? 0); }}>Ajustar antes</Botao>
                  <Botao variante="secundario" onClick={() => descartar(a)}>Descartar</Botao>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
      <Cartao id="form-aviso" titulo={e ? (e.status === 'RASCUNHO' ? 'Ajustar rascunho' : 'Editar aviso') : 'Novo aviso'}>
        <form key={`${chave}-${e?.id ?? 'novo'}`} className="space-y-3" onSubmit={salvar}>
          <div className="grid gap-3 md:grid-cols-2">
            <Campo id="n-titulo" name="titulo" rotulo="Título" required defaultValue={e?.titulo} placeholder="Ex.: NR-01: riscos psicossociais no PGR" className="md:col-span-2" />
            <Campo id="n-normas" name="normas" rotulo="Normas" required defaultValue={e?.normas.join(', ')} placeholder="Ex.: NR-01, NR-17" />
            <Campo id="n-link" name="linkOficial" rotulo="Link do texto oficial" type="url" defaultValue={e?.linkOficial ?? ''} placeholder="https://www.gov.br/..." />
            <Campo id="n-pub" name="publicadaEm" rotulo="Data da portaria" type="date" defaultValue={e?.publicadaEm?.slice(0, 10)} />
            <Campo id="n-vig" name="vigenciaEm" rotulo="Começa a valer em" type="date" defaultValue={e?.vigenciaEm?.slice(0, 10)} />
          </div>
          <div>
            <label htmlFor="n-resumo" className="mb-1.5 block text-sm font-semibold">O que mudou (em linguagem simples)</label>
            <textarea id="n-resumo" name="resumo" required rows={4} className={caixa} defaultValue={e?.resumo} />
          </div>
          <div>
            <label htmlFor="n-fazer" className="mb-1.5 block text-sm font-semibold">O que a consultora precisa fazer</label>
            <textarea id="n-fazer" name="oQueFazer" rows={3} className={caixa} defaultValue={e?.oQueFazer ?? ''} placeholder="Ex.: Revisar o inventário de riscos do PGR e incluir a avaliação psicossocial." />
          </div>
          <p className="pt-2 text-sm font-semibold">Quem é afetado <span className="font-normal text-text/60">(deixe em branco para valer para todas as empresas)</span></p>
          <div className="grid gap-3 md:grid-cols-3">
            <Campo id="n-cnae" name="cnaePrefixos" rotulo="Começo do CNAE" defaultValue={e?.cnaePrefixos.join(', ')} placeholder="Ex.: 41, 42, 43" dica="Construção = 41, 42, 43" />
            <Campo id="n-gr" name="grauRiscoMin" rotulo="Grau de risco a partir de" type="number" min={1} max={4} defaultValue={e?.grauRiscoMin ?? ''} />
            <Campo id="n-func" name="funcionariosMin" rotulo="Funcionários a partir de" type="number" min={1} defaultValue={e?.funcionariosMin ?? ''} />
          </div>
          <div className="flex justify-end gap-2">
            {e && <Botao type="button" variante="secundario" onClick={() => setEditando(null)}>Cancelar</Botao>}
            {e?.status === 'RASCUNHO' ? (
              <>
                <Botao type="submit" variante="secundario">Salvar rascunho</Botao>
                <Botao type="submit" data-publicar="sim">Salvar e publicar</Botao>
              </>
            ) : <Botao type="submit">{e ? 'Salvar' : 'Publicar aviso'}</Botao>}
          </div>
        </form>
      </Cartao>
      <Cartao titulo="Avisos publicados">
        {itens === null ? <p className="text-sm text-text/60">Carregando…</p> : publicados.length === 0 ? <p className="text-sm text-text/60">Nenhum aviso ainda.</p> : (
          <ul className="divide-y divide-border text-sm">
            {publicados.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span><strong>{a.titulo}</strong>{a.origem === 'AUTOMATICO' ? ' · do Diário Oficial' : ''} · {a.normas.join(', ')} · vale em {data(a.vigenciaEm)} · lido por {a._count.lidos} consultoria(s)</span>
                <span className="flex gap-2"><Botao variante="secundario" onClick={() => { setEditando(a); window.scrollTo(0, 0); }}>Editar</Botao><Botao variante="secundario" onClick={() => remover(a)}>Apagar</Botao></span>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </main>
  );
}
