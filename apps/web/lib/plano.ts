'use client';

import { useEffect, useState } from 'react';
import { meuPlano, RecursosPlano } from './api';
import { lerToken } from './sessao';

// O que o plano libera (para mostrar o cadeado no menu e nas telas). Guardado por 5 minutos no navegador.
const CHAVE = 'safety-nexo:recursos';
let emAndamento: Promise<RecursosPlano | null> | null = null;

function lerCache(): RecursosPlano | null {
  try {
    const b = sessionStorage.getItem(CHAVE);
    if (!b) return null;
    const { em, dados } = JSON.parse(b) as { em: number; dados: RecursosPlano };
    return Date.now() - em < 5 * 60_000 ? dados : null;
  } catch { return null; }
}

export function buscarRecursos(): Promise<RecursosPlano | null> {
  const c = lerCache();
  if (c) return Promise.resolve(c);
  if (!lerToken()) return Promise.resolve(null);
  emAndamento ??= meuPlano.recursos()
    .then((d) => { try { sessionStorage.setItem(CHAVE, JSON.stringify({ em: Date.now(), dados: d })); } catch { /* nada */ } return d; })
    .catch(() => null)
    .finally(() => { emAndamento = null; });
  return emAndamento;
}

export function esquecerRecursos() { try { sessionStorage.removeItem(CHAVE); } catch { /* nada */ } }

// null enquanto carrega (ou sem internet): nesse caso nada aparece travado.
export function usePlano() {
  const [plano, setPlano] = useState<RecursosPlano | null>(null);
  useEffect(() => { buscarRecursos().then(setPlano); }, []);
  return plano;
}

export const libera = (plano: RecursosPlano | null, recurso?: string) => !recurso || !plano || plano.recursos.includes(recurso);

// Nome do menor plano que libera o recurso (igual ao servidor: common/plano.ts).
const MINIMO: Record<string, string> = {
  logoEmpresa: 'Start', documentos: 'Start', assinatura: 'Start', offline: 'Start', slides: 'Start',
  logoConsultoria: 'Essencial', proposta: 'Essencial', esocial: 'Essencial',
  rosto: 'Profissional', cobranca: 'Profissional', equipe: 'Profissional', semMarca: 'Ilimitado',
};
export const planoMinimo = (recurso: string) => MINIMO[recurso] ?? 'Start';
