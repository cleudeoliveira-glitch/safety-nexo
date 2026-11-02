'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Aviso } from '@/components/ui';
import { carregarPainelGeral, PainelGeral } from '@/lib/api';
import { lerToken } from '@/lib/sessao';

const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const corSaude = (p: number) => (p >= 80 ? 'text-success' : p >= 50 ? 'text-warning' : 'text-danger');

// Visão da consultoria: todas as empresas clientes numa tela, as que mais precisam de atenção primeiro.
export default function VisaoGeralPage() {
  const [painel, setPainel] = useState<PainelGeral | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!lerToken()) {
      window.location.href = '/entrar';
      return;
    }
    carregarPainelGeral().then(setPainel).catch((e: Error) => setErro(e.message));
  }, []);

  if (erro) return <main className="p-10"><Aviso tipo="erro">{erro}</Aviso></main>;
  if (!painel) return <main className="p-10">Carregando…</main>;
  const t = painel.totais;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <div>
        <Link href="/" className="text-sm text-primary">← Voltar ao painel</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Visão geral das empresas</h1>
        <p className="text-text/60">Todas as suas empresas clientes. As que precisam de atenção aparecem primeiro.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Empresas', String(t.empresas), 'text-primary'],
          ['Saúde média', `${t.saudeMedia}%`, corSaude(t.saudeMedia)],
          ['Itens vencidos', String(t.vencidos), t.vencidos ? 'text-danger' : 'text-success'],
          ['Tarefas pendentes', String(t.pendentes), t.pendentes ? 'text-warning' : 'text-success'],
        ].map(([rotulo, valor, cor]) => (
          <div key={rotulo} className="rounded-card border border-border bg-white p-5 shadow-sm">
            <p className="text-sm text-text/60">{rotulo}</p>
            <p className={`mt-1 text-3xl font-semibold ${cor}`}>{valor}</p>
          </div>
        ))}
      </section>

      <section className="overflow-x-auto rounded-card border border-border bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-text/60">
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Saúde</th>
              <th className="px-4 py-3">Vencidos</th>
              <th className="px-4 py-3">Pendentes</th>
              <th className="px-4 py-3">O que fazer primeiro</th>
              <th className="px-4 py-3">Próximo vencimento</th>
            </tr>
          </thead>
          <tbody>
            {painel.empresas.map((l) => (
              <tr key={l.empresa.id} className="border-b border-border last:border-0 hover:bg-background">
                <td className="px-4 py-3">
                  <Link href={`/?empresa=${l.empresa.id}`} className="font-semibold text-primary hover:underline">{l.empresa.razaoSocial}</Link>
                  <span className="block text-xs text-text/50">CNPJ {l.empresa.cnpj}</span>
                </td>
                <td className={`px-4 py-3 font-semibold ${corSaude(l.percentual)}`}>{l.percentual}%</td>
                <td className={`px-4 py-3 ${l.vencidos ? 'font-semibold text-danger' : 'text-text/50'}`}>{l.vencidos}</td>
                <td className={`px-4 py-3 ${l.pendentes ? 'text-warning' : 'text-text/50'}`}>{l.pendentes}</td>
                <td className="px-4 py-3">{l.principal ? l.principal.titulo : <span className="text-success">Tudo em dia</span>}</td>
                <td className="px-4 py-3 text-text/70">{l.proximoVencimento ? `${l.proximoVencimento.tipo} · ${data(l.proximoVencimento.vencimento)}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {painel.empresas.length === 0 && <p className="p-6 text-sm text-text/60">Nenhuma empresa cadastrada ainda.</p>}
      </section>
      <p className="text-xs text-text/50">O faturamento por empresa entra aqui quando o módulo comercial estiver pronto.</p>
    </main>
  );
}
