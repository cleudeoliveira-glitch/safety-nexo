// Ficha do ambiente e funções de cada GHE (NR-01, 1.5.7.3.2, alíneas a e b).
// Cada GHE tem o seu ambiente: o administrativo não é igual à solda.

export type FuncaoGhe = { nome: string; cbo?: string | null; atividades?: string | null };
export type AmbienteGhe = {
  edificacao?: string | null;
  piso?: string | null;
  paredes?: string | null;
  cobertura?: string | null;
  peDireito?: string | null;
  iluminacao?: string | null; // NATURAL, ARTIFICIAL, MISTA
  ventilacao?: string | null; // NATURAL, ARTIFICIAL, MISTA, CLIMATIZADA
  ceuAberto?: boolean | null;
  confinado?: boolean | null;
  maquinas?: string | null;
  ruidoFundo?: string | null;
  observacoes?: string | null;
};

const ILUMINACAO: Record<string, string> = { NATURAL: 'iluminação natural', ARTIFICIAL: 'iluminação artificial', MISTA: 'iluminação natural e artificial' };
const VENTILACAO: Record<string, string> = {
  NATURAL: 'ventilação natural', ARTIFICIAL: 'ventilação por exaustores ou ventiladores', MISTA: 'ventilação natural e artificial', CLIMATIZADA: 'ambiente climatizado (ar-condicionado)',
};

const minusculo = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

export function lerFuncoes(valor: unknown): FuncaoGhe[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter((f): f is FuncaoGhe => !!f && typeof f === 'object' && typeof (f as FuncaoGhe).nome === 'string' && !!(f as FuncaoGhe).nome.trim())
    .map((f) => ({ nome: f.nome.trim(), cbo: f.cbo?.trim() || null, atividades: f.atividades?.trim() || null }));
}

export function lerAmbiente(valor: unknown): AmbienteGhe {
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? (valor as AmbienteGhe) : {};
}

// Monta um parágrafo corrido, do jeito que a consultora escreveria no PGR.
export function textoAmbiente(a: AmbienteGhe): string {
  const partes: string[] = [];
  const t = (v?: string | null) => (v ?? '').trim();
  if (a.ceuAberto) partes.push('Trabalho a céu aberto');
  if (t(a.edificacao)) partes.push(a.ceuAberto ? `estrutura de apoio: ${minusculo(t(a.edificacao))}` : t(a.edificacao));
  const construcao = [t(a.piso) && `piso de ${minusculo(t(a.piso))}`, t(a.paredes) && `paredes de ${minusculo(t(a.paredes))}`, t(a.cobertura) && `cobertura de ${minusculo(t(a.cobertura))}`, t(a.peDireito) && `pé-direito de ${t(a.peDireito)}`].filter(Boolean);
  if (construcao.length) partes.push(construcao.join(', '));
  const ar = [a.iluminacao && ILUMINACAO[a.iluminacao], a.ventilacao && VENTILACAO[a.ventilacao]].filter(Boolean);
  if (ar.length) partes.push(ar.join(' e '));
  let texto = partes.join(', ');
  if (texto) texto += '.';
  if (a.confinado) texto += ' Há espaço confinado neste setor (NR-33).';
  if (t(a.maquinas)) texto += ` Máquinas e equipamentos: ${minusculo(t(a.maquinas))}.`;
  if (t(a.ruidoFundo)) texto += ` Ruído de fundo: ${minusculo(t(a.ruidoFundo))}.`;
  if (t(a.observacoes)) texto += ` ${t(a.observacoes)}`;
  texto = texto.replace(/\.\./g, '.').trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Normaliza o nome da função para comparar com o cargo do colaborador.
export const chaveFuncao = (nome: string) => nome.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

// Texto do GHE para os laudos (LTCAT, LIP, LPP, PGRTR, OS): setor, funções, ambiente e atividades, uma coisa por linha.
export function descricaoGhe(g: { setor?: string | null; funcoes?: unknown; ambiente?: unknown; descricao?: string | null }): string | null {
  const funcoes = lerFuncoes(g.funcoes);
  const ambiente = textoAmbiente(lerAmbiente(g.ambiente));
  const linhas = [
    g.setor ? `Setor: ${g.setor}.` : '',
    funcoes.length ? `Funções: ${funcoes.map((f) => (f.cbo ? `${f.nome} (CBO ${f.cbo})` : f.nome)).join(', ')}.` : '',
    ambiente ? `Ambiente: ${ambiente}` : '',
    ...funcoes.filter((f) => f.atividades).map((f) => `O que faz ${f.nome}: ${f.atividades}`),
    g.descricao ?? '',
  ].filter(Boolean);
  return linhas.length ? linhas.join('\n') : null;
}
