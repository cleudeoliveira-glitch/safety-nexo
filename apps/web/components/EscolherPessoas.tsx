'use client';

import { Colaborador } from '@/lib/api';

// Lista de colaboradores com caixas de seleção e atalho para marcar todos.
export function EscolherPessoas({ titulo, colaboradores, marcados, mudar }: { titulo: string; colaboradores: Colaborador[]; marcados: string[]; mudar: (ids: string[]) => void }) {
  const todos = colaboradores.length > 0 && marcados.length === colaboradores.length;
  return (
    <fieldset className="rounded-card border border-border p-3">
      <legend className="px-1 text-sm font-semibold">{titulo}</legend>
      {colaboradores.length === 0 ? (
        <p className="text-sm text-text/60">Cadastre colaboradores na empresa primeiro.</p>
      ) : (
        <>
          <button type="button" className="mb-2 text-xs font-semibold text-primary" onClick={() => mudar(todos ? [] : colaboradores.map((c) => c.id))}>
            {todos ? 'Desmarcar todos' : 'Marcar todos'}
          </button>
          <div className="grid gap-1.5 md:grid-cols-2">
            {colaboradores.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={marcados.includes(c.id)}
                  onChange={(e) => mudar(e.target.checked ? [...marcados, c.id] : marcados.filter((id) => id !== c.id))} />
                {c.nome} <span className="text-text/50">· {c.cargo}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </fieldset>
  );
}
