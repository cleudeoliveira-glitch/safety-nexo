'use client';

import { useState } from 'react';
import { Colaborador } from '@/lib/api';

const semAcento = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Lista de colaboradores com caixas de seleção, busca pelo nome e atalhos:
// marcar todos ou marcar todo mundo de uma função (ex.: todos os soldadores).
// Quem já saiu da empresa só aparece se já estiver marcado.
export function EscolherPessoas({ titulo, colaboradores, marcados, mudar }: { titulo: string; colaboradores: Colaborador[]; marcados: string[]; mudar: (ids: string[]) => void }) {
  const [busca, setBusca] = useState('');
  const ativos = colaboradores.filter((c) => !c.dataDesligamento || marcados.includes(c.id));
  const todos = ativos.length > 0 && ativos.every((c) => marcados.includes(c.id));
  const funcoes = [...new Set(ativos.map((c) => c.cargo).filter(Boolean))].sort();
  const visiveis = busca.trim() ? ativos.filter((c) => semAcento(`${c.nome} ${c.cargo}`).includes(semAcento(busca.trim()))) : ativos;

  function marcarFuncao(cargo: string) {
    const ids = ativos.filter((c) => c.cargo === cargo).map((c) => c.id);
    const jaTodos = ids.every((id) => marcados.includes(id));
    mudar(jaTodos ? marcados.filter((id) => !ids.includes(id)) : [...new Set([...marcados, ...ids])]);
  }

  return (
    <fieldset className="rounded-card border border-border p-3">
      <legend className="px-1 text-sm font-semibold">{titulo}{marcados.length > 0 && <span className="font-normal text-text/60"> · {marcados.length} marcado(s)</span>}</legend>
      {ativos.length === 0 ? (
        <p className="text-sm text-text/60">Cadastre colaboradores na empresa primeiro.</p>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button type="button" className="rounded-full border border-primary/40 px-3 py-1 text-xs font-semibold text-primary" onClick={() => mudar(todos ? [] : ativos.map((c) => c.id))}>
              {todos ? 'Desmarcar todos' : 'Marcar todos'}
            </button>
            {funcoes.length > 1 && funcoes.length <= 15 && funcoes.map((f) => {
              const n = ativos.filter((c) => c.cargo === f).length;
              const cheio = ativos.filter((c) => c.cargo === f).every((c) => marcados.includes(c.id));
              return (
                <button key={f} type="button" onClick={() => marcarFuncao(f)} title={`Marcar ou desmarcar todos: ${f}`}
                  className={`rounded-full border px-3 py-1 text-xs ${cheio ? 'border-primary bg-primary text-white' : 'border-border bg-white text-text/80'}`}>
                  {f} ({n})
                </button>
              );
            })}
          </div>
          {ativos.length > 8 && (
            <input type="search" aria-label="Procurar pessoa" placeholder="Procurar pelo nome ou função" value={busca} onChange={(e) => setBusca(e.target.value)}
              className="mb-2 w-full rounded-card border border-border bg-background px-3 py-2 text-sm" />
          )}
          <div className="grid gap-1.5 md:grid-cols-2">
            {visiveis.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 shrink-0 accent-primary" checked={marcados.includes(c.id)}
                  onChange={(e) => mudar(e.target.checked ? [...marcados, c.id] : marcados.filter((id) => id !== c.id))} />
                <span className="min-w-0 break-words">{c.nome} <span className="text-text/50">· {c.cargo}</span></span>
              </label>
            ))}
            {visiveis.length === 0 && <p className="text-sm text-text/60">Ninguém com esse nome.</p>}
          </div>
        </>
      )}
    </fieldset>
  );
}
