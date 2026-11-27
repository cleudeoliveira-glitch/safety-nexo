'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Aviso, Botao, Cartao } from '@/components/ui';
import { apagarDaLixeira, ItemLixeira, listarLixeira, restaurarDaLixeira } from '@/lib/api';

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const diasAte = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

// Lixeira: o que a consultoria excluiu nos últimos 30 dias. Dá para restaurar ou apagar de vez.
export default function LixeiraPage() {
  const [lista, setLista] = useState<ItemLixeira[] | null>(null);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [ocupado, setOcupado] = useState('');
  const [filtro, setFiltro] = useState('');

  const carregar = () => listarLixeira().then(setLista).catch((e: Error) => setErro(e.message));
  useEffect(() => { carregar(); }, []);

  async function restaurar(i: ItemLixeira) {
    setErro(''); setOk(''); setOcupado(i.id);
    try { await restaurarDaLixeira(i.id); setOk(`Restaurado: ${i.descricao}. Ele já voltou para o lugar de antes.`); await carregar(); }
    catch (e) { setErro((e as Error).message); }
    finally { setOcupado(''); }
  }

  async function apagar(i: ItemLixeira) {
    if (!window.confirm(`Apagar de vez "${i.descricao}"?\n\nDepois disso não dá mais para restaurar.`)) return;
    setErro(''); setOk(''); setOcupado(i.id);
    try { await apagarDaLixeira(i.id); await carregar(); }
    catch (e) { setErro((e as Error).message); }
    finally { setOcupado(''); }
  }

  const termo = filtro.trim().toLowerCase();
  const visiveis = (lista ?? []).filter((i) => !termo || `${i.descricao} ${i.empresa ?? ''} ${i.quem}`.toLowerCase().includes(termo));

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <div>
        <Link href="/" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-primary">← Voltar</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Lixeira</h1>
        <p className="text-text/60">O que foi excluído nos últimos 30 dias. Depois desse prazo, sai de vez.</p>
      </div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {ok && <Aviso tipo="ok">{ok}</Aviso>}
      <Cartao titulo="Itens excluídos">
        <p className="mb-4 text-sm text-text/60">
          Ao restaurar, o item volta com tudo o que saiu junto. Por exemplo, um colaborador volta com os ASOs, as entregas de EPI e os treinamentos dele.
          Por segurança, o cadastro do rosto não fica guardado e precisa ser feito de novo.
        </p>
        {lista && lista.length > 5 && (
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Procurar por nome, empresa ou pessoa"
            className="mb-4 w-full rounded-card border border-border px-3 py-2 text-sm" />
        )}
        {!lista ? <p className="text-sm text-text/60">Carregando…</p> : !visiveis.length ? (
          <p className="text-sm text-text/60">{lista.length ? 'Nada encontrado com essa busca.' : 'A Lixeira está vazia.'}</p>
        ) : (
          <ul className="divide-y divide-border rounded-card border border-border">
            {visiveis.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{i.descricao}</p>
                  <p className="text-text/60">
                    {i.empresa ? `${i.empresa} · ` : ''}Excluído por {i.quem} em {quando(i.criadoEm)}
                    {i.itens > 1 ? ` · ${i.itens} registros juntos` : ''} · sai de vez em {diasAte(i.saiDeVezEm)} dia(s)
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Botao onClick={() => restaurar(i)} disabled={!!ocupado}>{ocupado === i.id ? 'Aguarde…' : 'Restaurar'}</Botao>
                  <button type="button" disabled={!!ocupado} onClick={() => apagar(i)} className="rounded-card px-2 py-2 text-sm font-semibold text-danger hover:underline disabled:opacity-50">Apagar de vez</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </main>
  );
}
