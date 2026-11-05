'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Icone } from '@/components/Icone';
import { RoteiroDds } from '@/components/RoteiroDds';
import { buscarConteudoOperacao, TemaDds } from '@/lib/api';
import { lerFoco } from '@/lib/empresaFoco';
import { lerToken } from '@/lib/sessao';

// Biblioteca de DDS: os 150 temas com o roteiro completo, para consultar no campo pelo celular.
// Depois de aberta uma vez, fica guardada no aparelho e abre mesmo sem internet.
const CHAVE = 'safety-nexo:biblioteca-dds';

const semAcento = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function lerGuardado(): TemaDds[] | null {
  try {
    const t = JSON.parse(localStorage.getItem(CHAVE) ?? 'null');
    return Array.isArray(t) && t.length ? t : null;
  } catch {
    return null;
  }
}

export default function BibliotecaDds() {
  const [temas, setTemas] = useState<TemaDds[] | null>(null);
  const [semInternet, setSemInternet] = useState(false);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [aberto, setAberto] = useState<TemaDds | null>(null);
  const [empresaId, setEmpresaId] = useState('');

  useEffect(() => {
    if (!lerToken()) {
      window.location.href = '/entrar';
      return;
    }
    setEmpresaId(lerFoco() ?? '');
    const guardado = lerGuardado();
    if (guardado) setTemas(guardado);
    buscarConteudoOperacao()
      .then((c) => {
        setTemas(c.temasDds);
        setSemInternet(false);
        try {
          localStorage.setItem(CHAVE, JSON.stringify(c.temasDds));
        } catch {}
      })
      .catch(() => setSemInternet(true));
  }, []);

  // Abre direto um tema pelo endereço (#nome-do-tema), para mandar o link a alguém.
  useEffect(() => {
    if (!temas) return;
    const h = decodeURIComponent(window.location.hash.slice(1));
    if (h) setAberto(temas.find((t) => t.tema === h) ?? null);
  }, [temas]);

  const categorias = useMemo(() => [...new Set((temas ?? []).map((t) => t.categoria))].sort(), [temas]);
  const filtrados = useMemo(() => {
    const termo = semAcento(busca.trim());
    return (temas ?? []).filter(
      (t) => (!categoria || t.categoria === categoria) && (!termo || semAcento(`${t.tema} ${t.categoria} ${t.conteudo} ${t.dinamica}`).includes(termo)),
    );
  }, [temas, busca, categoria]);

  function abrir(t: TemaDds | null) {
    setAberto(t);
    history.replaceState(null, '', t ? `#${encodeURIComponent(t.tema)}` : window.location.pathname);
    window.scrollTo({ top: 0 });
  }

  function sortear() {
    const lista = filtrados.length ? filtrados : temas ?? [];
    if (lista.length) abrir(lista[Math.floor(Math.random() * lista.length)]);
  }

  if (aberto) {
    const i = filtrados.findIndex((t) => t.tema === aberto.tema);
    const anterior = i > 0 ? filtrados[i - 1] : null;
    const proximo = i >= 0 && i < filtrados.length - 1 ? filtrados[i + 1] : null;
    return (
      <main className="mx-auto max-w-3xl p-4 md:p-8">
        <button type="button" onClick={() => abrir(null)} className="text-sm font-semibold text-primary">← Todos os temas</button>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-text/50">{aberto.categoria}</p>
        <h1 className="mt-1 text-2xl font-bold text-primary md:text-3xl">{aberto.tema}</h1>
        <p className="mt-2 text-sm text-text/60">Siga na ordem: conte o caso, fale, faça a dinâmica e termine com a pergunta. Leva de 5 a 10 minutos.</p>
        <div className="mt-5">
          <RoteiroDds tema={aberto} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {empresaId && (
            <Link
              href={`/empresas/${empresaId}/operacao?tema=${encodeURIComponent(aberto.tema)}#dds`}
              className="rounded-card bg-primary px-5 py-3 font-semibold text-white"
            >
              Registrar este DDS e tirar a lista de presença
            </Link>
          )}
          <button type="button" onClick={sortear} className="rounded-card border border-border bg-white px-5 py-3 font-semibold">Sortear outro tema</button>
        </div>
        <div className="mt-6 flex justify-between gap-3 text-sm">
          {anterior ? <button type="button" onClick={() => abrir(anterior)} className="text-left font-semibold text-primary">← {anterior.tema}</button> : <span />}
          {proximo ? <button type="button" onClick={() => abrir(proximo)} className="text-right font-semibold text-primary">{proximo.tema} →</button> : <span />}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-4 md:p-8">
      <section className="fundo-destaque rounded-3xl p-6 text-white shadow-lg shadow-primary/20 md:p-8">
        <p className="text-sm font-medium uppercase tracking-wider text-white/70">Dia a dia</p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">Biblioteca de DDS</h1>
        <p className="mt-2 max-w-2xl text-white/85">
          {temas ? temas.length : 150} temas prontos. Cada um tem um caso para contar, o que falar, uma dinâmica vivencial de 3 minutos
          para a equipe participar e uma pergunta para fechar. Deu branco no campo? Abra aqui pelo celular.
        </p>
        <button type="button" onClick={sortear} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-primary shadow-sm hover:bg-menta">
          <Icone nome="brilho" className="h-4 w-4" /> Sortear um tema para hoje
        </button>
      </section>

      {semInternet && (
        <p className="mt-4 rounded-card border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          {temas ? 'Sem internet: mostrando os temas guardados neste aparelho.' : 'Sem internet e nada guardado ainda. Abra esta tela uma vez com internet para ela funcionar no campo.'}
        </p>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_260px]">
        <div>
          <label htmlFor="dds-busca" className="sr-only">Procurar tema</label>
          <input
            id="dds-busca"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Procure: escada, forno, extintor, calor..."
            className="w-full rounded-card border border-border bg-white px-4 py-3 text-base"
          />
        </div>
        <div>
          <label htmlFor="dds-categoria" className="sr-only">Assunto</label>
          <select id="dds-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full rounded-card border border-border bg-white px-3 py-3">
            <option value="">Todos os assuntos</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {!temas && !semInternet && <p className="mt-6 text-text/60">Carregando os temas…</p>}
      {temas && (
        <p className="mt-4 text-sm text-text/60">
          {filtrados.length} de {temas.length} temas
        </p>
      )}
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.map((t) => (
          <li key={t.tema}>
            <button
              type="button"
              onClick={() => abrir(t)}
              className="h-full w-full rounded-2xl border border-border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-text/50">{t.categoria}</span>
              <span className="mt-1 block font-semibold text-primary">{t.tema}</span>
              <span className="mt-2 line-clamp-2 block text-sm text-text/70">{t.dinamica || t.conteudo}</span>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">Com dinâmica vivencial</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
