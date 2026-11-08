// Trabalho de campo sem internet: o que a tela /campo precisa fica guardado no aparelho.
import { buscarConteudoOperacao, buscarModelosChecklist, criarApr, criarDds, criarInspecao, enviarFotosInspecao, estoque, listarColaboradores, listarDds, listarEmpresas, listarTurmas, ModeloChecklist, prevencao, rosto, TemaDds } from './api';
import { apagarFotos, lerFotos } from './fotos-offline';
import { carregarFaceApi, configRosto } from './rosto';
import { guardarRostosCampo } from './rosto-offline';

const BASE = 'safety-nexo:campo';
const PENDENTES = 'safety-nexo:campo-pendentes';

export type BaseRosto = {
  colaboradores: { id: string; nome: string; cargo: string }[]; // só quem tem o rosto cadastrado
  estoque: { id: string; epi: string; ca: string; tamanho: string | null; quantidade: number }[];
  dds: { id: string; tema: string; data: string }[];
  turmas: { id: string; nome: string; norma: string | null }[];
};
export type BaseCampo = {
  empresas: { id: string; razaoSocial: string }[]; modelos: ModeloChecklist[]; rosto?: Record<string, BaseRosto>; atualizadoEm: string;
  temasDds?: TemaDds[]; // biblioteca de DDS, para abrir o tema do dia sem internet
  pessoas?: Record<string, { id: string; nome: string; cargo: string }[]>; // funcionários de cada empresa (lista de presença do DDS)
};
export type Pendente = {
  id: string; tipo: 'inspecao' | 'apr' | 'dds'; empresaId: string; empresaNome: string; titulo: string; criadoEm: string;
  dados: Record<string, unknown>; erro?: string;
};

const ler = <T,>(chave: string, padrao: T): T => { try { const b = localStorage.getItem(chave); return b ? (JSON.parse(b) as T) : padrao; } catch { return padrao; } };
const gravar = (chave: string, v: unknown) => { try { localStorage.setItem(chave, JSON.stringify(v)); return true; } catch { return false; } };

export const lerBase = () => ler<BaseCampo | null>(BASE, null);
export const lerPendentes = () => ler<Pendente[]>(PENDENTES, []);
export const esquecerBase = () => { try { localStorage.removeItem(BASE); } catch { /* nada */ } };

// Com internet: baixa empresas e checklists para usar depois sem sinal.
export async function prepararCampo(): Promise<BaseCampo> {
  const [empresas, modelos, conteudo] = await Promise.all([listarEmpresas(), buscarModelosChecklist(), buscarConteudoOperacao().catch(() => null)]);
  const pessoas: Record<string, { id: string; nome: string; cargo: string }[]> = {};
  await Promise.all(empresas.map((e) => listarColaboradores(e.id).then((cs) => { pessoas[e.id] = cs.map((c) => ({ id: c.id, nome: c.nome, cargo: c.cargo })); }).catch(() => undefined)));
  // Para o rosto sem internet: quem tem rosto, almoxarifado e DDS/turmas recentes de cada empresa.
  const rostoBase: Record<string, BaseRosto> = {};
  await Promise.all(empresas.map(async (e) => {
    try {
      const [cols, est, dds, turmas] = await Promise.all([rosto.listar(e.id), estoque.listar(e.id).catch(() => []), listarDds(e.id).catch(() => []), listarTurmas(e.id).catch(() => [])]);
      rostoBase[e.id] = {
        colaboradores: cols.filter((c) => c.cadastrado).map(({ id, nome, cargo }) => ({ id, nome, cargo })),
        estoque: est.filter((i) => i.ativo && !i.caVencido).map(({ id, epi, ca, tamanho, quantidade }) => ({ id, epi, ca, tamanho, quantidade })),
        dds: dds.slice(0, 20).map((d) => ({ id: d.id, tema: d.tema, data: d.data })),
        turmas: turmas.slice(0, 20).map((t) => ({ id: t.id, nome: t.nome, norma: t.norma ?? null })),
      };
      // Código do rosto de cada funcionário, para conferir a entrega de EPI sem internet.
      if (cols.some((c) => c.cadastrado)) await rosto.baseCampo(e.id).then((b) => guardarRostosCampo(e.id, b)).catch(() => undefined);
    } catch { /* empresa sem acesso ao rosto */ }
  }));
  const base: BaseCampo = { empresas: empresas.map((e) => ({ id: e.id, razaoSocial: e.razaoSocial })), modelos, rosto: rostoBase, atualizadoEm: new Date().toISOString(), temasDds: conteudo?.temasDds, pessoas };
  // Deixa o reconhecimento facial guardado no aparelho (modelos e configuração).
  configRosto().then(() => carregarFaceApi()).catch(() => undefined);
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
        if (p.tipo === 'inspecao') {
          const { abrirAcoes, ...dados } = p.dados as Parameters<typeof criarInspecao>[1] & { abrirAcoes?: boolean };
          const feita = await criarInspecao(p.empresaId, dados);
          // A inspeção já está no sistema: daqui para frente nada a repete, mesmo se a foto ou a ação falharem.
          removerPendente(p.id); enviados++;
          const fotos = await lerFotos(p.id).catch(() => []);
          if (fotos.length) await enviarFotosInspecao(p.empresaId, feita.id, fotos).catch(() => undefined);
          await apagarFotos(p.id);
          if (abrirAcoes && feita.itens.some((i) => i.resposta === 'NC')) await prevencao.acoesDaInspecao(p.empresaId, feita.id).catch(() => undefined);
          continue;
        }
        if (p.tipo === 'dds') await criarDds(p.empresaId, p.dados as Parameters<typeof criarDds>[1]);
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
