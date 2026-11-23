'use client';

import { dataBr, diasAte, hoje, periodosDoPlano } from '@/lib/vigencia';

type Props = {
  gratis: boolean;
  planoDesde?: string | null;
  planoPagoAte?: string | null;
  emTeste?: boolean;
  testeAte?: string | null;
  criadaEm?: string;
  consultaDesde?: string | null;
};

function textoDias(n: number) {
  if (n === 0) return 'vence hoje';
  if (n === 1) return 'vence amanhã';
  if (n > 1) return `faltam ${n} dias`;
  if (n === -1) return 'venceu ontem';
  return `venceu há ${-n} dias`;
}

// Vencimento e vigência do plano, mês a mês ("Meu plano").
export function VigenciaPlano({ gratis, planoDesde, planoPagoAte, emTeste, testeAte, criadaEm, consultaDesde }: Props) {
  if (gratis) {
    return (
      <div className="mt-4 rounded-card border border-border bg-background p-4 text-sm">
        {emTeste && testeAte ? (
          <p><strong>Teste com tudo liberado:</strong> de {dataBr(criadaEm)} a {dataBr(testeAte)} ({textoDias(diasAte(testeAte))}).</p>
        ) : (
          <p>O plano Grátis não tem vencimento nem cobrança. Ele vale enquanto a conta existir.</p>
        )}
      </div>
    );
  }

  if (!planoPagoAte) {
    return (
      <div className="mt-4 rounded-card border border-border bg-background p-4 text-sm text-text/70">
        A data de vencimento do seu plano ainda não foi lançada. Ela aparece aqui assim que o pagamento for confirmado.
      </div>
    );
  }

  const faltam = diasAte(planoPagoAte);
  const periodos = periodosDoPlano(planoDesde, planoPagoAte);
  const atual = periodos.find((p) => p.de <= hoje() && hoje() <= p.ate);
  const tom = faltam < 0 ? 'card-nao' : faltam <= 7 ? 'card-pendente' : 'card-ok';

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={`${tom} rounded-card p-4`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-text/60">Vencimento</p>
          <p className="mt-1 text-2xl font-semibold">{dataBr(planoPagoAte)}</p>
          <p className="text-sm text-text/70">{textoDias(faltam)}</p>
        </div>
        <div className="rounded-card border border-border bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text/60">Mês atual</p>
          <p className="mt-1 text-lg font-semibold">{atual ? `${dataBr(atual.de)} a ${dataBr(atual.ate)}` : '—'}</p>
          <p className="text-sm text-text/70">Cliente desde {dataBr(planoDesde)}</p>
        </div>
      </div>
      {faltam < 0 && (
        <p className="text-sm font-semibold text-danger">
          {consultaDesde && diasAte(consultaDesde) > 0
            ? `O seu plano venceu. Tudo funciona normalmente até ${dataBr(new Date(new Date(consultaDesde).getTime() - 86400000).toISOString())}. Depois disso, a conta fica só para consulta até o pagamento. Nada é apagado.`
            : 'O seu plano venceu e a conta está só para consulta: você vê e baixa tudo, mas não cria nem muda nada até o pagamento. Nada foi apagado.'}
        </p>
      )}
      {faltam >= 0 && faltam <= 7 && (
        <p className="text-sm font-semibold text-[#c2410c]">O seu plano vence em poucos dias. Se você paga no cartão, a cobrança é feita sozinha.</p>
      )}
      {periodos.length > 0 && (
        <details className="rounded-card border border-border" open={periodos.length <= 6}>
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Vigência mês a mês</summary>
          <ul className="divide-y divide-border border-t border-border text-sm">
            {[...periodos].reverse().map((p) => {
              const futuro = p.de > hoje();
              const selo =
                p.situacao === 'parcial'
                  ? { t: `Pago até ${dataBr(planoPagoAte)}`, c: 'bg-warning/15 text-[#c2410c]' }
                  : p.situacao === 'aberto'
                  ? { t: 'Em aberto', c: 'bg-danger/10 text-danger' }
                  : p.situacao === 'atual'
                    ? { t: 'Mês atual, pago', c: 'bg-success/10 text-success' }
                    : futuro
                      ? { t: 'Pago adiantado', c: 'bg-primary/10 text-primary' }
                      : { t: 'Pago', c: 'bg-background text-text/70' };
              return (
                <li key={p.numero} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <span>
                    <span className="text-text/50">{p.numero}º mês · </span>
                    de <strong>{dataBr(p.de)}</strong> a <strong>{dataBr(p.ate)}</strong>
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${selo.c}`}>{selo.t}</span>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
