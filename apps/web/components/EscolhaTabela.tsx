'use client';

import { useMemo, useState } from 'react';

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Lista de uma tabela do eSocial com busca por palavra ou código. Envia o código no campo "name".
export function EscolhaTabela({ id, name, rotulo, itens, valor, busca, className, aoEscolher }: {
  id: string; name: string; rotulo: string; itens: ([string, string] | [string, string, string])[]; valor?: string | null;
  busca?: string; className?: string; aoEscolher?: (codigo: string) => void;
}) {
  const [filtro, setFiltro] = useState('');
  const [codigo, setCodigo] = useState(valor ?? '');
  const atual = itens.find(([c]) => c === codigo);
  const visiveis = useMemo(() => {
    const termos = semAcento(filtro).split(/\s+/).filter(Boolean);
    const achados = termos.length ? itens.filter(([c, d]) => termos.every((t) => semAcento(`${c} ${d}`).includes(t))) : itens;
    return achados.slice(0, 300);
  }, [filtro, itens]);
  const grupos = itens[0]?.length === 3;
  const opcoes = (lista: typeof itens) => lista.map(([c, d]) => <option key={c} value={c}>{c} · {d}</option>);
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{rotulo}</label>
      <input type="search" aria-label={`Buscar em ${rotulo}`} placeholder={busca ? `Buscar (ex.: ${busca})` : 'Buscar por palavra ou código'}
        value={filtro} onChange={(e) => setFiltro(e.target.value)}
        className="mb-1 w-full rounded-card border border-border bg-background px-3 py-1.5 text-sm" />
      <select id={id} name={name} value={codigo} onChange={(e) => { setCodigo(e.target.value); aoEscolher?.(e.target.value); }}
        className="w-full rounded-card border border-border bg-background px-3 py-2.5 text-sm">
        <option value="">{visiveis.length ? 'Escolha' : 'Nada encontrado'}</option>
        {atual && !visiveis.includes(atual) && <option value={atual[0]}>{atual[0]} · {atual[1]} (escolhido)</option>}
        {grupos
          ? [...new Set(visiveis.map((i) => i[2] as string))].map((g) => <optgroup key={g} label={g}>{opcoes(visiveis.filter((i) => i[2] === g))}</optgroup>)
          : opcoes(visiveis)}
      </select>
    </div>
  );
}
