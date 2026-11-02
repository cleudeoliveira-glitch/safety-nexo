'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { CertificadoValidado, validarCertificado } from '@/lib/api';

const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

// Página pública aberta pelo QR Code do certificado. Não precisa de login.
export default function ValidarPage({ params }: { params: { codigo: string } }) {
  const [resultado, setResultado] = useState<CertificadoValidado | null | undefined>(undefined);
  const [erro, setErro] = useState('');

  useEffect(() => {
    validarCertificado(params.codigo).then(setResultado).catch((e: Error) => setErro(e.message));
  }, [params.codigo]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
      <Image src="/logo.png" alt="Safety Nexo" width={120} height={48} className="mb-6 h-10 w-auto self-start" />
      <section className="rounded-card border border-border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-primary">Validação de certificado</h1>
        <p className="mt-1 font-mono text-sm text-text/60">{decodeURIComponent(params.codigo)}</p>

        {erro && <p className="mt-4 text-sm text-danger">{erro}</p>}
        {resultado === undefined && !erro && <p className="mt-4 text-sm">Consultando…</p>}
        {resultado === null && (
          <p className="mt-4 rounded-card border border-danger px-4 py-3 text-sm text-danger">
            Não encontramos um certificado com este código. Ele pode ter sido digitado errado ou não ter sido emitido pelo Safety Nexo.
          </p>
        )}
        {resultado && (
          <>
            <p className={`mt-4 rounded-card px-4 py-3 text-center font-semibold text-white ${resultado.situacao === 'VALIDO' ? 'bg-success' : 'bg-danger'}`}>
              {resultado.situacao === 'VALIDO' ? 'Certificado autêntico e dentro da validade' : 'Certificado autêntico, mas vencido'}
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              {[
                ['Participante', resultado.participante + (resultado.cpf ? ` · CPF ${resultado.cpf}` : '')],
                ['Treinamento', (resultado.norma ? `${resultado.norma} · ` : '') + resultado.treinamento],
                ['Carga horária', `${resultado.cargaHoraria} horas`],
                ['Realizado em', resultado.inicio === resultado.fim ? data(resultado.inicio) : `${data(resultado.inicio)} a ${data(resultado.fim)}`],
                ['Validade', resultado.validade ? data(resultado.validade) : 'Sem validade fixa'],
                ['Instrutor(a)', resultado.instrutor],
                ['Empresa', resultado.empresa],
                ['Emitido por', resultado.consultoria],
              ].map(([rotulo, valor]) => (
                <div key={rotulo} className="flex justify-between gap-4 border-b border-border pb-2">
                  <dt className="text-text/60">{rotulo}</dt>
                  <dd className="text-right font-medium">{valor}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </section>
    </main>
  );
}
