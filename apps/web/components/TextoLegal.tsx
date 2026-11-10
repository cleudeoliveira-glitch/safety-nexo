import Link from 'next/link';

// Moldura simples para as páginas de privacidade e termos: leitura confortável no celular e no computador.
export function TextoLegal({ titulo, atualizado, children }: { titulo: string; atualizado: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm font-semibold text-primary hover:underline">← Voltar</Link>
      <h1 className="mt-4 text-3xl font-semibold text-primary">{titulo}</h1>
      <p className="mt-1 text-sm text-text/60">Atualizado em {atualizado}</p>
      <div className="mt-8 space-y-4 leading-relaxed text-text [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-primary [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
      <p className="mt-10 border-t border-border pt-4 text-sm text-text/60">
        <Link href="/privacidade" className="hover:underline">Política de privacidade</Link> · <Link href="/termos" className="hover:underline">Termos de uso</Link>
      </p>
    </main>
  );
}
