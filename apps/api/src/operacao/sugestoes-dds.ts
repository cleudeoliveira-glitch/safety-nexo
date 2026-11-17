import { TEMAS_DDS, TemaDds } from './temas-dds';

// Sugere temas de DDS a partir do que a empresa tem de risco: os riscos dos GHEs,
// os espaços confinados e as permissões de trabalho recentes.
// Temas dados nos últimos 90 dias ficam de fora, para não repetir.

type Regra = { categoria: string; teste: (tipo: string, agente: string) => boolean };
const tem = (re: RegExp) => (_: string, agente: string) => re.test(agente);

const REGRAS: Regra[] = [
  { categoria: 'Ruído e vibração', teste: tem(/ru[ií]do|vibra/) },
  { categoria: 'Calor e frio', teste: tem(/calor|frio|temperatura|t[eé]rmic/) },
  { categoria: 'Trabalho em altura', teste: tem(/altura|queda de (n[ií]vel|pessoa)|telhado|andaime/) },
  { categoria: 'Eletricidade', teste: tem(/el[eé]tric|choque|energizad/) },
  { categoria: 'Incêndio e emergência', teste: tem(/inc[eê]ndio|explos|inflam[aá]v|fogo|combust/) },
  { categoria: 'Máquinas e ferramentas', teste: tem(/m[aá]quina|prensa|serra|esmeril|partes m[oó]veis|ferramenta|corte|prensamento|aprisionamento/) },
  { categoria: 'Espaço confinado', teste: tem(/confinad/) },
  { categoria: 'Trânsito e transporte', teste: tem(/ve[ií]culo|empilhadeira|tr[aâ]nsito|atropel|dire[cç][aã]o|motorista/) },
  { categoria: 'Produtos químicos', teste: (tipo, a) => tipo === 'QUIMICO' || /poeira|fumo|vapor|n[eé]voa|g[aá]s|solvente|qu[ií]mic|[aá]cido/.test(a) },
  { categoria: 'Ergonomia', teste: (tipo, a) => (tipo === 'ERGONOMICO' && !/psicossocial|estresse|ass[eé]dio|press[aã]o/.test(a)) || /postura|levantamento|repetitiv|peso/.test(a) },
  { categoria: 'Saúde e bem-estar', teste: (tipo, a) => tipo === 'BIOLOGICO' || /psicossocial|estresse|fadiga|jornada|press[aã]o/.test(a) },
  { categoria: 'Respeito e convivência', teste: tem(/ass[eé]dio|viol[eê]ncia|conflito/) },
  { categoria: 'Ordem e limpeza', teste: tem(/escorreg|trope[cç]|piso|queda de mesmo n[ií]vel|queda de objeto/) },
  { categoria: 'Primeiros socorros', teste: tem(/queimadura|corte|perfura/) },
];

const PT_CATEGORIA: Record<string, [string, string]> = {
  ALTURA: ['Trabalho em altura', 'trabalho em altura'], ELETRICIDADE: ['Eletricidade', 'eletricidade'], QUENTE: ['Incêndio e emergência', 'trabalho a quente'],
  ESPACO_CONFINADO: ['Espaço confinado', 'espaço confinado'],
  // Içamento e escavação têm tema próprio na biblioteca: vai direto nele.
  ICAMENTO: ['tema:Movimentação de cargas com guindaste ou talha', 'içamento'], ESCAVACAO: ['tema:Escavações e valas', 'escavação'],
};
const PESO: Record<string, number> = { BAIXA: 1, MEDIA: 2, ALTA: 3 };

export type RiscoParaDds = { ghe: string; tipo: string; agente: string; severidade: string; probabilidade: string };
export type SugestaoDds = TemaDds & { motivo: string };

export function sugerirTemasDds(
  riscos: RiscoParaDds[],
  extras: { espacosConfinados: number; tiposPt: string[]; temasRecentes: string[] },
  quantos = 6,
): SugestaoDds[] {
  const pontos = new Map<string, { pontos: number; motivo: string }>();
  const somar = (categoria: string, valor: number, motivo: string) => {
    const atual = pontos.get(categoria);
    if (!atual) pontos.set(categoria, { pontos: valor, motivo });
    else atual.pontos += valor; // o primeiro motivo (o risco mais pesado) fica
  };

  const ordenados = [...riscos].sort((a, b) => PESO[b.severidade] * PESO[b.probabilidade] - PESO[a.severidade] * PESO[a.probabilidade]);
  for (const r of ordenados) {
    const agente = r.agente.toLowerCase();
    for (const regra of REGRAS) {
      if (regra.teste(r.tipo, agente)) somar(regra.categoria, (PESO[r.severidade] ?? 2) * (PESO[r.probabilidade] ?? 2), `Risco de ${r.agente.toLowerCase()} em ${r.ghe}`);
    }
  }
  if (extras.espacosConfinados) somar('Espaço confinado', 6, `${extras.espacosConfinados} espaço(s) confinado(s) cadastrado(s)`);
  for (const t of new Set(extras.tiposPt)) if (PT_CATEGORIA[t]) somar(PT_CATEGORIA[t][0], 4, `PT de ${PT_CATEGORIA[t][1]} nos últimos 90 dias`);

  const recentes = new Set(extras.temasRecentes.map((t) => t.trim().toLowerCase()));
  const livres = (categoria: string) => TEMAS_DDS.filter((t) => (categoria.startsWith('tema:') ? t.tema === categoria.slice(5) : t.categoria === categoria) && !recentes.has(t.tema.toLowerCase()));
  const categorias = [...pontos.entries()].sort((a, b) => b[1].pontos - a[1].pontos);

  // Um tema por categoria, da mais pesada para a mais leve; se sobrar vaga, volta para pegar o segundo.
  const escolhidos: SugestaoDds[] = [];
  for (let rodada = 0; escolhidos.length < quantos && rodada < 3; rodada++) {
    for (const [categoria, { motivo }] of categorias) {
      const t = livres(categoria)[rodada];
      if (t && escolhidos.length < quantos && !escolhidos.some((x) => x.tema === t.tema)) escolhidos.push({ ...t, motivo });
    }
  }
  return escolhidos;
}
