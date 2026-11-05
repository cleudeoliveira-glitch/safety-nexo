'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Aviso, Botao, Cartao } from '@/components/ui';
import { AvisoNormaConsultoria, avisosEmail, normas } from '@/lib/api';

const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : null);

function Situacao({ vigenciaEm }: { vigenciaEm: string | null }) {
  if (!vigenciaEm) return null;
  const dias = Math.ceil((new Date(vigenciaEm).getTime() - Date.now()) / 86400000);
  if (dias > 0) return <span className="rounded-full bg-warning px-2.5 py-0.5 text-xs font-semibold text-white">Começa a valer em {dias} dia(s) · {data(vigenciaEm)}</span>;
  return <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">Em vigor desde {data(vigenciaEm)}</span>;
}

// Mudanças nas normas (escritas pela equipe do Safety Nexo) e quais empresas clientes cada uma afeta.
export default function NormasPage() {
  const [lista, setLista] = useState<AvisoNormaConsultoria[] | null>(null);
  const [erro, setErro] = useState('');
  const [email, setEmail] = useState<{ avisosEmail: boolean; emailLigado: boolean; html: string } | null>(null);
  const [verPrevia, setVerPrevia] = useState(false);

  const carregar = () => normas.avisos().then(setLista).catch((e: Error) => setErro(e.message));
  useEffect(() => { carregar(); avisosEmail.previa().then(setEmail).catch(() => setEmail(null)); }, []);

  async function lido(a: AvisoNormaConsultoria) {
    try { await normas.lido(a.id); await carregar(); } catch (e) { setErro((e as Error).message); }
  }

  const novos = (lista ?? []).filter((a) => !a.lido);
  const lidos = (lista ?? []).filter((a) => a.lido);
  const Item = ({ a }: { a: AvisoNormaConsultoria }) => (
    <li className={`rounded-card border p-4 text-sm ${a.lido ? 'border-border' : 'border-primary bg-primary/5'}`}>
      <div className="flex flex-wrap items-center gap-2">
        {a.normas.map((n) => <span key={n} className="rounded-full bg-background px-2.5 py-0.5 text-xs font-semibold">{n}</span>)}
        <Situacao vigenciaEm={a.vigenciaEm} />
        {!a.lido && <span className="rounded-full bg-danger px-2.5 py-0.5 text-xs font-semibold text-white">Novo</span>}
      </div>
      <h3 className="mt-2 text-base font-semibold">{a.titulo}</h3>
      <p className="mt-1 whitespace-pre-wrap">{a.resumo}</p>
      {a.oQueFazer && <p className="mt-2 whitespace-pre-wrap rounded-card bg-background px-3 py-2"><strong>O que fazer:</strong> {a.oQueFazer}</p>}
      <p className="mt-2"><strong>Suas empresas afetadas ({a.empresas.length}):</strong>{' '}
        {a.empresas.length === 0 ? <span className="text-text/60">nenhuma pelos filtros deste aviso.</span> : a.empresas.map((e, i) => <span key={e.id}>{i > 0 && ', '}<Link className="text-primary underline" href={`/empresas/${e.id}`}>{e.razaoSocial}</Link></span>)}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        {a.linkOficial && <a className="text-sm font-semibold text-primary underline" href={a.linkOficial} target="_blank" rel="noreferrer">Ler o texto oficial</a>}
        {!a.lido && <Botao variante="secundario" onClick={() => lido(a)}>Marcar como lido</Botao>}
      </div>
    </li>
  );

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-10">
      <div>
        <h1 className="text-2xl font-bold text-primary">Avisos e mudanças nas normas</h1>
        <p className="mt-1 text-sm text-text/70">Quando uma NR muda, a equipe do Safety Nexo explica aqui o que mudou, o que fazer e mostra quais das suas empresas são afetadas.</p>
      </div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <Cartao titulo={`Novos (${novos.length})`}>
        {lista === null ? <p className="text-sm text-text/60">Carregando…</p> : novos.length === 0 ? <p className="text-sm text-text/60">Nenhuma mudança nova. Você está em dia.</p> : <ul className="space-y-3">{novos.map((a) => <Item key={a.id} a={a} />)}</ul>}
      </Cartao>
      {lidos.length > 0 && <Cartao titulo="Já lidos"><ul className="space-y-3">{lidos.map((a) => <Item key={a.id} a={a} />)}</ul></Cartao>}

      <Cartao titulo="Resumo semanal por e-mail">
        {!email ? <p className="text-sm text-text/60">Carregando…</p> : (
          <div className="space-y-3 text-sm">
            <p>Toda segunda-feira, um e-mail com o que venceu, o que vence nos próximos 30 dias e as mudanças de norma não lidas. O login de cada empresa cliente recebe só a dela.</p>
            {!email.emailLigado && <Aviso tipo="info">O envio de e-mails ainda não foi ligado no servidor. Você já pode ver como vai ficar.</Aviso>}
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" checked={email.avisosEmail} onChange={async (e) => { const r = await avisosEmail.preferencia(e.target.checked); setEmail({ ...email, avisosEmail: r.avisosEmail }); }} />
              Quero receber o resumo semanal
            </label>
            <Botao variante="secundario" onClick={() => setVerPrevia(!verPrevia)}>{verPrevia ? 'Esconder a prévia' : 'Ver como fica o e-mail desta semana'}</Botao>
            {verPrevia && <iframe title="Prévia do e-mail" className="h-[520px] w-full rounded-card border border-border bg-white" srcDoc={email.html} sandbox="" />}
          </div>
        )}
      </Cartao>
    </main>
  );
}
