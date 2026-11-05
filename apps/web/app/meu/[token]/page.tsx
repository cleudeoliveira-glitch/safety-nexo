'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Botao } from '@/components/ui';
import { meuEspaco, MeuEspaco } from '@/lib/api';

const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const TIPO_ASO: Record<string, string> = { ADMISSIONAL: 'Admissional', PERIODICO: 'Periódico', RETORNO_TRABALHO: 'Retorno ao trabalho', MUDANCA_RISCO: 'Mudança de risco', DEMISSIONAL: 'Demissional' };
const mascara = (v: string) => v.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <section className="rounded-card border border-border bg-white p-4 shadow-sm"><h2 className="mb-2 font-semibold text-primary">{titulo}</h2>{children}</section>;
}

// Espaço do trabalhador: link pessoal + CPF. Mostra só o que é da própria pessoa.
export default function MeuEspacoPage({ params }: { params: { token: string } }) {
  const [inicio, setInicio] = useState<{ primeiroNome: string; empresa: string } | null>(null);
  const [cpf, setCpf] = useState('');
  const [dados, setDados] = useState<MeuEspaco | null>(null);
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);

  useEffect(() => { meuEspaco.abrir(params.token).then(setInicio).catch((e: Error) => setErro(e.message)); }, [params.token]);

  async function entrar(ev: React.FormEvent) {
    ev.preventDefault(); setEntrando(true); setErro('');
    try { setDados(await meuEspaco.entrar(params.token, cpf)); } catch (e) { setErro((e as Error).message); } finally { setEntrando(false); }
  }

  const proximoAso = dados?.asos.find((a) => a.proximoExame)?.proximoExame ?? null;
  return (
    <main className="mx-auto max-w-lg space-y-4 p-4 sm:p-6">
      <Image src="/logo.png" alt="Safety Nexo" width={120} height={48} className="h-10 w-auto" />
      {!inicio && !erro && <p>Carregando…</p>}
      {!inicio && erro && <p className="text-danger">{erro}</p>}
      {inicio && !dados && (
        <form onSubmit={entrar} className="space-y-4 rounded-card border border-border bg-white p-5 shadow-sm">
          <h1 className="text-xl font-semibold text-primary">Olá, {inicio.primeiroNome}!</h1>
          <p className="text-sm text-text/70">Este é o seu espaço na {inicio.empresa}: seus exames, EPIs, treinamentos e o que falta assinar.</p>
          <label htmlFor="cpf" className="block text-sm font-semibold">Para entrar, digite o seu CPF</label>
          <input id="cpf" inputMode="numeric" autoComplete="off" value={cpf} onChange={(e) => setCpf(mascara(e.target.value))} className="w-full rounded-card border border-border bg-background px-3 py-2 text-lg" placeholder="000.000.000-00" />
          {erro && <p className="text-sm text-danger">{erro}</p>}
          <Botao type="submit" className="w-full py-3" disabled={cpf.replace(/\D/g, '').length !== 11 || entrando}>{entrando ? 'Entrando…' : 'Entrar'}</Botao>
        </form>
      )}
      {dados && (<>
        <div>
          <h1 className="text-xl font-semibold text-primary">{dados.nome}</h1>
          <p className="text-sm text-text/70">{dados.cargo} · {dados.empresa}</p>
        </div>
        {(dados.assinar.length > 0 || dados.votar) && (
          <Bloco titulo="Para fazer agora">
            <ul className="space-y-2 text-sm">
              {dados.votar && <li><a className="block rounded-card bg-primary px-4 py-3 font-semibold text-white" href={dados.votar}>🗳️ Votar na eleição da CIPA</a></li>}
              {dados.assinar.map((a) => <li key={a.link}><a className="block rounded-card border border-primary px-4 py-3 font-semibold text-primary" href={a.link}>✍️ Assinar: {a.titulo}</a></li>)}
            </ul>
          </Bloco>
        )}
        <Bloco titulo="Exames (ASO)">
          {proximoAso && <p className="mb-2 rounded-card bg-background px-3 py-2 text-sm">Próximo exame: <strong>{data(proximoAso)}</strong></p>}
          {dados.asos.length === 0 ? <p className="text-sm text-text/60">Nenhum ASO registrado.</p> : (
            <ul className="divide-y divide-border text-sm">{dados.asos.map((a, i) => <li key={i} className="flex justify-between py-2"><span>{TIPO_ASO[a.tipo] ?? a.tipo} · {data(a.dataExame)}</span><strong className={a.resultado === 'APTO' ? 'text-success' : 'text-danger'}>{a.resultado === 'APTO' ? 'Apto' : 'Inapto'}</strong></li>)}</ul>
          )}
        </Bloco>
        <Bloco titulo="EPIs que você recebeu">
          {dados.epis.length === 0 ? <p className="text-sm text-text/60">Nenhuma entrega registrada.</p> : (
            <ul className="divide-y divide-border text-sm">{dados.epis.map((e, i) => <li key={i} className="py-2"><strong>{e.epi}</strong> · CA {e.ca} · {e.quantidade} un. · {data(e.dataEntrega)}</li>)}</ul>
          )}
        </Bloco>
        <Bloco titulo="Treinamentos">
          {dados.treinamentos.length === 0 ? <p className="text-sm text-text/60">Nenhum treinamento registrado.</p> : (
            <ul className="divide-y divide-border text-sm">{dados.treinamentos.map((t, i) => (
              <li key={i} className="py-2">
                <strong>{t.nome}</strong>{t.norma ? ` (${t.norma})` : ''} · {t.cargaHoraria} h · {data(t.concluidoEm)}
                <br /><span className={t.vencido ? 'text-danger' : 'text-text/60'}>{t.validade ? `${t.vencido ? 'Venceu' : 'Vale até'} ${data(t.validade)}` : 'Sem validade fixa'}</span>
                {' · '}<a className="text-primary underline" href={t.certificado} target="_blank" rel="noreferrer">certificado</a>
              </li>
            ))}</ul>
          )}
        </Bloco>
        {dados.relato && <a href={dados.relato} className="block rounded-card border border-border bg-white px-4 py-3 text-center text-sm font-semibold">⚠️ Viu algum perigo? Relatar (pode ser anônimo)</a>}
        <p className="text-center text-xs text-text/50">Segurança do trabalho: {dados.consultoria}</p>
      </>)}
    </main>
  );
}
