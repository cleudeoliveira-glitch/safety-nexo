import Link from 'next/link';

// Endereço que não existe no sistema (link antigo, digitado errado ou item apagado).
export default function PaginaNaoEncontrada() {
  return (
    <main className="mx-auto max-w-lg space-y-4 p-10 text-center">
      <h1 className="text-2xl font-semibold text-primary">Página não encontrada</h1>
      <p className="text-text/70">Este endereço não existe ou o item foi apagado. Volte para o painel e siga pelo menu.</p>
      <Link href="/" className="inline-block rounded-card bg-primary px-4 py-2.5 text-sm font-semibold text-white">Ir para o painel</Link>
    </main>
  );
}
