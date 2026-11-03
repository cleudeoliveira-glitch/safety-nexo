'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Aviso, Botao, Cartao } from '@/components/ui';
import { buscarEmpresa, buscarHistorico, Empresa, ItemHistorico } from '@/lib/api';

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const dia = (iso: string) => { const t = new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1); };

export default function HistoricoPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [itens, setItens] = useState<ItemHistorico[]>([]);
  const [fim, setFim] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([buscarEmpresa(empresaId), buscarHistorico(empresaId)])
      .then(([e, h]) => { setEmpresa(e); setItens(h); setFim(h.length < 100); })
      .catch((e) => setErro(e.message));
  }, [empresaId]);

  async function mais() {
    try {
      const h = await buscarHistorico(empresaId, itens[itens.length - 1]?.createdAt);
      setItens([...itens, ...h]); setFim(h.length < 100);
    } catch (e) { setErro((e as Error).message); }
  }

  if (!empresa) return <main className="p-10">{erro ? <Aviso tipo="erro">{erro}</Aviso> : 'Carregando…'}</main>;

  // Agrupa por dia para ficar fácil de ler.
  const porDia = itens.reduce<[string, ItemHistorico[]][]>((acc, i) => {
    const d = dia(i.createdAt);
    if (acc.length && acc[acc.length - 1][0] === d) acc[acc.length - 1][1].push(i); else acc.push([d, [i]]);
    return acc;
  }, []);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <div>
        <Link href={`/?empresa=${empresaId}`} className="text-sm text-primary">← Voltar ao painel</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Histórico de alterações</h1>
        <p className="text-text/60">{empresa.razaoSocial}</p>
      </div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <Cartao titulo="Quem fez o quê">
        <p className="mb-4 text-sm text-text/60">Cada alteração e cada documento gerado fica registrado aqui, com a pessoa e a hora. Não dá para apagar.</p>
        {!itens.length ? <p className="text-sm text-text/60">Nada registrado ainda.</p> : porDia.map(([d, lista]) => (
          <div key={d} className="mb-5">
            <h3 className="mb-2 text-sm font-semibold text-text/70">{d}</h3>
            <ul className="divide-y divide-border rounded-card border border-border">
              {lista.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                  <span>{i.acao}</span>
                  <span className="text-text/60">{i.usuarioNome}{i.papel === 'EMPRESA' ? ' (empresa)' : ''} · {quando(i.createdAt).split(' ')[1] ?? quando(i.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!fim && <Botao variante="secundario" onClick={mais}>Ver mais antigos</Botao>}
      </Cartao>
    </main>
  );
}
