import { lerFuncoes, nomeGhe } from '../empresas/ghe-ambiente';

// Retrato dos GHEs no momento em que o PGR foi emitido.
// O PDF já fica guardado no Arquivo, mas o retrato guarda os dados em si: com ele o sistema sabe
// exatamente o que mudou no cadastro desde a última emissão (inclusive o que foi apagado) e escreve
// isso no histórico de revisões da versão seguinte. Mudar o cadastro depois não mexe no retrato.
export type RiscoRetrato = {
  id: string; tipo: string; agente: string; fonte: string; severidade: string; probabilidade: string;
  epi: string | null; epc: string | null; medidas: string | null; intensidade: string | null;
};
export type GheRetrato = { id: string; nome: string; setor: string | null; funcoes: string[]; riscos: RiscoRetrato[] };
export type Retrato = { tiradoEm: string; ghes: GheRetrato[] };

type GheComRiscos = {
  id: string; nome: string; codigo?: string | null; setor?: string | null; funcoes?: unknown;
  riscos: { id: string; tipo: string; agente: string; fonteGeradora: string; severidade: string; probabilidade: string; medidasEpi?: string | null; medidasEpc?: string | null; medidasControle?: string | null; intensidade?: string | null }[];
};

const limpo = (t?: string | null) => (t ?? '').trim() || null;

export function tirarRetrato(ghes: GheComRiscos[], quando: Date): Retrato {
  return {
    tiradoEm: quando.toISOString(),
    ghes: ghes.map((g) => ({
      id: g.id,
      nome: nomeGhe(g),
      setor: limpo(g.setor),
      funcoes: lerFuncoes(g.funcoes).map((f) => f.nome),
      riscos: g.riscos.map((r) => ({
        id: r.id, tipo: r.tipo, agente: r.agente.trim(), fonte: r.fonteGeradora.trim(), severidade: r.severidade, probabilidade: r.probabilidade,
        epi: limpo(r.medidasEpi), epc: limpo(r.medidasEpc), medidas: limpo(r.medidasControle), intensidade: limpo(r.intensidade),
      })),
    })),
  };
}

export function lerRetrato(valor: unknown): Retrato | null {
  if (!valor || typeof valor !== 'object' || !Array.isArray((valor as Retrato).ghes)) return null;
  return valor as Retrato;
}

// O que mudou de um retrato para o outro, em frases curtas que a consultora entende de cara.
export type Mudancas = { linhas: string[]; total: number };

const lista = (l: string[], max = 3) => `${l.slice(0, max).join(', ')}${l.length > max ? ` e mais ${l.length - max}` : ''}`;
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function compararRetratos(antes: Retrato, agora: Retrato): Mudancas {
  const linhas: string[] = [];
  let total = 0;
  const antigos = new Map(antes.ghes.map((g) => [g.id, g]));
  const atuais = new Map(agora.ghes.map((g) => [g.id, g]));

  const novos = agora.ghes.filter((g) => !antigos.has(g.id));
  const removidos = antes.ghes.filter((g) => !atuais.has(g.id));
  if (novos.length) { linhas.push(`${plural(novos.length, 'GHE incluído', 'GHEs incluídos')}: ${lista(novos.map((g) => g.nome))}`); total += novos.length; }
  if (removidos.length) { linhas.push(`${plural(removidos.length, 'GHE retirado', 'GHEs retirados')}: ${lista(removidos.map((g) => g.nome))}`); total += removidos.length; }

  const incluidos: string[] = []; const retirados: string[] = []; const alterados: string[] = []; const funcoes: string[] = [];
  for (const g of agora.ghes) {
    const a = antigos.get(g.id);
    if (!a) continue;
    const riscosAntes = new Map(a.riscos.map((r) => [r.id, r]));
    const riscosAgora = new Set(g.riscos.map((r) => r.id));
    for (const r of g.riscos) {
      const v = riscosAntes.get(r.id);
      if (!v) incluidos.push(`${r.agente} (${g.nome})`);
      else if (v.agente !== r.agente || v.fonte !== r.fonte || v.severidade !== r.severidade || v.probabilidade !== r.probabilidade
        || v.epi !== r.epi || v.epc !== r.epc || v.medidas !== r.medidas || v.intensidade !== r.intensidade) alterados.push(`${r.agente} (${g.nome})`);
    }
    for (const r of a.riscos) if (!riscosAgora.has(r.id)) retirados.push(`${r.agente} (${g.nome})`);
    const fa = [...a.funcoes].sort().join('|'); const fg = [...g.funcoes].sort().join('|');
    if (fa !== fg) funcoes.push(g.nome);
  }
  if (incluidos.length) linhas.push(`${plural(incluidos.length, 'risco incluído', 'riscos incluídos')}: ${lista(incluidos)}`);
  if (retirados.length) linhas.push(`${plural(retirados.length, 'risco retirado', 'riscos retirados')}: ${lista(retirados)}`);
  if (alterados.length) linhas.push(`${plural(alterados.length, 'risco reavaliado', 'riscos reavaliados')} (classificação, medição ou medidas): ${lista(alterados)}`);
  if (funcoes.length) linhas.push(`Funções alteradas em ${lista(funcoes)}`);
  total += incluidos.length + retirados.length + alterados.length + funcoes.length;
  return { linhas, total };
}

// Texto da coluna "O que mudou" do histórico de revisões.
export function resumoParaHistorico(m: Mudancas | null): string {
  if (!m) return 'Revisão e atualização dos dados.';
  if (!m.linhas.length) return 'Reemissão sem mudança no inventário de riscos.';
  return `${m.linhas.join('. ')}.`;
}
