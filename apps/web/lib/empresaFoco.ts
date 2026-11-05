// Empresa em foco: a mesma escolha vale para o menu lateral, o painel e as telas da empresa.
import { Empresa, listarEmpresas } from './api';

const CHAVE = 'safety-nexo:empresa-foco';
const EVENTO = 'safety-nexo:empresa-foco';

export function lerFoco(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

export function salvarFoco(id: string) {
  if (lerFoco() === id) return;
  try {
    localStorage.setItem(CHAVE, id);
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: id }));
}

export function aoMudarFoco(fn: (id: string) => void) {
  const ouvir = (e: Event) => fn((e as CustomEvent<string>).detail);
  window.addEventListener(EVENTO, ouvir);
  return () => window.removeEventListener(EVENTO, ouvir);
}

// A lista de empresas é buscada uma vez e dividida entre o menu e o painel.
let lista: Promise<Empresa[]> | null = null;

export function empresasDaConta(recarregar = false): Promise<Empresa[]> {
  if (!lista || recarregar) {
    lista = listarEmpresas().catch((e) => {
      lista = null;
      throw e;
    });
  }
  return lista;
}

// Escolhe a empresa: a pedida, depois a última usada, depois a primeira da lista.
export function escolherFoco(empresas: Empresa[], pedida?: string | null): string {
  const ids = empresas.map((e) => e.id);
  if (pedida && ids.includes(pedida)) return pedida;
  const ultima = lerFoco();
  if (ultima && ids.includes(ultima)) return ultima;
  return ids[0] ?? '';
}
