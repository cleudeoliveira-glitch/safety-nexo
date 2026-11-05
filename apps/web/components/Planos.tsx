import { INCLUSO_EM_TODOS, PLANOS_SITE, PlanoSite, reais, textoLimite } from '@/lib/planos';

// Cartões dos planos. "acao" desenha o botão de cada cartão (no site: criar conta; dentro do sistema: pedir o plano).
export function GradePlanos({ atual, acao }: { atual?: string; acao: (p: PlanoSite) => React.ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {PLANOS_SITE.map((p) => {
        const ehAtual = atual === p.codigo;
        return (
          <div
            key={p.codigo}
            className={`flex flex-col rounded-card border bg-white p-5 shadow-sm ${ehAtual ? 'border-success ring-2 ring-success/30' : p.destaque ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}
          >
            <div className="mb-2 flex min-h-6 flex-wrap gap-1.5">
              {ehAtual && <span className="rounded-full bg-success px-2.5 py-0.5 text-xs font-semibold text-white">Seu plano</span>}
              {!ehAtual && p.destaque && <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">Recomendado</span>}
            </div>
            <h3 className="text-lg font-semibold text-primary">{p.nome}</h3>
            <p className="mt-1">
              <span className="text-3xl font-bold">{reais(p.precoMensal)}</span>
              {p.precoMensal > 0 && <span className="text-sm text-text/60"> por mês</span>}
            </p>
            <p className="mt-3 font-semibold">{textoLimite(p.limiteEmpresas)}</p>
            <p className="mt-1 text-sm text-text/60">Funcionários sem limite em cada empresa</p>
            <p className="mt-1 text-sm text-text/60">Todos os módulos do sistema</p>
            <p className="mt-3 flex-1 text-sm text-text/70">{p.paraQuem}</p>
            <div className="mt-4">{acao(p)}</div>
          </div>
        );
      })}
    </div>
  );
}

export function InclusoEmTodos() {
  return (
    <div>
      <h2 className="text-xl font-semibold">O que vem em todos os planos</h2>
      <p className="mt-1 text-sm text-text/60">Nenhum módulo fica de fora. O que muda de um plano para outro é só quantas empresas clientes você atende.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INCLUSO_EM_TODOS.map((g) => (
          <div key={g.grupo} className="rounded-card border border-border bg-white p-5">
            <h3 className="font-semibold text-primary">{g.grupo}</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {g.itens.map((i) => (
                <li key={i} className="flex gap-2"><span className="text-success" aria-hidden>✓</span><span>{i}</span></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
