'use client';

import Link from 'next/link';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Aviso, Botao } from '@/components/ui';
import { admin, ConsultoriaAdm, ConsultoriaAdmDetalhe, PainelAdm } from '@/lib/api';
import { lerToken } from '@/lib/sessao';

const ILIMITADO = 100000;
const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');
const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function haQuanto(iso: string | null) {
  if (!iso) return 'Nunca entrou';
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (dias <= 0) return 'Hoje';
  if (dias === 1) return 'Ontem';
  return `Há ${dias} dias`;
}

type Filtro = 'todas' | 'ativas' | 'bloqueadas' | 'pagantes' | 'free';

// Painel ADM: só o dono do Safety Nexo. Mostra quem contratou, o plano, o uso, e permite bloquear ou liberar.
export default function PainelAdmPage() {
  const [painel, setPainel] = useState<PainelAdm | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [aberta, setAberta] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<ConsultoriaAdmDetalhe | null>(null);

  const carregar = () => admin.painel().then(setPainel).catch((e: Error) => setErro(e.message));

  useEffect(() => {
    if (!lerToken()) {
      window.location.href = '/entrar';
      return;
    }
    carregar();
  }, []);

  const lista = useMemo(() => {
    if (!painel) return [];
    const termo = busca.trim().toLowerCase();
    return painel.consultorias.filter((c) => {
      if (filtro === 'ativas' && c.bloqueada) return false;
      if (filtro === 'bloqueadas' && !c.bloqueada) return false;
      if (filtro === 'pagantes' && (c.plano === 'FREE' || c.bloqueada)) return false;
      if (filtro === 'free' && c.plano !== 'FREE') return false;
      if (!termo) return true;
      return [c.nome, c.cnpj, c.cidade, c.responsavel?.nome, c.responsavel?.email].some((x) => x?.toLowerCase().includes(termo));
    });
  }, [painel, busca, filtro]);

  async function alterar(c: ConsultoriaAdm, dados: Parameters<typeof admin.atualizar>[1], mensagem: string) {
    setErro('');
    try {
      await admin.atualizar(c.id, dados);
      setAviso(mensagem);
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  function bloquear(c: ConsultoriaAdm) {
    const motivo = window.prompt(`Bloquear "${c.nome}"? Ninguém dessa consultoria (nem as empresas clientes dela) vai conseguir entrar.\n\nMotivo (opcional, ex.: falta de pagamento):`);
    if (motivo === null) return;
    alterar(c, { bloqueada: true, motivoBloqueio: motivo }, `${c.nome} foi bloqueada.`);
  }

  function anotar(c: ConsultoriaAdm) {
    const texto = window.prompt(`Anotação interna sobre "${c.nome}" (só você vê):`, c.observacaoAdm ?? '');
    if (texto === null) return;
    alterar(c, { observacaoAdm: texto }, 'Anotação guardada.');
  }

  function abrir(id: string) {
    if (aberta === id) {
      setAberta(null);
      return;
    }
    setAberta(id);
    setDetalhe(null);
    admin.detalhe(id).then(setDetalhe).catch((e: Error) => setErro(e.message));
  }

  if (erro && !painel) return <main className="p-10"><Aviso tipo="erro">{erro}</Aviso></main>;
  if (!painel) return <main className="p-10">Carregando…</main>;
  const t = painel.totais;

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      <div>
        <Link href="/" className="text-sm text-primary">← Voltar à minha consultoria</Link>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Painel ADM da plataforma</h1>
        <p className="text-text/60">Todas as consultorias que usam o Safety Nexo: plano, uso e acesso. Só você vê esta tela.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Consultorias cadastradas', String(t.consultorias), `${t.novasNoMes} novas neste mês`],
          ['Usaram nos últimos 30 dias', String(t.usaramEm30Dias), `${t.bloqueadas} bloqueadas`],
          ['Clientes pagantes', String(t.pagantes), t.porPlano.filter((p) => p.total && p.codigo !== 'FREE').map((p) => `${p.nome} ${p.total}`).join(' · ') || 'Nenhum ainda'],
          ['Receita mensal pelos planos', reais(t.receitaMensal), 'Soma dos planos ativos'],
        ].map(([rotulo, valor, sub]) => (
          <div key={rotulo} className="rounded-card border border-border bg-white p-5 shadow-sm">
            <p className="text-sm text-text/60">{rotulo}</p>
            <p className="mt-1 text-3xl font-semibold text-primary">{valor}</p>
            <p className="mt-1 text-xs text-text/50">{sub}</p>
          </div>
        ))}
      </section>

      {aviso && <Aviso tipo="ok">{aviso}</Aviso>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <section className="flex flex-wrap items-center gap-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail, CNPJ ou cidade"
          className="min-w-[260px] flex-1 rounded-card border border-border bg-white px-3.5 py-2.5 text-sm"
        />
        {(
          [
            ['todas', 'Todas'],
            ['ativas', 'Ativas'],
            ['pagantes', 'Pagantes'],
            ['free', 'Free'],
            ['bloqueadas', 'Bloqueadas'],
          ] as [Filtro, string][]
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setFiltro(valor)}
            className={`rounded-card border px-3 py-2 text-sm font-semibold ${filtro === valor ? 'border-primary bg-primary text-white' : 'border-border bg-white'}`}
          >
            {rotulo}
          </button>
        ))}
      </section>

      <section className="overflow-x-auto rounded-card border border-border bg-white shadow-sm">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-text/60">
              <th className="px-4 py-3">Consultoria</th>
              <th className="px-4 py-3">Cadastro</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Uso</th>
              <th className="px-4 py-3">Último acesso</th>
              <th className="px-4 py-3">Situação</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => (
              <Fragment key={c.id}>
                <tr className={`border-b border-border align-top last:border-0 ${c.bloqueada ? 'bg-danger/5' : 'hover:bg-background'}`}>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => abrir(c.id)} className="text-left font-semibold text-primary hover:underline">
                      {c.nome}
                    </button>
                    {c.responsavel && (
                      <span className="block text-xs text-text/60">
                        {c.responsavel.nome} · <a href={`mailto:${c.responsavel.email}`} className="hover:underline">{c.responsavel.email}</a>
                      </span>
                    )}
                    {(c.cnpj || c.cidade) && <span className="block text-xs text-text/50">{[c.cnpj && `CNPJ ${c.cnpj}`, c.cidade].filter(Boolean).join(' · ')}</span>}
                    {c.observacaoAdm && <span className="mt-1 block text-xs italic text-text/60">Anotação: {c.observacaoAdm}</span>}
                  </td>
                  <td className="px-4 py-3 text-text/70">{data(c.criadaEm)}</td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Plano de ${c.nome}`}
                      value={c.plano}
                      onChange={(e) => alterar(c, { plano: e.target.value }, `Plano de ${c.nome} alterado.`)}
                      className="rounded-card border border-border bg-background px-2 py-1.5"
                    >
                      {painel.planos.map((p) => (
                        <option key={p.codigo} value={p.codigo}>
                          {p.nome} {p.precoMensal ? `(${reais(p.precoMensal)})` : ''}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 block text-xs text-text/50">
                      Até {c.limiteEmpresas >= ILIMITADO ? 'ilimitadas' : c.limiteEmpresas} empresa{c.limiteEmpresas === 1 ? '' : 's'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text/80">
                    <span className="block">{c.empresas} empresa{c.empresas === 1 ? '' : 's'}</span>
                    <span className="block text-xs text-text/60">{c.colaboradores} funcionários · {c.documentos} documentos · {c.usuarios} login{c.usuarios === 1 ? '' : 's'}</span>
                  </td>
                  <td className="px-4 py-3 text-text/70">{haQuanto(c.ultimoAcesso)}</td>
                  <td className="px-4 py-3">
                    {c.bloqueada ? (
                      <span className="font-semibold text-danger">Bloqueada{c.motivoBloqueio ? `: ${c.motivoBloqueio}` : ''}</span>
                    ) : (
                      <span className="font-semibold text-success">Ativa</span>
                    )}
                  </td>
                  <td className="space-y-2 px-4 py-3 text-right">
                    {c.bloqueada ? (
                      <Botao type="button" onClick={() => alterar(c, { bloqueada: false }, `${c.nome} foi liberada.`)} className="w-full">
                        Liberar
                      </Botao>
                    ) : (
                      <Botao type="button" variante="secundario" onClick={() => bloquear(c)} className="w-full">
                        Bloquear
                      </Botao>
                    )}
                    <button type="button" onClick={() => anotar(c)} className="block w-full text-center text-xs text-text/60 hover:text-primary">
                      Anotar
                    </button>
                  </td>
                </tr>
                {aberta === c.id && (
                  <tr className="border-b border-border bg-background">
                    <td colSpan={7} className="px-4 py-4">
                      {!detalhe ? (
                        <p className="text-sm text-text/60">Carregando…</p>
                      ) : (
                        <div className="grid gap-6 md:grid-cols-2">
                          <div>
                            <h3 className="mb-2 font-semibold">Empresas clientes ({detalhe.empresas.length})</h3>
                            {detalhe.empresas.length === 0 && <p className="text-sm text-text/60">Ainda não cadastrou empresas.</p>}
                            <ul className="space-y-1 text-sm">
                              {detalhe.empresas.map((e) => (
                                <li key={e.id}>
                                  <span className="font-medium">{e.razaoSocial}</span>
                                  <span className="text-xs text-text/60">
                                    {' '}· CNPJ {e.cnpj} · {e._count.colaboradores} funcionários · {e._count.documentos + e._count.arquivos} documentos · desde {data(e.createdAt)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h3 className="mb-2 font-semibold">Pessoas com login ({detalhe.usuarios.length})</h3>
                            <ul className="space-y-1 text-sm">
                              {detalhe.usuarios.map((u) => (
                                <li key={u.id}>
                                  <span className="font-medium">{u.nome}</span>
                                  <span className="text-xs text-text/60">
                                    {' '}· {u.email} · {u.papel === 'EMPRESA' ? `empresa ${u.empresa?.razaoSocial ?? ''}` : 'consultoria'} · {haQuanto(u.ultimoAcesso).toLowerCase()}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {lista.length === 0 && <p className="p-6 text-sm text-text/60">Nenhuma consultoria encontrada.</p>}
      </section>
      <p className="text-xs text-text/50">
        O plano é trocado aqui manualmente quando o cliente paga. Ao trocar, o limite de empresas acompanha o plano. Bloquear impede o login da consultoria e das empresas clientes dela; nada é apagado.
      </p>
    </main>
  );
}
