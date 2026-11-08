// Capturas de rosto feitas sem internet: ficam no IndexedDB do aparelho (cabe muita foto)
// e são enviadas quando a internet volta. Na entrega de EPI, o rosto já é conferido no aparelho
// (com o código do rosto baixado antes) e o servidor confere de novo no envio.
import { Captura, listaToque, rosto, TipoListaToque } from './api';

export type CapturaGuardada = {
  id: string; tipo: 'EPI' | 'DDS' | 'TREINAMENTO' | 'TOQUE'; empresaId: string; refId: string; // refId: funcionário (EPI), DDS ou turma
  titulo: string; dados: Record<string, unknown>; criadoEm: string; erro?: string;
  conferido?: boolean; // rosto já conferido no aparelho, sem internet
  toque?: { lista: TipoListaToque; colaboradorId: string }; // assinatura com o dedo na lista de presença
};

const BANCO = 'safety-nexo-rosto';
const LOJA = 'capturas';
const CADASTROS = 'cadastros'; // código do rosto dos funcionários, por empresa, para conferir sem internet

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, falha) => {
    const r = indexedDB.open(BANCO, 2);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(LOJA)) r.result.createObjectStore(LOJA, { keyPath: 'id' });
      if (!r.result.objectStoreNames.contains(CADASTROS)) r.result.createObjectStore(CADASTROS, { keyPath: 'empresaId' });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => falha(r.error);
  });
}

async function loja<T>(modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>, nome = LOJA): Promise<T> {
  const db = await abrir();
  return new Promise((ok, falha) => {
    const t = db.transaction(nome, modo);
    const req = f(t.objectStore(nome));
    t.oncomplete = () => { ok(req.result); db.close(); };
    t.onerror = () => { falha(t.error); db.close(); };
  });
}

export type RostosCampo = { empresaId: string; limiar: number; rostos: { colaboradorId: string; amostras: number[][] }[]; atualizadoEm: string };

// Com internet: guarda no aparelho o código do rosto de quem está cadastrado na empresa.
export async function guardarRostosCampo(empresaId: string, dados: { limiar: number; rostos: RostosCampo['rostos'] }) {
  try { await loja('readwrite', (s) => s.put({ empresaId, ...dados, atualizadoEm: new Date().toISOString() }), CADASTROS); } catch { /* sem espaço: confere no envio */ }
}
export async function lerRostosCampo(empresaId: string): Promise<RostosCampo | undefined> {
  try { return await loja<RostosCampo | undefined>('readonly', (s) => s.get(empresaId), CADASTROS); } catch { return undefined; }
}
export const esquecerRostosCampo = async () => { try { await loja('readwrite', (s) => s.clear(), CADASTROS); } catch { /* nada */ } };

// Sem internet: confere o rosto lido com o cadastro guardado no aparelho.
// 'sem-base' quando o aparelho ainda não tem o cadastro (aí a conferência fica para o envio).
export async function conferirNoAparelho(empresaId: string, colaboradorId: string, descritor: number[]): Promise<'confere' | 'nao-confere' | 'sem-base'> {
  const base = await lerRostosCampo(empresaId);
  const r = base?.rostos.find((x) => x.colaboradorId === colaboradorId);
  if (!base || !r || !r.amostras.length) return 'sem-base';
  const dist = Math.min(...r.amostras.map((a) => Math.sqrt(a.reduce((s, v, i) => s + (v - descritor[i]) ** 2, 0))));
  return dist < base.limiar ? 'confere' : 'nao-confere';
}

export async function guardarCaptura(c: Omit<CapturaGuardada, 'id' | 'criadoEm'>) {
  const agora = new Date().toISOString();
  const quando = c.tipo === 'TOQUE' ? { assinadoEm: agora } : { capturadoEm: agora };
  const nova: CapturaGuardada = { ...c, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, criadoEm: agora, dados: { ...c.dados, ...quando } };
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
// Avisa as telas quando terminou de enviar (para recarregar a lista).
export async function enviarCapturas(): Promise<{ enviados: number; recusados: number; mensagens: string[] }> {
  const r = { enviados: 0, recusados: 0, mensagens: [] as string[] };
  if (enviando || (typeof navigator !== 'undefined' && !navigator.onLine)) return r;
  enviando = true;
  try {
    for (const c of await listarCapturas()) {
      if (c.erro) continue;
      try {
        const cap = c.dados as Captura & Record<string, unknown>;
        if (c.tipo === 'TOQUE' && c.toque) {
          try { await listaToque.assinar(c.empresaId, c.toque.lista, c.refId, c.toque.colaboradorId, c.dados as Parameters<typeof listaToque.assinar>[4]); }
          catch (e) { if (!/já assinou/i.test((e as Error).message)) throw e; } // já tinha chegado antes
          r.mensagens.push(`${c.titulo}: assinatura enviada`);
        }
        else if (c.tipo === 'EPI') { const x = await rosto.entregarEpi(c.empresaId, c.refId, cap); r.mensagens.push(`${c.titulo}: entrega confirmada (${x.codigo})`); }
        else if (c.tipo === 'DDS') { const x = await rosto.presencaDds(c.empresaId, c.refId, cap); r.mensagens.push(`${c.titulo}: ${x.nome}`); }
        else { const x = await rosto.presencaTurma(c.empresaId, c.refId, cap); r.mensagens.push(`${c.titulo}: ${x.nome}`); }
        await removerCaptura(c.id); r.enviados++;
      } catch (e) {
        if (e instanceof TypeError) break; // sem conexão: tenta depois
        await marcar(c.id, (e as Error).message); r.recusados++;
      }
    }
  } finally { enviando = false; }
  if (r.enviados) { try { window.dispatchEvent(new Event('capturas-enviadas')); } catch { /* nada */ } }
  return r;
}
