'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { DocumentoValidado, validarDocumento } from '@/lib/api';

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'long', timeStyle: 'short' });

// Página pública aberta pelo QR Code do rodapé dos documentos (PGR, PCMSO, OS, APR...). Não precisa de login.
export default function ValidarDocumentoPage({ params }: { params: { codigo: string } }) {
  const codigo = decodeURIComponent(params.codigo);
  const [resultado, setResultado] = useState<DocumentoValidado | null | undefined>(undefined);
  const [erro, setErro] = useState('');

  useEffect(() => {
    validarDocumento(codigo).then(setResultado).catch((e: Error) => setErro(e.message));
  }, [codigo]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
      <Image src="/logo.png" alt="Safety Nexo" width={120} height={48} className="mb-6 h-10 w-auto self-start" />
      <section className="rounded-card border border-border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-primary">Validação de documento</h1>
        <p className="mt-1 font-mono text-sm text-text/60">{codigo}</p>

        {erro && <p className="mt-4 text-sm text-danger">{erro}</p>}
        {resultado === undefined && !erro && <p className="mt-4 text-sm">Consultando…</p>}
        {resultado === null && (
          <p className="mt-4 rounded-card border border-danger px-4 py-3 text-sm text-danger">
            Não encontramos um documento com este código. Ele pode ter sido digitado errado ou não ter sido emitido pelo Safety Nexo.
          </p>
        )}
        {resultado && (
          <>
            <p className="mt-4 rounded-card bg-success px-4 py-3 text-center font-semibold text-white">Documento autêntico, emitido pelo Safety Nexo</p>
            <dl className="mt-4 space-y-2 text-sm">
              {[
                ['Documento', resultado.titulo],
                ['Empresa', resultado.empresa ?? '—'],
                ['Elaborado por', resultado.consultoria],
                ['Responsável técnico', resultado.responsavel ?? '—'],
                ['Emitido em', dataHora(resultado.emitidoEm)],
                ['Páginas', resultado.paginas ? String(resultado.paginas) : '—'],
              ].map(([rotulo, valor]) => (
                <div key={rotulo} className="flex justify-between gap-4 border-b border-border pb-2">
                  <dt className="text-text/60">{rotulo}</dt>
                  <dd className="text-right font-medium">{valor}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-text/60">
              Confira se o título, a empresa, a data e o número de páginas batem com o documento que você tem em mãos. Se algo for diferente, o documento pode ter sido alterado depois de emitido.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
