'use client';

import { useEffect, useState } from 'react';
import { Aviso, Botao } from '@/components/ui';
import { Empresa, listarEmpresas, MeuPlano, meuPlano } from '@/lib/api';
import { esquecerRecursos } from '@/lib/plano';

// Meu plano: quando a conta tem mais empresas do que o plano permite, o dono escolhe as que ficam ativas.
// As outras ficam só para consulta (vê e baixa, não muda). Nada é apagado. Troca uma vez por mês.
export function EmpresasAtivas({ dados, aoSalvar }: { dados: MeuPlano; aoSalvar: (d: MeuPlano) => void }) {
  const [empresas, setEmpresas] = useState<Empresa[] | null>(null);
  const [marcadas, setMarcadas] = useState<string[]>(dados.ativas?.ids ?? []);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { listarEmpresas().then(setEmpresas).catch(() => setEmpresas([])); }, []);
  useEffect(() => { setMarcadas(dados.ativas?.ids ?? []); }, [dados.ativas?.ids]);
  if (!dados.ativas?.acima || dados.limiteEmpresas === null) return null;
  const limite = dados.limiteEmpresas;
  const travada = !!dados.ativas.proximaTroca;
  const dataTroca = dados.ativas.proximaTroca ? new Date(dados.ativas.proximaTroca).toLocaleDateString('pt-BR') : '';
  const alternar = (id: string) => setMarcadas((m) => (m.includes(id) ? m.filter((x) => x !== id) : m.length < limite ? [...m, id] : m));

  return (
    <section className="rounded-card border border-warning/40 bg-white p-4 shadow-sm md:p-6">
      <h2 className="text-lg font-semibold text-primary">Empresas ativas no seu plano</h2>
      <p className="mt-1 text-sm text-text/70">
        Você tem {dados.empresas} empresas e o plano {dados.nomePlano} permite {limite} ativa{limite === 1 ? '' : 's'}.
        As outras ficam <strong>só para consulta</strong>: dá para ver e baixar tudo, mas não mudar. Nada é apagado e, voltando para um plano maior, todas voltam na hora.
      </p>
      <p className="mt-1 text-xs text-text/60">
        {travada ? `A escolha pode ser trocada uma vez por mês. A próxima troca fica liberada em ${dataTroca}.` : dados.ativas.escolhidas ? 'Você pode trocar a escolha agora. Depois de salvar, a próxima troca fica para daqui a 30 dias.' : 'Ainda não escolheu: por enquanto ficam ativas as que você usou por último. Escolha abaixo.'}
      </p>
      {!empresas ? <div className="mt-3 h-24 animate-pulse rounded-card bg-background" /> : (
        <ul className="mt-3 divide-y divide-border rounded-card border border-border text-sm">
          {empresas.map((e) => {
            const marcada = marcadas.includes(e.id);
            return (
              <li key={e.id}>
                <label className={`flex min-h-[48px] items-center gap-3 px-3 py-2 ${travada ? '' : 'cursor-pointer hover:bg-background'}`}>
                  <input type="checkbox" checked={marcada} disabled={travada || (!marcada && marcadas.length >= limite)} onChange={() => alternar(e.id)} className="h-5 w-5" />
                  <span className="flex-1">{e.razaoSocial}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${marcada ? 'bg-success/15 text-success' : 'bg-border/60 text-text/60'}`}>{marcada ? 'Ativa' : 'Só consulta'}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-2 text-xs text-text/60">{marcadas.length} de {limite} escolhida{limite === 1 ? '' : 's'}.</p>
      {aviso && <div className="mt-3"><Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso></div>}
      {!travada && (
        <div className="mt-3 flex justify-end">
          <Botao type="button" disabled={salvando || !marcadas.length} onClick={async () => {
            setSalvando(true); setAviso(null);
            try {
              const novo = await meuPlano.escolherAtivas(marcadas);
              esquecerRecursos();
              aoSalvar(novo);
              setAviso({ tipo: 'ok', texto: 'Escolha salva. As empresas marcadas seguem ativas; as outras ficam só para consulta.' });
            } catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); }
            setSalvando(false);
          }}>{salvando ? 'Salvando…' : 'Salvar empresas ativas'}</Botao>
        </div>
      )}
    </section>
  );
}
