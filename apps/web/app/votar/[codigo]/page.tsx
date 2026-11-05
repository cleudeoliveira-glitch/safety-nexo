'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Botao } from '@/components/ui';
import { Cedula, votoPublico } from '@/lib/api';

const quando = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

// Cédula da CIPA no celular. O voto é secreto: o sistema registra que a pessoa votou, mas não em quem.
export default function VotarPage({ params }: { params: { codigo: string } }) {
  const [c, setC] = useState<Cedula | null>(null);
  const [erro, setErro] = useState('');
  const [escolha, setEscolha] = useState('');
  const [cpf, setCpf] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(false);

  useEffect(() => { votoPublico.cedula(params.codigo).then(setC).catch((e: Error) => setErro(e.message)); }, [params.codigo]);

  async function votar() {
    setEnviando(true); setErro('');
    try { await votoPublico.votar(params.codigo, { escolha, cpfInicio: cpf || undefined }); setFeito(true); }
    catch (e) { setErro((e as Error).message); setConfirmar(false); } finally { setEnviando(false); }
  }

  const nomeEscolha = escolha === 'BRANCO' ? 'Voto em branco' : c?.candidatos.find((x) => x.id === escolha)?.nome;

  return (
    <main className="mx-auto max-w-lg p-4 sm:p-6">
      <Image src="/logo.png" alt="Safety Nexo" width={120} height={48} className="mb-5 h-10 w-auto" />
      <section className="rounded-card border border-border bg-white p-5 shadow-sm">
        {!c && !erro && <p>Carregando…</p>}
        {!c && erro && <p className="text-danger">{erro}</p>}
        {c && (feito || c.votou) && (
          <div className="space-y-3 text-center">
            <p className="text-5xl">🗳️</p>
            <h1 className="text-xl font-semibold text-primary">{feito ? 'Voto registrado. Obrigado!' : 'Você já votou nesta eleição.'}</h1>
            <p className="text-sm text-text/70">O voto é secreto: ninguém, nem a empresa, consegue ver em quem você votou.</p>
          </div>
        )}
        {c && !feito && !c.votou && (<>
          <h1 className="text-xl font-semibold text-primary">Eleição da CIPA</h1>
          <p className="mt-1 text-sm text-text/70">{c.empresa} · Olá, {c.primeiroNome}!</p>
          {!c.aberta ? (
            <p className="mt-4 rounded-card bg-background px-4 py-3 text-sm">A votação não está aberta agora. Ela vai de <strong>{quando(c.inicio)}</strong> até <strong>{quando(c.fim)}</strong>.</p>
          ) : (<>
            <p className="mt-3 rounded-card bg-background px-4 py-3 text-sm"><strong>Seu voto é secreto.</strong> Escolha um candidato. Vote até {quando(c.fim)}.</p>
            <div className="mt-4 space-y-2" role="radiogroup" aria-label="Candidatos">
              {[...c.candidatos.map((x) => ({ id: x.id, nome: x.nome, sub: x.cargo })), { id: 'BRANCO', nome: 'Votar em branco', sub: '' }].map((x) => (
                <button key={x.id} type="button" role="radio" aria-checked={escolha === x.id} onClick={() => { setEscolha(x.id); setConfirmar(false); }}
                  className={`w-full rounded-card p-3 text-left ${escolha === x.id ? 'bg-primary text-white' : 'border border-border bg-white'}`}>
                  <span className="block font-semibold">{x.nome}</span>{x.sub && <span className="text-sm opacity-80">{x.sub}</span>}
                </button>
              ))}
            </div>
            {c.pedeCpf && (
              <div className="mt-4">
                <label htmlFor="cpf3" className="block text-sm font-semibold">Para confirmar que é você: os 3 primeiros números do seu CPF</label>
                <input id="cpf3" inputMode="numeric" maxLength={3} value={cpf} onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))} className="mt-2 w-32 rounded-card border border-border bg-background px-3 py-2 text-lg tracking-widest" />
              </div>
            )}
            {erro && <p className="mt-4 text-sm text-danger">{erro}</p>}
            {!confirmar ? (
              <Botao className="mt-6 w-full py-3 text-base" disabled={!escolha || (c.pedeCpf && cpf.length !== 3)} onClick={() => setConfirmar(true)}>Continuar</Botao>
            ) : (
              <div className="mt-6 space-y-2 rounded-card border border-primary p-4 text-center">
                <p>Confirma o voto em <strong>{nomeEscolha}</strong>? Depois não dá para mudar.</p>
                <Botao className="w-full py-3 text-base" disabled={enviando} onClick={votar}>{enviando ? 'Registrando…' : 'Confirmar voto'}</Botao>
                <button type="button" className="text-sm text-text/60 underline" onClick={() => setConfirmar(false)}>Voltar</button>
              </div>
            )}
          </>)}
        </>)}
      </section>
    </main>
  );
}
