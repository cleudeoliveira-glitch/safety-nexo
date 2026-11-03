'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao } from '@/components/ui';
import { buscarEmpresa, Empresa, estoque, ItemEstoque, MovEstoque } from '@/lib/api';

const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-');
const TIPO = { ENTRADA: 'Entrada', SAIDA: 'Entrega', AJUSTE: 'Ajuste' } as const;

export default function AlmoxarifadoPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [aberto, setAberto] = useState<{ id: string; acao: 'entrada' | 'ajuste' | 'historico' } | null>(null);
  const [movs, setMovs] = useState<MovEstoque[]>([]);
  const [chave, setChave] = useState(0);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    try { const [e, l] = await Promise.all([buscarEmpresa(empresaId), estoque.listar(empresaId)]); setEmpresa(e); setItens(l); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }, [empresaId]);
  useEffect(() => { carregar(); }, [carregar]);

  const agir = async (f: () => Promise<string>) => {
    try { setAviso({ tipo: 'ok', texto: await f() }); setChave((k) => k + 1); setAberto(null); await carregar(); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  };
  const txt = (d: FormData, k: string) => String(d.get(k) ?? '').trim();

  if (!empresa) return <main className="p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando…'}</main>;
  const ativos = itens.filter((i) => i.ativo);
  const comprar = ativos.filter((i) => i.baixo);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div>
        <Link href={`/empresas/${empresaId}`} className="text-sm text-primary">← Voltar à empresa</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Almoxarifado de EPI</h1>
        <p className="text-text/60">{empresa.razaoSocial}. Cada entrega feita pelo almoxarifado dá baixa sozinha no saldo.</p>
      </div>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      {comprar.length > 0 && <Aviso tipo="info">Comprar: {comprar.map((i) => `${i.epi} (restam ${i.quantidade})`).join(', ')}.</Aviso>}

      <Cartao titulo="Incluir EPI no almoxarifado">
        <form key={chave} className="grid gap-4 md:grid-cols-3" onSubmit={(ev) => {
          ev.preventDefault(); const d = new FormData(ev.currentTarget);
          agir(async () => { await estoque.criar(empresaId, { epi: txt(d, 'epi'), ca: txt(d, 'ca'), ...(txt(d, 'validadeCa') ? { validadeCa: txt(d, 'validadeCa') } : {}), ...(txt(d, 'tamanho') ? { tamanho: txt(d, 'tamanho') } : {}), quantidade: Number(txt(d, 'quantidade') || 0), minimo: Number(txt(d, 'minimo') || 0) }); return 'EPI incluído no almoxarifado.'; });
        }}>
          <Campo id="est-epi" name="epi" rotulo="EPI" required placeholder="Ex.: Luva térmica" />
          <Campo id="est-ca" name="ca" rotulo="Número do CA" required placeholder="Ex.: 12345" />
          <Campo id="est-validade" name="validadeCa" type="date" rotulo="Validade do CA" />
          <Campo id="est-tamanho" name="tamanho" rotulo="Tamanho (se tiver)" placeholder="Ex.: G, 42" />
          <Campo id="est-qtd" name="quantidade" type="number" min={0} rotulo="Quantidade em estoque" required defaultValue={0} />
          <Campo id="est-min" name="minimo" type="number" min={0} rotulo="Avisar quando chegar a" defaultValue={0} dica="Quantidade mínima: abaixo disso aparece no painel para comprar." />
          <div className="flex justify-end md:col-span-3"><Botao type="submit">Incluir</Botao></div>
        </form>
      </Cartao>

      <Cartao titulo="Saldo">
        {itens.length === 0 ? <p className="text-sm text-text/60">Nenhum EPI no almoxarifado ainda.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-text/60"><th className="py-2">EPI</th><th>CA</th><th>Validade do CA</th><th className="text-right">Saldo</th><th className="text-right">Mínimo</th><th /></tr></thead>
              <tbody>
                {itens.map((i) => (
                  <tr key={i.id} className={`border-b border-border align-top ${i.ativo ? '' : 'text-text/40'}`}>
                    <td className="py-2.5"><strong>{i.epi}</strong>{i.tamanho && <span className="text-text/60"> · {i.tamanho}</span>}{!i.ativo && ' (fora de uso)'}</td>
                    <td>{i.ca}</td>
                    <td className={i.caVencido ? 'font-semibold text-danger' : ''}>{data(i.validadeCa)}{i.caVencido && ' · vencido'}</td>
                    <td className={`text-right text-base font-semibold ${i.baixo ? 'text-danger' : ''}`}>{i.quantidade}</td>
                    <td className="text-right">{i.minimo}</td>
                    <td className="py-1.5 text-right">
                      <span className="flex flex-wrap justify-end gap-2">
                        <Botao variante="secundario" onClick={() => setAberto({ id: i.id, acao: 'entrada' })}>Entrada</Botao>
                        <Botao variante="secundario" onClick={() => setAberto({ id: i.id, acao: 'ajuste' })}>Contagem</Botao>
                        <Botao variante="secundario" onClick={async () => { setMovs(await estoque.movimentos(empresaId, i.id)); setAberto({ id: i.id, acao: 'historico' }); }}>Histórico</Botao>
                      </span>
                      {aberto?.id === i.id && aberto.acao !== 'historico' && (
                        <form className="mt-2 flex flex-wrap items-end justify-end gap-2 text-left" onSubmit={(ev) => {
                          ev.preventDefault(); const d = new FormData(ev.currentTarget); const q = Number(txt(d, 'q'));
                          agir(async () => { if (aberto.acao === 'entrada') { await estoque.entrada(empresaId, i.id, q, txt(d, 'obs')); return `Entrada de ${q} ${i.epi} registrada.`; } await estoque.ajuste(empresaId, i.id, q, txt(d, 'obs')); return `Saldo de ${i.epi} ajustado para ${q}.`; });
                        }}>
                          <Campo id={`q-${i.id}`} name="q" type="number" min={0} required rotulo={aberto.acao === 'entrada' ? 'Quantas chegaram' : 'Quantas contou'} className="w-36" />
                          <Campo id={`obs-${i.id}`} name="obs" rotulo={aberto.acao === 'entrada' ? 'Nota fiscal ou obs.' : 'Motivo do ajuste'} required={aberto.acao === 'ajuste'} className="w-56" />
                          <Botao type="submit">Guardar</Botao>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>

      {aberto?.acao === 'historico' && (
        <Cartao titulo={`Histórico: ${itens.find((i) => i.id === aberto.id)?.epi ?? ''}`} acao={<button className="text-sm text-primary underline" onClick={() => setAberto(null)}>Fechar</button>}>
          <ul className="divide-y divide-border text-sm">
            {movs.map((m) => (
              <li key={m.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span><strong>{TIPO[m.tipo]}</strong> {m.quantidade > 0 ? `+${m.quantidade}` : m.quantidade}{m.colaborador && ` · para ${m.colaborador}`}{m.observacao && ` · ${m.observacao}`}</span>
                <span className="text-text/60">saldo {m.saldo} · {new Date(m.createdAt).toLocaleString('pt-BR')}</span>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </main>
  );
}
