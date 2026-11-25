import Link from 'next/link';
import { INCLUSO_EM_TODOS, PLANOS_SITE, PlanoSite, precoAnual, reais } from '@/lib/planos';

// Cartões dos planos. "acao" desenha o botão de cada cartão (no site: criar conta; dentro do sistema: pedir o plano).
// "codigos" escolhe quais planos aparecem (a página inicial mostra só três). "semDetalhes" esconde a lista "o que vem".
export function GradePlanos({ atual, acao, codigos, semDetalhes }: { atual?: string; acao: (p: PlanoSite) => React.ReactNode; codigos?: string[]; semDetalhes?: boolean }) {
  const lista = codigos ? PLANOS_SITE.filter((p) => codigos.includes(p.codigo)) : PLANOS_SITE;
  // Cartões largos: um por linha no celular, dois no tablet e até três no computador (5 planos = 3 + 2, centralizados).
  const largura = lista.length <= 3 ? 'w-full md:w-[calc((100%-3rem)/3)]' : 'w-full md:w-[calc((100%-1.5rem)/2)] xl:w-[calc((100%-3rem)/3)]';
  return (
    <div className="flex flex-wrap items-stretch justify-center gap-6">
      {lista.map((p) => (
        <CartaoPlano key={p.codigo} p={p} atual={atual === p.codigo} acao={acao(p)} semDetalhes={semDetalhes} className={largura} />
      ))}
    </div>
  );
}

function CartaoPlano({ p, atual, acao, semDetalhes, className }: { p: PlanoSite; atual: boolean; acao: React.ReactNode; semDetalhes?: boolean; className: string }) {
  const destaque = p.destaque && !atual;
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm sm:p-7 ${className} ${atual ? 'border-success ring-2 ring-success/30' : destaque ? 'border-primary ring-2 ring-primary shadow-lg' : 'border-border'}`}
    >
      {(atual || destaque) && (
        <span className={`absolute -top-3.5 left-6 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm ${atual ? 'bg-success' : 'bg-primary'}`}>
          {atual ? 'Seu plano' : 'Recomendado'}
        </span>
      )}
      <h3 className="text-xl font-semibold text-primary">{p.nome}</h3>
      <p className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight text-text">{p.precoMensal ? reais(p.precoMensal) : 'R$ 0'}</span>
        <span className="text-base text-text/60">/mês</span>
      </p>
      <p className="mt-1 min-h-[1.5rem] text-sm text-text/65">
        {p.precoMensal ? (
          <>ou <strong className="text-text/85">{reais(precoAnual(p))} por ano</strong> <span className="whitespace-nowrap font-semibold text-emerald-700">(2 meses grátis)</span></>
        ) : (
          'Sem cartão e sem prazo para acabar'
        )}
      </p>
      <p className="mt-5 rounded-xl bg-primary/[0.06] px-4 py-3 text-base font-semibold leading-snug text-primary-escuro">{p.resultado}</p>
      <p className="mt-4 flex-1 text-base leading-relaxed text-text/70">{p.paraQuem}</p>
      {!semDetalhes && (
        <details className="group mt-4 border-t border-border pt-3">
          <summary className="cursor-pointer list-none text-sm font-semibold text-primary hover:underline [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Ver o que vem neste plano</span>
            <span className="hidden group-open:inline">Fechar a lista</span>
          </summary>
          <ul className="mt-3 space-y-1.5 text-sm">
            {p.base && <li className="font-semibold text-primary">{p.base}, mais:</li>}
            {p.inclui.map((i) => (
              <li key={i} className="flex gap-2"><span className={p.precoMensal ? 'text-success' : 'text-text/40'} aria-hidden>✓</span><span>{i}</span></li>
            ))}
          </ul>
        </details>
      )}
      <div className="mt-6">{acao}</div>
    </div>
  );
}

// Botão único de cada cartão no site aberto (página inicial e /planos): leva ao cadastro com o plano escolhido.
export function BotaoPlanoSite({ p, href }: { p: PlanoSite; href: string }) {
  return (
    <Link
      href={href}
      className={`flex min-h-[3rem] items-center justify-center rounded-xl px-5 py-3 text-center text-base font-semibold transition ${
        p.destaque ? 'bg-primary text-white shadow-md hover:bg-primary-escuro' : 'border-2 border-primary text-primary hover:bg-primary hover:text-white'
      }`}
    >
      {p.precoMensal === 0 ? 'Começar grátis' : `Quero o ${p.nome}`}
    </Link>
  );
}

export function InclusoEmTodos() {
  return (
    <div>
      <h2 className="text-xl font-semibold">O que vem em todos os planos pagos</h2>
      <p className="mt-1 text-sm text-text/60">Do Start para cima, todos os documentos e módulos do dia a dia estão liberados. Cada degrau acrescenta mais empresas e mais recursos.</p>
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
