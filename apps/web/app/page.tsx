'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CampoAjuda } from '@/components/CampoAjuda';
import { ABRIR_AJUDA } from '@/components/AjudaDaTela';
import { Icone, NomeIcone } from '@/components/Icone';
import { CardNumero, classeCard } from '@/components/ui';
import { PassoTour, Tour, useTourPrimeiraVez } from '@/components/Tour';
import { buscarEmissoes, carregarPainel, Emissoes, Empresa, NumerosPainel, Painel, PainelSsma, ssma } from '@/lib/api';
import { aoMudarFoco, empresasDaConta, escolherFoco, salvarFoco } from '@/lib/empresaFoco';
import { ehEmpresa, lerToken, lerUsuario } from '@/lib/sessao';

const passosTour: PassoTour[] = [
  { alvo: 'empresa', titulo: 'Escolha a empresa', texto: 'Cada empresa cliente tem seus dados e documentos. Troque aqui para ver outra. Todos os módulos ficam no menu da esquerda.' },
  { alvo: 'hoje', titulo: 'O que fazer hoje', texto: 'Aqui aparece o que falta para os documentos ficarem completos e o que está vencendo.' },
  { alvo: 'saude', titulo: 'Saúde da Empresa', texto: 'Mostra quanto da empresa já está preenchido. A meta é 100%.' },
  { alvo: 'gerar', titulo: 'Gere o documento', texto: 'Com os dados completos, o PGR sai em PDF com a logo da empresa cliente.' },
  { alvo: 'ajuda', titulo: 'Ajuda sempre à mão', texto: 'Toda tela tem o botão "Como usar esta tela?" no canto de baixo. A Central de ajuda e o Dicionário SST ficam no fim do menu.' },
];


const tonsPorNivel = {
  vencido: { ponto: 'bg-danger', selo: 'bg-danger/10 text-danger', rotulo: 'Vencido' },
  pendente: { ponto: 'bg-warning', selo: 'bg-warning/15 text-[#c2410c]', rotulo: 'Pendente' },
  'em-dia': { ponto: 'bg-success', selo: 'bg-success/10 text-success', rotulo: 'Em dia' },
} as const;

// Atalhos do painel: os módulos mais usados no dia a dia.
const atalhos: { nome: string; texto: string; icone: NomeIcone; rota: string; soConsultoria?: boolean; geral?: boolean }[] = [
  { nome: 'PGR e PCMSO', texto: 'Gerar programas e laudos', icone: 'documento', rota: '#documentos', soConsultoria: true },
  { nome: 'Colaboradores', texto: 'ASO, EPI e ordem de serviço', icone: 'pessoas', rota: '#colaboradores' },
  { nome: 'DDS', texto: '150 temas com dinâmica', icone: 'fala', rota: '/dds', geral: true },
  { nome: 'APR e PT', texto: 'Análise de risco e permissões', icone: 'escudo', rota: '/operacao#apr' },
  { nome: 'Treinamentos', texto: '28 NRs com certificado', icone: 'formatura', rota: '/treinamentos' },
  { nome: 'CIPA', texto: 'Dimensionamento e eleição', icone: 'votar', rota: '/cipa', soConsultoria: true },
  { nome: 'Entrega de EPI', texto: 'Com rosto, até sem internet', icone: 'cracha', rota: '/campo?aba=epi', geral: true },
  { nome: 'Almoxarifado', texto: 'Estoque e CA dos EPIs', icone: 'caixa', rota: '/almoxarifado' },
  { nome: 'eSocial', texto: 'S-2210, S-2220, S-2240', icone: 'nuvem', rota: '/esocial', soConsultoria: true },
  { nome: 'Emergência', texto: 'Brigada, AVCB e extintores', icone: 'fogo', rota: '/emergencia' },
  { nome: 'Indicadores', texto: 'Dashboard completo', icone: 'grafico', rota: '/ssma' },
];

export default function Home() {
  const [empresas, setEmpresas] = useState<Empresa[] | null>(null);
  const [empresaId, setEmpresaId] = useState<string>('');
  const [painel, setPainel] = useState<Painel | null>(null);
  const [emissoes, setEmissoes] = useState<Emissoes | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const tour = useTourPrimeiraVez();
  const [empresaCliente, setEmpresaCliente] = useState(false);
  const [nome, setNome] = useState('');

  const carregarEmpresas = useCallback((recarregar = false) => {
    setErro(null);
    // A visão geral abre uma empresa específica pelo endereço (?empresa=...).
    const pedida = new URLSearchParams(window.location.search).get('empresa') ?? lerUsuario()?.empresaId;
    empresasDaConta(recarregar)
      .then((lista) => {
        setEmpresas(lista);
        const id = escolherFoco(lista, pedida);
        setEmpresaId(id);
        if (id) salvarFoco(id);
      })
      .catch((e: Error) => setErro(e.message));
  }, []);

  useEffect(() => {
    if (!lerToken()) {
      window.location.href = '/entrar';
      return;
    }
    setEmpresaCliente(ehEmpresa());
    setNome((lerUsuario()?.nome ?? '').split(' ')[0]);
    carregarEmpresas();
    return aoMudarFoco(setEmpresaId);
  }, [carregarEmpresas]);

  useEffect(() => {
    if (!empresaId) return;
    setPainel(null);
    setEmissoes(null);
    carregarPainel(empresaId)
      .then(setPainel)
      .catch((e: Error) => setErro(e.message));
    buscarEmissoes(empresaId).then(setEmissoes).catch(() => undefined);
  }, [empresaId]);

  const base = `/empresas/${empresaId}`;
  const semEmpresa = empresas !== null && empresas.length === 0;
  const percentual = painel?.percentual ?? 0;
  const saudacao = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  })();

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <div data-tour="ajuda" className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text/60">
          {saudacao}
          {nome ? `, ${nome}` : ''}! Que bom te ver por aqui.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.dispatchEvent(new Event(ABRIR_AJUDA))} className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-sm font-medium text-text/80 shadow-sm hover:border-primary hover:text-primary">
            <Icone nome="interrogacao" className="h-4 w-4" /> Como usar?
          </button>
          <button type="button" onClick={tour.abrir} className="rounded-full border border-border bg-white px-3.5 py-1.5 text-sm font-medium text-text/80 shadow-sm hover:border-primary hover:text-primary">
            Rever o tour
          </button>
        </div>
      </div>

      {erro && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-danger/30 bg-white p-4 shadow-sm">
          <div>
            <p className="font-semibold text-danger">Não consegui carregar os dados.</p>
            <p className="text-sm text-text/60">
              O servidor pode estar acordando depois de um tempo parado. Isso leva até 1 minuto. ({erro})
            </p>
          </div>
          <button type="button" onClick={() => carregarEmpresas(true)} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            Tentar de novo
          </button>
        </div>
      )}

      {!semEmpresa && <BotoesDoCampo base={empresaId ? base : ''} cliente={empresaCliente} />}

      {semEmpresa ? (
        <BoasVindas cliente={empresaCliente} />
      ) : (
        <>
          <section className="fundo-destaque relative overflow-hidden rounded-3xl p-6 text-white shadow-lg shadow-primary/20 md:p-8">
            <div className="relative flex flex-wrap items-center justify-between gap-6">
              <div className="min-w-0">
                <p className="text-sm font-medium uppercase tracking-wider text-white/70">Empresa em foco</p>
                <h1 className="mt-1 text-2xl font-bold md:text-3xl">{painel?.empresa.razaoSocial ?? (empresas ? 'Carregando empresa…' : 'Carregando…')}</h1>
                <p className="mt-2 max-w-xl text-white/80">
                  {painel
                    ? percentual === 100
                      ? 'Tudo preenchido. Os documentos já podem sair em PDF.'
                      : `Você completou ${percentual}% do cadastro desta empresa. Veja abaixo o que falta.`
                    : 'Buscando os dados da empresa…'}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {!empresaCliente && (
                    <Link href={empresaId ? `${base}#documentos` : '/empresas/nova'} data-tour="gerar" className="rounded-xl bg-white px-5 py-3 font-semibold text-primary shadow-sm transition hover:bg-menta">
                      Gerar PGR em 3 minutos
                    </Link>
                  )}
                  <Link href="/emitir" className="rounded-xl border border-white/40 px-5 py-3 font-semibold text-white transition hover:bg-white/10">
                    Emitir documento
                  </Link>
                  {empresaId && (
                    <Link href={base} className="rounded-xl border border-white/40 px-5 py-3 font-semibold text-white transition hover:bg-white/10">
                      Abrir cadastro da empresa
                    </Link>
                  )}
                </div>
              </div>
              <div data-tour="saude" className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                <div className="flex h-28 w-28 items-center justify-center rounded-full" style={{ background: `conic-gradient(#6CF0C2 ${percentual}%, rgba(255,255,255,0.18) 0)` }}>
                  <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-primary">
                    <span className="text-2xl font-bold">{percentual}%</span>
                  </div>
                </div>
                <div>
                  <p className="font-semibold">
                    Saúde da Empresa
                    <CampoAjuda
                      alinhar="direita"
                      titulo="Saúde da Empresa"
                      ajuda={{
                        oQueE: 'Percentual dos itens já preenchidos: dados da empresa, GHEs, riscos, colaboradores e PGR em dia.',
                        exemplo: '80% quer dizer que falta um dos cinco itens. Veja qual em "O que fazer hoje".',
                      }}
                    />
                  </p>
                  <p className="text-sm text-white/70">Meta: 100%</p>
                </div>
              </div>
            </div>
          </section>

          {painel?.numeros && empresaId && <NumerosDoTopo n={painel.numeros} base={base} cliente={empresaCliente} />}

          <section className="mt-6 grid gap-6 lg:grid-cols-3">
            <div id="hoje" data-tour="hoje" className="scroll-mt-20 rounded-2xl border border-border bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icone nome="lista" className="h-4 w-4" /></span>
                O que fazer hoje
              </h2>
              {!painel && <Esqueleto linhas={3} />}
              {painel && painel.pendencias.length === 0 && (
                <p className="mt-4 rounded-xl bg-success/10 px-4 py-3 text-success">Tudo em dia nesta empresa. 🎉</p>
              )}
              <ul className="mt-3 divide-y divide-border">
                {painel?.pendencias.map((pendencia) => {
                  const tom = tonsPorNivel[pendencia.nivel];
                  return (
                    <li key={pendencia.titulo} className="flex items-center gap-3 py-3">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tom.ponto}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{pendencia.titulo}</p>
                        <p className="text-sm text-text/60">{pendencia.detalhe}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${tom.selo}`}>{tom.rotulo}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div id="vencimentos" className="scroll-mt-20 rounded-2xl border border-border bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/15 text-[#c2410c]"><Icone nome="calendario" className="h-4 w-4" /></span>
                Vencimentos
              </h2>
              {!painel && <Esqueleto linhas={2} />}
              {painel && painel.vencimentos.length === 0 && <p className="mt-4 text-sm text-text/60">Nenhum documento emitido ainda.</p>}
              <ul className="mt-3 space-y-2 text-sm">
                {painel?.vencimentos.map((v) => (
                  <li key={v.tipo} className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                    <span className="font-medium">
                      {v.tipo} <span className="text-text/50">v{v.versao}</span>
                    </span>
                    <span className={v.dias < 0 ? 'font-semibold text-danger' : v.dias <= 30 ? 'font-semibold text-[#c2410c]' : 'text-text/60'}>
                      {new Date(v.vencimento).toLocaleDateString('pt-BR')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {empresaId && <Indicadores empresaId={empresaId} />}

          <ResumoEmissoes dados={emissoes} empresaId={empresaId} />

          <section className="mt-8">
            <h2 className="text-lg font-semibold">Acesso rápido</h2>
            <p className="text-sm text-text/60">Os módulos mais usados. Todos os outros ficam no menu da esquerda.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {atalhos
                .filter((a) => !(empresaCliente && a.soConsultoria))
                .map((a) => (
                  <Link
                    key={a.nome}
                    href={a.geral ? a.rota : empresaId ? `${base}${a.rota}` : '/empresas/nova'}
                    className="group rounded-2xl border border-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#168a7f] text-white shadow-sm">
                      <Icone nome={a.icone} className="h-5 w-5" />
                    </span>
                    <p className="mt-3 font-semibold text-text group-hover:text-primary">{a.nome}</p>
                    <p className="text-xs text-text/60">{a.texto}</p>
                  </Link>
                ))}
            </div>
          </section>
        </>
      )}

      {tour.aberto && !semEmpresa && <Tour passos={passosTour} onFechar={tour.fechar} />}
    </main>
  );
}

// Resumo de emissões: quantos documentos saíram, os últimos e quantos de cada tipo no mês.
function ResumoEmissoes({ dados, empresaId }: { dados: Emissoes | null; empresaId: string }) {
  if (!empresaId) return null;
  const maior = Math.max(1, ...(dados?.porTipo.map((t) => t.quantidade) ?? [1]));
  const mes = new Date().toLocaleDateString('pt-BR', { month: 'long' });
  return (
    <section className="mt-6 rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icone nome="documento" className="h-4 w-4" /></span>
          Documentos emitidos
        </h2>
        <div className="flex gap-2">
          <Link href="/emitir" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Emitir documento</Link>
          <Link href={`/empresas/${empresaId}/arquivo`} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:border-primary">Ver todos</Link>
        </div>
      </div>
      {!dados ? <Esqueleto linhas={2} /> : (
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          <div className="grid grid-cols-2 gap-3 lg:col-span-1 lg:grid-cols-1">
            <CardNumero tom="ok" rotulo="Neste mês" valor={dados.noMes} detalhe={`em ${mes}`} icone="documento" />
            <CardNumero tom="total" rotulo="Total" valor={dados.total} detalhe="desde o começo" icone="pasta" />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Por tipo, neste mês</p>
            {dados.porTipo.length === 0 ? <p className="text-sm text-text/60">Nenhum documento neste mês ainda.</p> : (
              <ul className="space-y-2 text-sm">
                {dados.porTipo.slice(0, 6).map((t) => (
                  <li key={t.nome}>
                    <div className="flex justify-between"><span className="font-medium">{t.nome}</span><span className="text-text/60">{t.quantidade}</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-gradient-to-r from-primary to-[#168a7f]" style={{ width: `${(t.quantidade / maior) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Últimos emitidos</p>
            {dados.ultimas.length === 0 ? <p className="text-sm text-text/60">Os PDFs que você gerar aparecem aqui, com a versão.</p> : (
              <ul className="divide-y divide-border text-sm">
                {dados.ultimas.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 py-2">
                    <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">{a.tipo}</span>
                    <span className="min-w-0 flex-1 truncate" title={a.titulo}>{a.titulo}</span>
                    <span className="shrink-0 text-xs text-text/50">v{a.versao} · {new Date(a.criadoEm).toLocaleDateString('pt-BR')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Esqueleto({ linhas }: { linhas: number }) {
  return (
    <div className="mt-4 space-y-3">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-background" />
      ))}
    </div>
  );
}

// Primeira vez: ainda não há empresa cadastrada.
function BoasVindas({ cliente }: { cliente: boolean }) {
  const passos = [
    { titulo: 'Cadastre a empresa cliente', texto: 'CNPJ, CNAE e logo. O grau de risco sai sozinho.' },
    { titulo: 'Monte os GHEs e os riscos', texto: 'Ou traga um PGR antigo em PDF e a IA preenche para você.' },
    { titulo: 'Inclua os colaboradores', texto: 'Um por um ou pela planilha do RH.' },
    { titulo: 'Gere o PGR e o PCMSO', texto: 'Em PDF, com a logo da empresa e a da sua consultoria.' },
  ];
  return (
    <section className="fundo-destaque overflow-hidden rounded-3xl p-6 text-white shadow-lg shadow-primary/20 md:p-10">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md">
          <img src="/logo.png" alt="Safety Nexo" className="h-10 w-auto" />
        </span>
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Boas-vindas ao Safety Nexo</h1>
          <p className="text-white/80">
            {cliente ? 'Sua consultoria ainda não liberou a empresa para este acesso.' : 'Comece cadastrando a primeira empresa cliente. Leva 2 minutos.'}
          </p>
        </div>
      </div>
      {!cliente && (
        <>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {passos.map((p, i) => (
              <li key={p.titulo} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-menta font-bold text-primary-escuro">{i + 1}</span>
                <p className="mt-3 font-semibold">{p.titulo}</p>
                <p className="text-sm text-white/75">{p.texto}</p>
              </li>
            ))}
          </ol>
          <Link href="/empresas/nova" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-lg font-semibold text-primary shadow-sm transition hover:bg-menta">
            <Icone nome="mais" /> Cadastrar a primeira empresa
          </Link>
          <p className="mt-3 text-sm text-white/70">Depois disso, todos os módulos do menu ficam liberados para ela.</p>
        </>
      )}
    </section>
  );
}

// Dashboard da empresa: os números de segurança de hoje e os acidentes dos últimos 12 meses.
function Indicadores({ empresaId }: { empresaId: string }) {
  const [dados, setDados] = useState<PainelSsma | null>(null);
  const [falhou, setFalhou] = useState(false);
  useEffect(() => {
    setDados(null);
    setFalhou(false);
    ssma.montar(empresaId, {}).then(setDados).catch(() => setFalhou(true));
  }, [empresaId]);

  const cor = (p: number | null) => (p == null ? 'bg-border' : p >= 90 ? 'bg-success' : p >= 70 ? 'bg-warning' : 'bg-danger');
  const maior = Math.max(1, ...(dados?.serie.map((m) => m.acidentes) ?? [0]));
  const nomeMes = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

  return (
    <section className="mt-6 rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success"><Icone nome="grafico" className="h-4 w-4" /></span>
          Indicadores da empresa
        </h2>
        <Link href={`/empresas/${empresaId}/ssma`} className="text-sm font-semibold text-primary hover:underline">Ver dashboard completo →</Link>
      </div>
      {falhou && <p className="mt-4 text-sm text-text/60">Não consegui carregar os indicadores agora. Tente abrir o dashboard completo.</p>}
      {!dados && !falhou && <Esqueleto linhas={2} />}
      {dados && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {dados.emDia.slice(0, 4).map((x) => (
              <div key={x.item} className={`rounded-xl p-4 ${x.pct == null ? 'card-total' : classeCard(x.pct >= 90 ? 'ok' : x.pct >= 70 ? 'pendente' : 'nao')}`}>
                <p className="text-xs font-semibold uppercase tracking-wider text-text/60">{x.item}</p>
                <p className="mt-1 text-2xl font-bold">{x.pct == null ? '—' : `${x.pct}%`}</p>
                <div className="mt-2 h-1.5 rounded-full bg-border">
                  <div className={`h-1.5 rounded-full ${cor(x.pct)}`} style={{ width: `${x.pct ?? 0}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-text/60">{x.de ? `${x.ok} de ${x.de} em dia` : 'Sem registros ainda'}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_220px]">
            <div>
              <p className="text-sm font-semibold">Acidentes nos últimos 12 meses</p>
              <div className="mt-3 flex h-24 items-end gap-1.5" aria-label="Acidentes por mês">
                {dados.serie.map((m) => (
                  <div key={m.mes} className="flex flex-1 flex-col items-center gap-1" title={`${nomeMes(m.mes)}: ${m.acidentes} acidente(s)`}>
                    <span className="text-[10px] text-text/60">{m.acidentes || ''}</span>
                    <div className={`w-full rounded-t ${m.acidentes ? 'bg-danger/80' : 'bg-success/30'}`} style={{ height: `${Math.max(4, (m.acidentes / maior) * 64)}px` }} />
                    <span className="text-[10px] text-text/50">{nomeMes(m.mes)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
              <div className={`rounded-xl p-3 ${dados.atual.acidentes ? 'card-nao' : 'card-ok'}`}>
                <p className="text-xs text-text/60">Acidentes este mês</p>
                <p className="text-xl font-bold">{dados.atual.acidentes}</p>
              </div>
              <div className={`rounded-xl p-3 ${dados.atual.diasPerdidos ? 'card-pendente' : 'card-ok'}`}>
                <p className="text-xs text-text/60">Dias perdidos este mês</p>
                <p className="text-xl font-bold">{dados.atual.diasPerdidos}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

// No celular, a primeira coisa da tela: botões grandes para o que se faz em campo.
// No computador some, porque lá o menu da esquerda e o acesso rápido já cumprem esse papel.
const botoesCampo: { nome: string; icone: NomeIcone; rota: string; geral?: boolean; cor: string; soConsultoria?: boolean }[] = [
  { nome: 'Inspeção', icone: 'lupa', rota: '/campo?aba=inspecao', geral: true, cor: 'from-primary to-[#168a7f]' },
  { nome: 'Checklist', icone: 'lista', rota: '/operacao#checklist', cor: 'from-[#0f766e] to-[#14b8a6]' },
  { nome: 'DDS', icone: 'fala', rota: '/campo?aba=dds', geral: true, cor: 'from-[#1d4ed8] to-[#3b82f6]' },
  { nome: 'Entrega de EPI', icone: 'cracha', rota: '/campo?aba=epi', geral: true, cor: 'from-[#7c3aed] to-[#a78bfa]' },
  { nome: 'APR', icone: 'escudo', rota: '/campo?aba=apr', geral: true, cor: 'from-[#c2410c] to-[#f97316]' },
  { nome: 'Riscos', icone: 'alerta', rota: '#ghes', cor: 'from-[#b91c1c] to-[#ef4444]', soConsultoria: true },
  { nome: 'Plano de ação', icone: 'check', rota: '/prevencao#acoes', cor: 'from-[#15803d] to-[#22c55e]' },
  { nome: 'Vencimentos', icone: 'calendario', rota: '#vencimentos', geral: true, cor: 'from-[#a16207] to-[#eab308]' },
  { nome: 'Calculadoras', icone: 'numero', rota: '/calculadoras', geral: true, cor: 'from-[#334155] to-[#64748b]' },
  { nome: 'Slides', icone: 'livro', rota: '/material', geral: true, cor: 'from-[#0e4a5b] to-[#0891b2]' },
];

function BotoesDoCampo({ base, cliente }: { base: string; cliente: boolean }) {
  return (
    <section className="mb-5 md:hidden" aria-label="Atalhos do campo">
      <div className="grid grid-cols-2 gap-3">
        {botoesCampo.filter((b) => !(cliente && b.soConsultoria)).map((b) => (
          <Link
            key={b.nome}
            href={b.geral ? b.rota : base ? `${base}${b.rota}` : '/empresas/nova'}
            className={`flex min-h-[96px] flex-col justify-between rounded-2xl bg-gradient-to-br ${b.cor} p-4 text-white shadow-md active:scale-[0.98]`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20"><Icone nome={b.icone} className="h-6 w-6" /></span>
            <span className="text-base font-bold leading-tight">{b.nome}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// Cores do mapa de risco (NR-05): verde físico, vermelho químico, marrom biológico, amarelo ergonômico, azul acidente.
const TIPOS_RISCO: { tipo: string; nome: string; cor: string }[] = [
  { tipo: 'FISICO', nome: 'Físico', cor: '#16a34a' },
  { tipo: 'QUIMICO', nome: 'Químico', cor: '#dc2626' },
  { tipo: 'BIOLOGICO', nome: 'Biológico', cor: '#92400e' },
  { tipo: 'ERGONOMICO', nome: 'Ergonômico', cor: '#eab308' },
  { tipo: 'ACIDENTE', nome: 'Acidente', cor: '#2563eb' },
];

// Quatro números grandes e a rosquinha dos riscos: o retrato da empresa num olhar.
function NumerosDoTopo({ n, base, cliente }: { n: NumerosPainel; base: string; cliente: boolean }) {
  const fatias = TIPOS_RISCO.map((t) => ({ ...t, qtd: n.riscosPorTipo[t.tipo] ?? 0 })).filter((t) => t.qtd > 0);
  const total = fatias.reduce((s, f) => s + f.qtd, 0);
  let acum = 0;
  const gradiente = fatias.map((f) => { const ini = (acum / total) * 100; acum += f.qtd; return `${f.cor} ${ini}% ${(acum / total) * 100}%`; }).join(', ');
  return (
    <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link href={`${base}#colaboradores`}><CardNumero tom="total" rotulo="Colaboradores" valor={<span className="text-3xl">{n.colaboradores}</span>} detalhe="cadastrados" icone="pessoas" /></Link>
        <Link href={`${base}/prevencao#acoes`}><CardNumero tom={n.acoesAtrasadas ? 'nao' : n.acoesAbertas ? 'pendente' : 'ok'} rotulo="Ações em aberto" valor={<span className="text-3xl">{n.acoesAbertas}</span>} detalhe={n.acoesAtrasadas ? `${n.acoesAtrasadas} atrasada(s)` : 'nenhuma atrasada'} icone="check" /></Link>
        <a href="#hoje"><CardNumero tom={n.pendenciasVencidas ? 'nao' : 'ok'} rotulo="Urgentes" valor={<span className="text-3xl">{n.pendenciasVencidas}</span>} detalhe={n.pendenciasVencidas ? 'vencidos: resolver já' : 'nada vencido'} icone="calendario" /></a>
        <Link href={`${base}/prevencao#relatos`}><CardNumero tom={n.relatosNovos ? 'pendente' : 'ok'} rotulo="Relatos novos" valor={<span className="text-3xl">{n.relatosNovos}</span>} detalhe="pelo QR code" icone="qr" /></Link>
      </div>
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="relative h-28 w-28 shrink-0 rounded-full" style={{ background: total ? `conic-gradient(${gradiente})` : '#e5e7eb' }} aria-hidden>
          <div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-white">
            <span className="text-2xl font-bold leading-none">{total}</span>
            <span className="text-[10px] text-text/60">riscos</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Riscos por tipo</p>
          {total === 0 ? (
            <p className="mt-1 text-xs text-text/60">{cliente ? 'A consultoria ainda não lançou os riscos.' : <>Nenhum risco lançado. <Link href={`${base}#ghes`} className="font-semibold text-primary">Lançar riscos</Link></>}</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-xs">
              {fatias.map((f) => <li key={f.tipo} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: f.cor }} />{f.nome} <span className="text-text/50">{f.qtd}</span></li>)}
              {n.riscosAltos > 0 && <li className="pt-1 font-semibold text-danger">{n.riscosAltos} de severidade alta</li>}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
