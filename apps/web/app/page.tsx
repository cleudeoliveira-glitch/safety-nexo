'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CampoAjuda } from '@/components/CampoAjuda';
import { Dicionario, Painel as PainelLateral } from '@/components/Dicionario';
import { PassoTour, Tour, useTourPrimeiraVez } from '@/components/Tour';
import { carregarPainel, Empresa, listarEmpresas, Painel } from '@/lib/api';
import { lerToken, sair } from '@/lib/sessao';

const segments = ['Admissão e Base', 'Operação Diária', 'Pessoas e Cultura', 'Saúde Ocupacional', 'Emergência', 'Governança'];

const passosTour: PassoTour[] = [
  { alvo: 'empresa', titulo: 'Escolha a empresa', texto: 'Cada empresa cliente tem seus dados e documentos. Troque aqui para ver outra.' },
  { alvo: 'hoje', titulo: 'O que fazer hoje', texto: 'Aqui aparece o que falta para os documentos ficarem completos e o que está vencendo.' },
  { alvo: 'saude', titulo: 'Saúde da Empresa', texto: 'Mostra quanto da empresa já está preenchido. A meta é 100%.' },
  { alvo: 'gerar', titulo: 'Gere o documento', texto: 'Com os dados completos, o PGR sai em PDF com a logo da empresa cliente.' },
  { alvo: 'ajuda', titulo: 'Ajuda sempre à mão', texto: 'Use "Como usar?" para o passo a passo desta tela e o Dicionário SST para entender qualquer sigla.' },
];

const comoUsar = [
  'Escolha a empresa no menu da esquerda.',
  'Veja em "O que fazer hoje" o que falta. Cada item diz o próximo passo.',
  'Complete os dados da empresa, cadastre os GHEs, os riscos e os colaboradores.',
  'Quando a Saúde da Empresa chegar a 100%, gere o PGR e depois o PCMSO.',
  'Acompanhe os vencimentos no quadro da direita.',
];

const tonsPorNivel = {
  vencido: { ponto: 'bg-danger', selo: 'bg-danger text-white', rotulo: 'Vencido' },
  pendente: { ponto: 'bg-warning', selo: 'bg-warning text-text', rotulo: 'Pendente' },
  'em-dia': { ponto: 'bg-success', selo: 'bg-success text-white', rotulo: 'Em dia' },
} as const;

export default function Home() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState<string>('');
  const [painel, setPainel] = useState<Painel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [painelAjuda, setPainelAjuda] = useState<'como-usar' | 'dicionario' | null>(null);
  const tour = useTourPrimeiraVez();

  useEffect(() => {
    if (!lerToken()) {
      window.location.href = '/entrar';
      return;
    }
    listarEmpresas()
      .then((lista) => {
        setEmpresas(lista);
        if (lista[0]) setEmpresaId(lista[0].id);
      })
      .catch((e: Error) => setErro(e.message));
  }, []);

  useEffect(() => {
    if (!empresaId) return;
    setPainel(null);
    carregarPainel(empresaId)
      .then(setPainel)
      .catch((e: Error) => setErro(e.message));
  }, [empresaId]);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-white p-6 md:block">
        <img src="/logo.png" alt="Safety Nexo" className="h-10 w-auto" />
        <label htmlFor="empresa" className="mt-6 block text-xs text-text/60">
          Empresa em foco
          <CampoAjuda
            titulo="Empresa em foco"
            ajuda={{
              oQueE: 'A empresa cliente com que você está trabalhando agora.',
              ondeAcho: 'As empresas cadastradas aparecem nesta lista.',
              exemplo: 'Padaria Pão Quente Ltda',
            }}
          />
        </label>
        <select
          data-tour="empresa"
          id="empresa"
          value={empresaId}
          onChange={(e) => setEmpresaId(e.target.value)}
          className="mt-1 w-full rounded-card border border-border bg-background px-3 py-2 text-sm"
        >
          {empresas.map((empresa) => (
            <option key={empresa.id} value={empresa.id}>
              {empresa.razaoSocial}
            </option>
          ))}
        </select>
        <div className="mt-3 grid gap-2">
          <Link href="/empresas/nova" className="rounded-card bg-primary px-3 py-2 text-center text-sm font-semibold text-white">
            + Nova empresa
          </Link>
          {empresaId && (
            <Link href={`/empresas/${empresaId}`} className="rounded-card border border-border px-3 py-2 text-center text-sm font-medium">
              Abrir cadastro da empresa
            </Link>
          )}
        </div>
        <div data-tour="ajuda" className="mt-6 grid gap-2">
          <button type="button" onClick={() => setPainelAjuda('como-usar')} className="rounded-card border border-border px-3 py-2 text-left text-sm font-medium">
            Como usar?
          </button>
          <button type="button" onClick={() => setPainelAjuda('dicionario')} className="rounded-card border border-border px-3 py-2 text-left text-sm font-medium">
            Dicionário SST
          </button>
          <button type="button" onClick={tour.abrir} className="rounded-card border border-border px-3 py-2 text-left text-sm font-medium">
            Rever o tour
          </button>
          <button type="button" onClick={sair} className="px-3 py-2 text-left text-sm text-text/60">
            Sair
          </button>
        </div>
        <nav className="mt-8 space-y-3">
          {segments.map((segment) => (
            <p key={segment} className="text-sm font-medium">
              {segment}
            </p>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-6 md:p-10">
        {erro && <p className="rounded-card border border-danger bg-white p-4 text-danger">{erro}</p>}

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-text/60">{painel?.empresa.razaoSocial ?? 'Carregando empresa…'}</p>
            <h1 className="text-3xl font-semibold text-primary">
              Você completou {painel ? `${painel.percentual}%` : '…'} da empresa
            </h1>
          </div>
          <Link
            href={empresaId ? `/empresas/${empresaId}#documentos` : '/empresas/nova'}
            data-tour="gerar"
            className="rounded-card bg-primary px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Gerar PGR em 3 minutos
          </Link>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div data-tour="hoje" className="rounded-card border border-border bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold">O que fazer hoje</h2>
            {painel && painel.pendencias.length === 0 && (
              <p className="mt-4 text-text/60">Tudo em dia nesta empresa.</p>
            )}
            <ul className="mt-4 divide-y divide-border">
              {painel?.pendencias.map((pendencia) => {
                const tom = tonsPorNivel[pendencia.nivel];
                return (
                  <li key={pendencia.titulo} className="flex items-center gap-3 py-3">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tom.ponto}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{pendencia.titulo}</p>
                      <p className="text-sm text-text/60">{pendencia.detalhe}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tom.selo}`}>{tom.rotulo}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div data-tour="saude" className="rounded-card border border-border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">
              Saúde da Empresa
              <CampoAjuda
                alinhar="direita"
                titulo="Saúde da Empresa"
                ajuda={{
                  oQueE: 'Percentual dos itens já preenchidos: dados da empresa, GHEs, riscos, colaboradores e PGR em dia.',
                  exemplo: '80% quer dizer que falta um dos cinco itens. Veja qual em "O que fazer hoje".',
                }}
              />
            </h2>
            <div className="mt-6 flex items-center justify-center">
              <div
                className="flex h-40 w-40 items-center justify-center rounded-full"
                style={{ background: `conic-gradient(#10b981 ${painel?.percentual ?? 0}%, #e5e7eb 0)` }}
              >
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white">
                  <span className="text-3xl font-semibold text-primary">{painel?.percentual ?? 0}%</span>
                </div>
              </div>
            </div>
            <h3 className="mt-6 text-sm font-semibold">Vencimentos</h3>
            {painel && painel.vencimentos.length === 0 && <p className="mt-2 text-sm text-text/60">Nenhum documento emitido.</p>}
            <ul className="mt-2 space-y-1 text-sm">
              {painel?.vencimentos.map((v) => (
                <li key={v.tipo} className="flex justify-between">
                  <span>
                    {v.tipo} v{v.versao}
                  </span>
                  <span className={v.dias < 0 ? 'text-danger' : v.dias <= 30 ? 'text-warning' : 'text-text/60'}>
                    {new Date(v.vencimento).toLocaleDateString('pt-BR')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      {painelAjuda === 'como-usar' && (
        <PainelLateral titulo="Como usar esta tela" onFechar={() => setPainelAjuda(null)}>
          <ol className="list-decimal space-y-3 pl-5 text-sm">
            {comoUsar.map((passo) => (
              <li key={passo}>{passo}</li>
            ))}
          </ol>
        </PainelLateral>
      )}
      {painelAjuda === 'dicionario' && <Dicionario onFechar={() => setPainelAjuda(null)} />}
      {tour.aberto && <Tour passos={passosTour} onFechar={tour.fechar} />}
    </div>
  );
}
