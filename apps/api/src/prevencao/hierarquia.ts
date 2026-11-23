// Hierarquia de controle da NR-01 (1.5.5.1.2): primeiro tirar o perigo, por último o EPI.
export const HIERARQUIA = ['ELIMINAR', 'SUBSTITUIR', 'EPC', 'ADMINISTRATIVA', 'EPI'] as const;
export type Hierarquia = (typeof HIERARQUIA)[number];
export const NOME_HIERARQUIA: Record<string, string> = {
  ELIMINAR: '1. Eliminar o perigo',
  SUBSTITUIR: '2. Trocar por algo menos perigoso',
  EPC: '3. Proteção coletiva (EPC)',
  ADMINISTRATIVA: '4. Organização do trabalho',
  EPI: '5. EPI',
};

// Primeira medida sugerida para cada tipo de risco quando a ação nasce do inventário.
// É um ponto de partida: o responsável técnico ajusta ao caso real.
export const SUGESTAO_POR_TIPO: Record<string, { hierarquia: Hierarquia; texto: string }> = {
  FISICO: { hierarquia: 'EPC', texto: 'isolar ou enclausurar a fonte e manter os equipamentos regulados' },
  QUIMICO: { hierarquia: 'SUBSTITUIR', texto: 'trocar o produto por outro menos perigoso ou instalar exaustão no ponto de uso' },
  BIOLOGICO: { hierarquia: 'ADMINISTRATIVA', texto: 'definir rotina de limpeza e desinfecção, barreiras e vacinação' },
  ERGONOMICO: { hierarquia: 'ADMINISTRATIVA', texto: 'ajustar o posto de trabalho e organizar pausas e rodízio' },
  ACIDENTE: { hierarquia: 'EPC', texto: 'instalar proteção física no local ou na máquina (proteção fixa, barreira, sinalização)' },
};

// Prazo sugerido pelo nível do risco, em dias.
export const PRAZO_POR_NIVEL: Record<string, number> = { CRITICO: 7, ALTO: 30, MODERADO: 90 };
