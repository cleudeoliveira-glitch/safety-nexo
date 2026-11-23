// Caminho de quem chega ao Safety Nexo: conhece o sistema, escolhe o plano, cria a conta, paga e entra.
const PASSOS = ['Escolha o plano', 'Seus dados', 'Pagamento', 'Acesse o sistema'];

export function PassosCompra({ atual, gratis = false }: { atual: 1 | 2 | 3 | 4; gratis?: boolean }) {
  return (
    <ol className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm" aria-label="Etapas">
      {PASSOS.map((nome, i) => {
        const n = i + 1;
        const pula = gratis && n === 3;
        const feito = n < atual;
        const agora = n === atual;
        return (
          <li key={nome} className={`flex min-w-0 flex-1 items-center gap-1.5 ${pula ? 'opacity-40' : ''}`}>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                feito ? 'bg-success text-white' : agora ? 'bg-primary text-white' : 'bg-border text-text/60'
              }`}
            >
              {feito ? '✓' : n}
            </span>
            <span className={`hidden truncate sm:inline ${agora ? 'font-semibold text-primary' : 'text-text/60'}`}>{pula ? 'Sem pagamento' : nome}</span>
            {n < PASSOS.length && <span className="h-px flex-1 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}

// No celular os nomes somem: mostra só o da etapa atual.
export function NomePasso({ atual }: { atual: 1 | 2 | 3 | 4 }) {
  return <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-text/60 sm:hidden">Etapa {atual} de 4 · {PASSOS[atual - 1]}</p>;
}

export function TopoSite({ direita }: { direita?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <a href="/"><img src="/logo.png" alt="Safety Nexo" className="h-10 w-auto" /></a>
      {direita}
    </header>
  );
}
