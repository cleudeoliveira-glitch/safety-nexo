// Fotos tiradas no campo sem internet (não conformidades da inspeção): ficam no IndexedDB do aparelho,
// que aguenta muito mais que o localStorage, e sobem junto com a inspeção quando a internet volta.
export type FotoGuardada = { foto: Blob; legenda: string };

const BANCO = 'safety-nexo-campo';
const LOJA = 'fotos';

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, falha) => {
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(LOJA)) r.result.createObjectStore(LOJA); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => falha(r.error);
  });
}

async function usar<T>(modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  return new Promise((ok, falha) => {
    const t = db.transaction(LOJA, modo);
    const req = f(t.objectStore(LOJA));
    t.oncomplete = () => { ok(req.result); db.close(); };
    t.onerror = () => { falha(t.error); db.close(); };
  });
}

export const guardarFotos = (pendenteId: string, fotos: FotoGuardada[]) => usar('readwrite', (s) => s.put(fotos, pendenteId));
export const lerFotos = async (pendenteId: string) => ((await usar('readonly', (s) => s.get(pendenteId))) as FotoGuardada[] | undefined) ?? [];
export const apagarFotos = (pendenteId: string) => usar('readwrite', (s) => s.delete(pendenteId)).catch(() => undefined);
