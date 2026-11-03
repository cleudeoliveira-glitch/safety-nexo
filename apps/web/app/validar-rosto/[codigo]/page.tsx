'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { rosto } from '@/lib/api';

type Resultado = Awaited<ReturnType<typeof rosto.validar>>;

// Página pública aberta pelo QR Code do comprovante facial. Não precisa de login e não mostra a foto.
export default function ValidarRostoPage({ params }: { params: { codigo: string } }) {
  const [r, setR] = useState<Resultado | null>(null);
  const [erro, setErro] = useState('');
  useEffect(() => { rosto.validar(params.codigo).then(setR).catch((e: Error) => setErro(e.message)); }, [params.codigo]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
      <Image src="/logo.png" alt="Safety Nexo" width={120} height={48} className="mb-6 h-10 w-auto self-start" />
      <section className="rounded-card border border-border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-primary">Validação de comprovante facial</h1>
        <p className="mt-1 font-mono text-sm text-text/60">{decodeURIComponent(params.codigo)}</p>
        {erro && <p className="mt-4 rounded-card border border-danger px-4 py-3 text-sm text-danger">{erro}</p>}
        {!r && !erro && <p className="mt-4 text-sm">Consultando…</p>}
        {r && (
          <>
            <p className="mt-4 rounded-card bg-success px-4 py-3 text-center font-semibold text-white">Comprovante autêntico: {r.titulo} confirmada pelo rosto</p>
            <dl className="mt-4 space-y-2 text-sm">
              {([['Funcionário', r.colaborador + (r.cpf ? ` · CPF ${r.cpf}` : '')], ...r.itens, ['Data e hora', new Date(r.em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })], ['Local registrado', r.comLocal ? 'Sim' : 'Não'], ['Empresa', r.empresa]] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border pb-2"><dt className="text-text/60">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
              ))}
            </dl>
            <p className="mt-4 break-all font-mono text-[11px] text-text/50">Hash SHA-256: {r.hash}</p>
          </>
        )}
      </section>
    </main>
  );
}
