// Trabalho de campo sem internet: o que a tela /campo precisa fica guardado no aparelho.
import { buscarModelosChecklist, criarApr, criarInspecao, listarEmpresas, ModeloChecklist } from './api';

const BASE = 'safety-nexo:campo';
const PENDENTES = 'safety-nexo:campo-pendentes';

export type BaseCampo = { empresas: { id: string; razaoSocial: string }[]; modelos: ModeloChecklist[]; atualizadoEm: string };
export type Pendente = {
  id: string; tipo: 'inspecao' | 'apr'; empresaId: string; empresaNome: string; titulo: string; criadoEm: string;
  dados: Record<string, unknown>; erro?: string;
};

const ler = <T,>(chave: string, padrao: T): T => { try { const b = localStorage.getItem(chave); return b ? (JSON.parse(b) as T) : padrao; } catch { return padrao; } };
const gravar = (chave: string, v: unknown) => { try { localStorage.setItem(chave, JSON.stringify(v)); return true; } catch { return false; } };

export const lerBase = () => ler<BaseCampo | null>(BASE, null);
export const lerPendentes = () => ler<Pendente[]>(PENDENTES, []);
export const esquecerBase = () => { try { localStorage.removeItem(BASE); } catch { /* nada */ } };

// Com internet: baixa empresas e checklists para usar depois sem sinal.
export async function prepararCampo(): Promise<BaseCampo> {
  const [empresas, modelos] = await Promise.all([listarEmpresas(), buscarModelosChecklist()]);
  const base = { empresas: empresas.map((e) => ({ id: e.id, razaoSocial: e.razaoSocial })), modelos, atualizadoEm: new Date().toISOString() };
  gravar(BASE, base);
  return base;
}

export function guardarPendente(p: Omit<Pendente, 'id' | 'criadoEm'>) {
  const lista = lerPendentes();
  const novo = { ...p, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, criadoEm: new Date().toISOString() };
  if (!gravar(PENDENTES, [...lista, novo])) throw new Error('O aparelho está sem espaço para guardar. Libere espaço e tente de novo.');
  return novo;
}

export function removerPendente(id: string) { gravar(PENDENTES, lerPendentes().filter((p) => p.id !== id)); }

// Manda o que estava guardado. Erro de internet: tenta de novo depois. Erro de dado: fica marcado para corrigir.
let enviando = false;
export async function enviarPendentes(): Promise<{ enviados: number; falhas: number }> {
  if (enviando || (typeof navigator !== 'undefined' && !navigator.onLine)) return { enviados: 0, falhas: 0 };
  enviando = true;
  let enviados = 0; let falhas = 0;
  try {
    for (const p of lerPendentes()) {
      if (p.erro) { falhas++; continue; }
      try {
        if (p.tipo === 'inspecao') await criarInspecao(p.empresaId, p.dados as Parameters<typeof criarInspecao>[1]);
        else await criarApr(p.empresaId, p.dados as Parameters<typeof criarApr>[1]);
        removerPendente(p.id); enviados++;
      } catch (e) {
        if (e instanceof TypeError) break; // sem conexão: para e tenta depois
        gravar(PENDENTES, lerPendentes().map((x) => (x.id === p.id ? { ...x, erro: (e as Error).message } : x))); falhas++;
      }
    }
  } finally { enviando = false; }
  return { enviados, falhas };
}

export function tirarErro(id: string) { gravar(PENDENTES, lerPendentes().map((x) => (x.id === id ? { ...x, erro: undefined } : x))); }
