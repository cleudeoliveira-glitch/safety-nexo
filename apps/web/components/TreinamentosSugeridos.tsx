'use client';

import { useEffect, useState } from 'react';
import { Botao, Cartao } from './ui';
import { TreinamentoSugerido, treinamentosSugeridos } from '@/lib/api';

// Treinamentos que as NRs pedem pelos riscos do PGR, com quem ainda não fez ou está vencido.
export function TreinamentosSugeridos({ empresaId, versao, usar }: { empresaId: string; versao: number; usar: (modelo: string, pessoas: string[]) => void }) {
  const [lista, setLista] = useState<TreinamentoSugerido[] | null>(null);
  useEffect(() => { treinamentosSugeridos(empresaId).then(setLista).catch(() => setLista([])); }, [empresaId, versao]);
  if (!lista || lista.length === 0) return null;
  const pendentes = lista.filter((s) => s.pendentes.length);
  return (
    <Cartao titulo="Treinamentos que os riscos pedem">
      <p className="mb-3 text-sm text-text/70">O sistema leu os riscos do PGR, os cargos, as entregas de EPI e a CIPA. Confira antes de montar a turma: a regra aponta, quem decide é você.</p>
      {pendentes.length === 0 ? <p className="text-sm text-success">Todos em dia com os treinamentos sugeridos. ✓</p> : (
        <ul className="space-y-2 text-sm">
          {pendentes.map((s) => (
            <li key={s.modelo} className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border p-3">
              <div>
                <strong>{s.modelo}</strong> <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold">{s.norma}</span>
                <p className="text-text/60">Por quê: {s.motivo}{s.onde.length ? ` · GHE ${s.onde.join(', ')}` : ''}</p>
                <p><span className="font-semibold text-danger">{s.pendentes.length} de {s.total}</span> sem o treinamento em dia: {s.pendentes.slice(0, 6).map((p) => p.nome).join(', ')}{s.pendentes.length > 6 ? '…' : ''}</p>
              </div>
              <Botao variante="secundario" onClick={() => usar(s.modelo, s.pendentes.map((p) => p.id))}>Montar turma</Botao>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
