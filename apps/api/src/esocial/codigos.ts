import {
  ItemTabela, TABELA_13_PARTE_ATINGIDA, TABELA_14_AGENTE_CAUSADOR, TABELA_15_SITUACAO_GERADORA,
  TABELA_17_NATUREZA_LESAO, TABELA_24_AGENTES_NOCIVOS, TABELA_27_PROCEDIMENTOS,
} from './tabelas';

const conjunto = (t: ItemTabela[]) => new Set(t.map(([c]) => c));
export const CODIGOS = {
  t13: conjunto(TABELA_13_PARTE_ATINGIDA),
  t14: conjunto(TABELA_14_AGENTE_CAUSADOR),
  t15: conjunto(TABELA_15_SITUACAO_GERADORA),
  t17: conjunto(TABELA_17_NATUREZA_LESAO),
  t24: conjunto(TABELA_24_AGENTES_NOCIVOS),
  t27: conjunto(TABELA_27_PROCEDIMENTOS),
};

// Grupos da Tabela 24 pelo começo do código, como no PDF oficial.
const GRUPOS_24: Record<string, string> = {
  '01': 'Químicos', '02': 'Físicos', '03': 'Biológicos', '04': 'Associação de agentes', '05': 'Outros agentes nocivos', '09': 'Ausência de agente nocivo',
};

export function tabelasParaTela() {
  return {
    t13: TABELA_13_PARTE_ATINGIDA,
    t14: TABELA_14_AGENTE_CAUSADOR,
    t15: TABELA_15_SITUACAO_GERADORA,
    t17: TABELA_17_NATUREZA_LESAO,
    t24: TABELA_24_AGENTES_NOCIVOS.map(([c, d]) => [c, d, GRUPOS_24[c.slice(0, 2)] ?? 'Outros']),
    t27: TABELA_27_PROCEDIMENTOS,
  };
}
