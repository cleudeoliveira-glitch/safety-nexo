import Link from 'next/link';
import type { ReactNode } from 'react';

// Topo de toda tela de dentro da empresa: "← Voltar", o título (o mesmo nome do item que a pessoa tocou no menu),
// a empresa e uma frase curta dizendo para que a tela serve. Uma tela, uma finalidade.
export function TopoTela({ empresaId, titulo, empresa, frase, extra }: {
  empresaId: string; titulo: string; empresa?: string; frase?: string; extra?: ReactNode;
}) {
  return (
    <div>
      <Link href={`/?empresa=${empresaId}`} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-primary">← Voltar</Link>
      <h1 className="mt-1 text-2xl font-semibold text-primary md:text-3xl">{titulo}</h1>
      {empresa && <p className="text-sm text-text/60">{empresa}</p>}
      {frase && <p className="mt-1 text-sm text-text/80">{frase}</p>}
      {extra}
    </div>
  );
}

// Duas partes que andam juntas de verdade (ex.: APR e a PT que sai dela) ficam como abas grandes, lado a lado.
export function AbasDaTela<A extends string>({ abas, atual, trocar }: { abas: [A, string][]; atual: A; trocar: (a: A) => void }) {
  return (
    <div role="tablist" className="grid grid-cols-2 gap-1 rounded-card border border-border bg-white p-1">
      {abas.map(([valor, nome]) => (
        <button key={valor} type="button" role="tab" aria-selected={atual === valor} onClick={() => trocar(valor)}
          className={`min-h-[44px] rounded-card px-3 text-sm font-semibold ${atual === valor ? 'bg-primary text-white' : 'text-primary'}`}>
          {nome}
        </button>
      ))}
    </div>
  );
}
