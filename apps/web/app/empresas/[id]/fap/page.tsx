'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Aviso, Botao, Campo, Cartao, Selecao } from '@/components/ui';
import { buscarEmpresa, DadosFap, Empresa, fapRat, salvarArquivo } from '@/lib/api';
import { ehEmpresa } from '@/lib/sessao';

const real = (n: number | null) => (n == null ? '-' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const pct = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}%`;
const n4 = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
// Aceita "1,2345" ou "1.2345"; na folha aceita "85.000,00".
const numero = (v: string, dinheiro = false) => { const t = v.trim(); if (!t) return undefined; return Number(dinheiro || t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t); };

export default function FapPage({ params }: { params: { id: string } }) {
  const empresaId = params.id;
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [dados, setDados] = useState<DadosFap | null>(null);
  const [cliente, setCliente] = useState(false);
  const [chave, setChave] = useState(0);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  const [simulado, setSimulado] = useState('');

  const carregar = useCallback(async () => {
    try { const [e, d] = await Promise.all([buscarEmpresa(empresaId), fapRat.listar(empresaId)]); setEmpresa(e); setDados(d); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  }, [empresaId]);
  useEffect(() => { setCliente(ehEmpresa()); carregar(); }, [carregar]);

  const agir = async (f: () => Promise<string>) => {
    try { setAviso({ tipo: 'ok', texto: await f() }); setChave((k) => k + 1); await carregar(); } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
  };

  if (!empresa || !dados) return <main className="p-10">{aviso ? <Aviso tipo="erro">{aviso.texto}</Aviso> : 'Carregando…'}</main>;
  const atual = dados.anos[0];
  const o = dados.ocorrencias;
  const fapSim = numero(simulado);
  const sim = atual && atual.folhaMensal != null && fapSim != null && fapSim >= 0.5 && fapSim <= 2 ? Math.round(atual.folhaMensal * atual.rat * fapSim) / 100 : null;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div>
        <Link href={`/?empresa=${empresaId}`} className="text-sm text-primary">← Voltar ao painel</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">FAP e RAT</h1>
        <p className="text-text/60">{empresa.razaoSocial}{dados.cnae ? ` · CNAE ${dados.cnae}` : ''} · quanto os acidentes pesam no imposto sobre a folha</p>
      </div>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <Cartao titulo="Como funciona">
        <p className="text-sm">O <strong>RAT</strong> é 1%, 2% ou 3% da folha, conforme o risco da atividade principal da empresa. O <strong>FAP</strong> é um número de 0,5000 a 2,0000 que a Previdência divulga todo ano para cada empresa: ele multiplica o RAT. Abaixo de 1 a empresa paga menos; acima de 1 paga mais.</p>
        <p className="mt-2 text-sm">Os dois números estão na consulta do FAP da empresa no site da Previdência e na folha de pagamento. Pesam no FAP as CATs e os afastamentos pelo INSS por acidente ou doença do trabalho.</p>
        <p className="mt-2 text-xs text-text/60">Lei 8.212/1991, art. 22, II · Decreto 3.048/1999, art. 202-A, §§ 1º, 4º e 5º</p>
      </Cartao>

      {atual && (
        <Cartao titulo={`Resultado de ${atual.ano}`} acao={<Botao variante="secundario" onClick={() => agir(async () => { salvarArquivo(await fapRat.relatorio(empresaId), 'FAP-RAT.pdf'); return 'Relatório baixado. Uma cópia ficou no arquivo de documentos.'; })}>Baixar relatório</Botao>}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-card bg-background p-4"><p className="text-xs text-text/60">RAT</p><p className="text-2xl font-semibold">{pct(atual.rat)}</p></div>
            <div className="rounded-card bg-background p-4"><p className="text-xs text-text/60">FAP</p><p className={`text-2xl font-semibold ${atual.efeito === 'aumenta' ? 'text-danger' : atual.efeito === 'reduz' ? 'text-success' : ''}`}>{n4(atual.fap)}</p></div>
            <div className="rounded-card bg-background p-4"><p className="text-xs text-text/60">RAT ajustado (RAT × FAP)</p><p className="text-2xl font-semibold">{pct(atual.ratAjustado)}</p></div>
          </div>
          <p className="mt-4 text-sm">
            {atual.efeito === 'neutro' ? 'O FAP é 1,0000: não muda o RAT.' : `O FAP ${atual.efeito} o RAT em ${atual.percentual.toLocaleString('pt-BR')}%.`}
            {atual.diferencaMensal != null && <> Com folha de {real(atual.folhaMensal)}, a empresa paga {real(atual.custoMensal)} por mês, <strong className={atual.diferencaMensal > 0 ? 'text-danger' : 'text-success'}>{real(Math.abs(atual.diferencaMensal))} {atual.diferencaMensal > 0 ? 'a mais' : 'a menos'}</strong> do que pagaria sem o FAP.</>}
          </p>
          {atual.folhaMensal != null && (
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <Campo id="fap-sim" rotulo="E se o FAP fosse…" placeholder="Ex.: 0,8000" value={simulado} onChange={(e) => setSimulado(e.target.value)} className="w-48" />
              {sim != null && <p className="pb-2 text-sm">pagaria {real(sim)} por mês ({sim - (atual.custoMensal ?? 0) >= 0 ? `${real(sim - (atual.custoMensal ?? 0))} a mais` : `${real((atual.custoMensal ?? 0) - sim)} a menos`} que hoje).</p>}
              {simulado && sim == null && <p className="pb-2 text-sm text-danger">O FAP vai de 0,5000 a 2,0000.</p>}
            </div>
          )}
        </Cartao>
      )}

      <Cartao titulo="Acidentes e afastamentos registrados aqui (últimos 24 meses)">
        <div className="grid gap-3 text-center sm:grid-cols-4">
          {[['CATs emitidas', o.cats], ['CATs com afastamento', o.comAfastamento], ['Óbitos', o.obitos], ['Afastamentos do trabalho com mais de 15 dias', o.afastamentosInss]].map(([r, v]) => (
            <div key={r as string} className="rounded-card border border-border p-3"><p className="text-2xl font-semibold">{v}</p><p className="text-xs text-text/60">{r}</p></div>
          ))}
        </div>
        <p className="mt-3 text-xs text-text/60">Cada acidente com afastamento longo pesa no FAP dos anos seguintes. Prevenir é também economizar na folha. <Link href={`/empresas/${empresaId}/saude`} className="text-primary underline">Ver CATs</Link></p>
      </Cartao>

      {dados.anos.length > 0 && (
        <Cartao titulo="Anos informados">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-text/60"><th className="py-2">Ano</th><th>RAT</th><th>FAP</th><th>Ajustado</th><th>Folha mensal</th><th>Por mês</th><th>Pelo FAP</th><th /></tr></thead>
              <tbody className="divide-y divide-border">
                {dados.anos.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 font-semibold">{a.ano}</td><td>{pct(a.rat)}</td><td>{n4(a.fap)}</td><td>{pct(a.ratAjustado)}</td><td>{real(a.folhaMensal)}</td><td>{real(a.custoMensal)}</td>
                    <td className={a.diferencaMensal != null && a.diferencaMensal > 0 ? 'text-danger' : 'text-success'}>{a.diferencaMensal == null ? '-' : `${a.diferencaMensal > 0 ? '+' : '-'}${real(Math.abs(a.diferencaMensal))}`}</td>
                    <td className="text-right">{!cliente && <button className="text-danger underline" onClick={() => confirm(`Apagar o ano ${a.ano}?`) && agir(async () => { await fapRat.remover(empresaId, a.id); return `Ano ${a.ano} apagado.`; })}>Apagar</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>
      )}

      {!cliente && (
        <Cartao titulo="Informar FAP do ano">
          <p className="mb-4 text-sm text-text/60">Se o ano já existir, os números são trocados pelos novos.</p>
          <form key={chave} className="grid gap-4 md:grid-cols-4" onSubmit={(ev) => {
            ev.preventDefault(); const d = new FormData(ev.currentTarget); const t = (c: string) => String(d.get(c) ?? '');
            agir(async () => {
              const fap = numero(t('fap'));
              if (fap == null || Number.isNaN(fap)) throw new Error('Informe o FAP.');
              const folha = numero(t('folha'), true);
              if (folha != null && Number.isNaN(folha)) throw new Error('Folha mensal inválida. Ex.: 85.000,00');
              const r = await fapRat.salvar(empresaId, { ano: Number(t('ano')), rat: Number(t('rat')), fap, folhaMensal: folha, observacao: t('obs') || undefined });
              return `FAP de ${r.ano} guardado.`;
            });
          }}>
            <Campo id="fap-ano" name="ano" type="number" rotulo="Ano de vigência" required defaultValue={String(new Date().getFullYear())} />
            <Selecao id="fap-rat" name="rat" rotulo="RAT" defaultValue={String(atual?.rat ?? 1)}><option value="1">1% (risco leve)</option><option value="2">2% (risco médio)</option><option value="3">3% (risco grave)</option></Selecao>
            <Campo id="fap-fap" name="fap" rotulo="FAP" required placeholder="Ex.: 1,2345" inputMode="decimal" />
            <Campo id="fap-folha" name="folha" rotulo="Folha mensal (R$, opcional)" placeholder="Ex.: 85.000,00" inputMode="decimal" />
            <Campo id="fap-obs" name="obs" rotulo="Observação" className="md:col-span-3" />
            <div className="flex items-end justify-end"><Botao type="submit">Guardar</Botao></div>
          </form>
        </Cartao>
      )}
    </main>
  );
}
