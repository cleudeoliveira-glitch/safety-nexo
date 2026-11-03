// Capturas de rosto feitas sem internet: ficam no IndexedDB do aparelho (cabe muita foto)
// e são enviadas quando a internet volta. A comparação com o cadastro é feita no envio.
import { Captura, rosto } from './api';

export type CapturaGuardada = {
  id: string; tipo: 'EPI' | 'DDS' | 'TREINAMENTO'; empresaId: string; refId: string; // refId: funcionário (EPI), DDS ou turma
  titulo: string; dados: Captura & Record<string, unknown>; criadoEm: string; erro?: string;
};

const BANCO = 'safety-nexo-rosto';
const LOJA = 'capturas';

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, falha) => {
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(LOJA)) r.result.createObjectStore(LOJA, { keyPath: 'id' }); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => falha(r.error);
  });
}

async function loja<T>(modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  return new Promise((ok, falha) => {
    const t = db.transaction(LOJA, modo);
    const req = f(t.objectStore(LOJA));
    t.oncomplete = () => { ok(req.result); db.close(); };
    t.onerror = () => { falha(t.error); db.close(); };
  });
}

export async function guardarCaptura(c: Omit<CapturaGuardada, 'id' | 'criadoEm'>) {
  const agora = new Date().toISOString();
  const nova: CapturaGuardada = { ...c, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, criadoEm: agora, dados: { ...c.dados, capturadoEm: agora } };
  try { await loja('readwrite', (s) => s.put(nova)); } catch { throw new Error('Não deu para guardar no aparelho. Libere espaço e tente de novo.'); }
  avisar();
  return nova;
}

export const listarCapturas = async () => { try { return (await loja<CapturaGuardada[]>('readonly', (s) => s.getAll())).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm)); } catch { return []; } };
export const removerCaptura = async (id: string) => { await loja('readwrite', (s) => s.delete(id)); avisar(); };
async function marcar(id: string, erro: string | undefined) {
  const c = await loja<CapturaGuardada | undefined>('readonly', (s) => s.get(id));
  if (c) await loja('readwrite', (s) => s.put({ ...c, erro }));
  avisar();
}
export const tentarDeNovo = (id: string) => marcar(id, undefined);

// Outras telas podem ouvir para atualizar a contagem.
const avisar = () => { try { window.dispatchEvent(new Event('capturas-rosto')); } catch { /* nada */ } };

let enviando = false;
export async function enviarCapturas(): Promise<{ enviados: number; recusados: number; mensagens: string[] }> {
  const r = { enviados: 0, recusados: 0, mensagens: [] as string[] };
  if (enviando || (typeof navigator !== 'undefined' && !navigator.onLine)) return r;
  enviando = true;
  try {
    for (const c of await listarCapturas()) {
      if (c.erro) continue;
      try {
        if (c.tipo === 'EPI') { const x = await rosto.entregarEpi(c.empresaId, c.refId, c.dados); r.mensagens.push(`${c.titulo}: entrega confirmada (${x.codigo})`); }
        else if (c.tipo === 'DDS') { const x = await rosto.presencaDds(c.empresaId, c.refId, c.dados); r.mensagens.push(`${c.titulo}: ${x.nome}`); }
        else { const x = await rosto.presencaTurma(c.empresaId, c.refId, c.dados); r.mensagens.push(`${c.titulo}: ${x.nome}`); }
        await removerCaptura(c.id); r.enviados++;
      } catch (e) {
        if (e instanceof TypeError) break; // sem conexão: tenta depois
        await marcar(c.id, (e as Error).message); r.recusados++;
      }
    }
  } finally { enviando = false; }
  return r;
}
