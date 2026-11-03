'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ConferenciaAssinatura, conferirAssinatura } from '@/lib/api';

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });

// Página pública aberta pelo QR da folha de assinaturas.
export default function ConferirAssinaturaPage({ params }: { params: { codigo: string } }) {
  const [r, setR] = useState<ConferenciaAssinatura | null>(null);
  const [erro, setErro] = useState('');
  useEffect(() => { conferirAssinatura(params.codigo).then(setR).catch((e: Error) => setErro(e.message)); }, [params.codigo]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-4 sm:p-6">
      <Image src="/logo.png" alt="Safety Nexo" width={120} height={48} className="mb-6 h-10 w-auto self-start" />
      <section className="rounded-card border border-border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-primary">Conferência de assinaturas</h1>
        <p className="mt-1 font-mono text-sm text-text/60">{decodeURIComponent(params.codigo).toUpperCase()}</p>
        {erro && <p className="mt-4 rounded-card border border-danger px-4 py-3 text-sm text-danger">{erro}</p>}
        {!r && !erro && <p className="mt-4 text-sm">Consultando…</p>}
        {r && (<>
          <p className={`mt-4 rounded-card px-4 py-3 text-center font-semibold text-white ${r.status === 'CONCLUIDO' ? 'bg-success' : r.status === 'CANCELADO' ? 'bg-danger' : 'bg-warning'}`}>
            {r.status === 'CONCLUIDO' ? 'Documento assinado por todos' : r.status === 'CANCELADO' ? 'Pedido de assinatura cancelado' : 'Assinaturas ainda em andamento'}
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div><dt className="font-semibold">Documento</dt><dd>{r.titulo}</dd></div>
            <div><dt className="font-semibold">Empresa</dt><dd>{r.empresa}</dd></div>
            <div><dt className="font-semibold">Emitido por</dt><dd>{r.consultoria}</dd></div>
            {r.icpTitular && <div><dt className="font-semibold">Certificado ICP-Brasil</dt><dd>{r.icpTitular}</dd></div>}
          </dl>
          <h2 className="mt-5 font-semibold">Quem assinou</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {r.signatarios.map((s, i) => (
              <li key={i} className="rounded-card border border-border px-3 py-2">
                <strong>{s.nome}</strong>{s.cpf ? ` · CPF ${s.cpf}` : ''}<br />{s.papel}<br />
                <span className={s.assinadoEm ? 'text-success' : 'text-text/50'}>{s.assinadoEm ? `Assinou em ${dataHora(s.assinadoEm)}${s.comLocalizacao ? ', com local registrado' : ''}` : 'Ainda não assinou'}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 break-all text-xs text-text/50">SHA-256 do original: {r.hashOriginal}{r.hashFinal ? <><br />SHA-256 do PDF assinado: {r.hashFinal}</> : null}</p>
        </>)}
      </section>
    </main>
  );
}
