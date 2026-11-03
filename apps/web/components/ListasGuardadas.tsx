'use client';
import { useEffect, useState } from 'react';
import type { ListaGuardada } from '@/app/empresas/[id]/lista/[tipo]/[refId]/page';

// Listas de assinatura (DDS e treinamento) que já foram abertas neste aparelho.
// Elas abrem sem internet; as assinaturas feitas sem internet são enviadas quando a internet volta.
const PREFIXO = 'safety-nexo:lista:';

function lerTodas(): ListaGuardada[] {
  const r: ListaGuardada[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(PREFIXO)) continue;
      try { const g = JSON.parse(localStorage.getItem(k) || ''); if (g?.lista) r.push(g); } catch { /* ignora item estragado */ }
    }
  } catch { /* sem acesso ao armazenamento */ }
  return r.sort((a, b) => b.salvoEm.localeCompare(a.salvoEm));
}

export function ListasGuardadas({ empresaId }: { empresaId: string }) {
  const [listas, setListas] = useState<ListaGuardada[]>([]);
  useEffect(() => { setListas(lerTodas()); }, []);
  const daEmpresa = listas.filter((l) => !empresaId || l.empresaId === empresaId);
  if (!daEmpresa.length) return null;
  return (
    <section aria-labelledby="listas-guardadas" className="rounded-card border border-border bg-white p-4">
      <h2 id="listas-guardadas" className="font-semibold">Listas para assinar guardadas no aparelho</h2>
      <p className="text-sm text-muted">Abrem mesmo sem internet. Para guardar outra, abra a lista uma vez com internet.</p>
      <ul className="mt-2 space-y-2">
        {daEmpresa.map((l) => {
          const faltam = l.lista.pessoas.filter((p) => !p.assinadoEm).length;
          return (
            <li key={`${l.tipo}:${l.refId}`}>
              {/* link comum (não o do Next) para a tela abrir pela cópia guardada quando não há internet */}
              <a href={`/empresas/${l.empresaId}/lista/${l.tipo}/${l.refId}`} className="flex items-center justify-between rounded-card border border-border px-3 py-2 hover:bg-surface">
                <span><strong>{l.tipo === 'dds' ? 'DDS' : 'Treinamento'}</strong> · {l.lista.titulo}</span>
                <span className="text-sm text-muted">{faltam ? `faltam ${faltam}` : 'todos assinaram'}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
