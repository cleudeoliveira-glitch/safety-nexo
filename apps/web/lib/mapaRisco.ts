import type { Ghe } from './api';

// Mapa de risco (CIPA): cor = tipo de risco, tamanho = intensidade.
// Mesmas regras do PDF (apps/api/src/documentos/mapa-risco.ts): se mudar aqui, mude lá.

export type GrupoRisco = 'FISICO' | 'QUIMICO' | 'BIOLOGICO' | 'ERGONOMICO' | 'ACIDENTE';
export type Tamanho = 'PEQUENO' | 'MEDIO' | 'GRANDE';

export const GRUPOS_MAPA: Record<GrupoRisco, { nome: string; cor: string; texto: string; exemplos: string }> = {
  FISICO: { nome: 'Físico', cor: '#16a34a', texto: '#ffffff', exemplos: 'ruído, calor, frio, vibração, radiação' },
  QUIMICO: { nome: 'Químico', cor: '#dc2626', texto: '#ffffff', exemplos: 'poeira, fumo, gás, vapor, produto químico' },
  BIOLOGICO: { nome: 'Biológico', cor: '#8b5a2b', texto: '#ffffff', exemplos: 'vírus, bactéria, fungo' },
  ERGONOMICO: { nome: 'Ergonômico', cor: '#facc15', texto: '#1f2937', exemplos: 'esforço, postura, repetição, estresse' },
  ACIDENTE: { nome: 'Acidente', cor: '#2563eb', texto: '#ffffff', exemplos: 'máquina, queda, choque, incêndio' },
};
export const ORDEM_GRUPOS = Object.keys(GRUPOS_MAPA) as GrupoRisco[];

export const TAMANHOS_MAPA: Record<Tamanho, { nome: string; raio: number; explica: string }> = {
  PEQUENO: { nome: 'Pequeno', raio: 14, explica: 'risco baixo' },
  MEDIO: { nome: 'Médio', raio: 21, explica: 'risco moderado' },
  GRANDE: { nome: 'Grande', raio: 30, explica: 'risco alto ou crítico' },
};

const ANTIGO: Record<string, number> = { BAIXA: 2, MEDIA: 3, ALTA: 5 };
const grau = (v?: string | null) => (v ? (Number(v) >= 1 && Number(v) <= 5 ? Number(v) : ANTIGO[v] ?? 3) : 3);

// Nível do risco (matriz 5x5 do GHE) vira o tamanho do círculo.
export function tamanhoDoRisco(severidade?: string | null, probabilidade?: string | null): Tamanho {
  const pontos = grau(severidade) * grau(probabilidade);
  if (pontos >= 15) return 'GRANDE';
  if (pontos >= 8) return 'MEDIO';
  return 'PEQUENO';
}

const PESO: Record<Tamanho, number> = { PEQUENO: 1, MEDIO: 2, GRANDE: 3 };
export type CirculoMapa = { numero: number; grupo: GrupoRisco; tamanho: Tamanho; agente: string; fontes: string[]; trabalhadores: number };
export type SetorMapa = { nome: string; grupos: string[]; trabalhadores: number; circulos: CirculoMapa[] };

const chave = (t: string) => t.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// GHEs do mesmo setor viram um desenho só; o mesmo agente em dois GHEs vira um círculo só.
export function montarSetores(ghes: Ghe[]): SetorMapa[] {
  const setores = new Map<string, SetorMapa & { porAgente: Map<string, CirculoMapa> }>();
  for (const g of ghes) {
    const nome = g.setor?.trim() || g.nome.trim();
    const k = chave(nome);
    if (!setores.has(k)) setores.set(k, { nome, grupos: [], trabalhadores: 0, circulos: [], porAgente: new Map() });
    const s = setores.get(k)!;
    s.grupos.push(g.nome);
    s.trabalhadores += g._count.colaboradores;
    for (const r of g.riscos) {
      if (!(r.tipo in GRUPOS_MAPA)) continue;
      const tamanho = tamanhoDoRisco(r.severidade, r.probabilidade);
      const kr = `${r.tipo}|${chave(r.agente)}`;
      const ja = s.porAgente.get(kr);
      if (ja) {
        ja.trabalhadores += g._count.colaboradores;
        if (r.fonteGeradora?.trim() && !ja.fontes.includes(r.fonteGeradora.trim())) ja.fontes.push(r.fonteGeradora.trim());
        if (PESO[tamanho] > PESO[ja.tamanho]) ja.tamanho = tamanho;
        continue;
      }
      s.porAgente.set(kr, { numero: 0, grupo: r.tipo as GrupoRisco, tamanho, agente: r.agente.trim(), fontes: r.fonteGeradora?.trim() ? [r.fonteGeradora.trim()] : [], trabalhadores: g._count.colaboradores });
    }
  }
  return [...setores.values()].map(({ porAgente, ...s }) => ({
    ...s,
    circulos: [...porAgente.values()]
      .sort((a, b) => ORDEM_GRUPOS.indexOf(a.grupo) - ORDEM_GRUPOS.indexOf(b.grupo) || PESO[b.tamanho] - PESO[a.tamanho] || a.agente.localeCompare(b.agente))
      .map((c, i) => ({ ...c, numero: i + 1 })),
  }));
}
