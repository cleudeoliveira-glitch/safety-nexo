'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao } from '@/components/ui';
import { AvisoNorma, normas, NovoAvisoNorma } from '@/lib/api';

const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const caixa = 'w-full rounded-card border border-border bg-background px-3 py-2 text-sm';
const lista = (s: string) => s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
type Linha = AvisoNorma & { _count: { lidos: number } };

// Painel ADM: a dona da plataforma escreve os avisos de mudança nas normas para todas as consultorias.
export default function AdminNormasPage() {
  const [itens, setItens] = useState<Linha[] | null>(null);
  const [editando, setEditando] = useState<Linha | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  const [chave, setChave] = useState(0);

  const carregar = () => normas.adminListar().then(setItens).catch((e: Error) => setAviso({ tipo: 'erro', texto: e.message }));
  useEffect(() => { carregar(); }, []);

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
      setAviso({ tipo: 'ok', texto: editando ? 'Aviso atualizado.' : 'Aviso publicado para todas as consultorias.' });
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
        <Link href="/admin" className="text-sm text-primary underline">← Painel ADM</Link>
        <h1 className="mt-1 text-2xl font-bold text-primary">Avisos de mudança nas normas</h1>
        <p className="mt-1 text-sm text-text/70">O que você publicar aqui aparece para todas as consultorias, com a lista das empresas de cada uma que são afetadas, e vai no e-mail da semana.</p>
      </div>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      <Cartao titulo={e ? 'Editar aviso' : 'Novo aviso'}>
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
            <Botao type="submit">{e ? 'Salvar' : 'Publicar aviso'}</Botao>
          </div>
        </form>
      </Cartao>
      <Cartao titulo="Avisos publicados">
        {itens === null ? <p className="text-sm text-text/60">Carregando…</p> : itens.length === 0 ? <p className="text-sm text-text/60">Nenhum aviso ainda.</p> : (
          <ul className="divide-y divide-border text-sm">
            {itens.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span><strong>{a.titulo}</strong> · {a.normas.join(', ')} · vale em {data(a.vigenciaEm)} · lido por {a._count.lidos} consultoria(s)</span>
                <span className="flex gap-2"><Botao variante="secundario" onClick={() => { setEditando(a); window.scrollTo(0, 0); }}>Editar</Botao><Botao variante="secundario" onClick={() => remover(a)}>Apagar</Botao></span>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </main>
  );
}
