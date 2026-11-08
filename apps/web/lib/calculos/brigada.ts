// Cópia de apps/api/src/emergencia/it17.ts para a calculadora funcionar no celular, até sem internet. Mude os dois juntos.
// Brigada de incêndio: Instrução Técnica nº 17/2025 do Corpo de Bombeiros de São Paulo
// (Portaria CCB 003/800/25, DOE de 19/03/2025), Tabela A.1 e Tabela B.2.
// Outros estados têm instrução técnica própria: o resultado deve ser conferido com a norma local.

export type Risco = 'BAIXO' | 'MEDIO' | 'ALTO';
export type Nivel = 'BASICO' | 'INTERMEDIARIO' | 'AVANCADO' | 'NOTA_8' | 'VER_IT' | 'ISENTO';
type Linha = { divisao: string; descricao: string; risco: Risco; base: [number, number, number, number, number] | null; nivel: Nivel; especial?: string };

const L = (divisao: string, descricao: string, risco: Risco, base: Linha['base'], nivel: Nivel, especial?: string): Linha => ({ divisao, descricao, risco, base, nivel, especial });

// base = brigadistas por pavimento para população fixa até 2, 4, 6, 8 e 10 pessoas.
export const TABELA_A1: Linha[] = [
  L('A-1', 'Habitação unifamiliar', 'BAIXO', null, 'ISENTO', 'Isenta de brigada.'),
  L('A-2', 'Habitação multifamiliar', 'BAIXO', null, 'BASICO', 'A brigada é 80% dos funcionários mais 1 por pavimento.'),
  L('A-3', 'Habitação coletiva', 'BAIXO', [1, 2, 3, 4, 4], 'BASICO'),
  L('B-1', 'Hotel e assemelhado', 'MEDIO', [1, 2, 3, 4, 4], 'NOTA_8'),
  L('B-2', 'Hotel residencial', 'MEDIO', [1, 2, 3, 4, 4], 'NOTA_8'),
  L('C-1', 'Comércio com baixa carga de incêndio', 'BAIXO', [1, 2, 2, 2, 2], 'BASICO'),
  L('C-2', 'Comércio com média carga de incêndio', 'MEDIO', [1, 2, 3, 4, 4], 'VER_IT'),
  L('C-2', 'Comércio com alta carga de incêndio', 'ALTO', [2, 2, 3, 4, 5], 'NOTA_8'),
  L('C-3', 'Shopping center', 'MEDIO', [2, 4, 5, 6, 8], 'NOTA_8'),
  L('D-1', 'Serviço profissional', 'BAIXO', [1, 2, 2, 2, 2], 'BASICO'),
  L('D-1', 'Serviço profissional', 'MEDIO', [1, 2, 3, 4, 4], 'NOTA_8'),
  L('D-2', 'Agência bancária', 'BAIXO', [1, 2, 3, 4, 4], 'BASICO'),
  L('D-3', 'Serviço de reparação', 'BAIXO', [1, 2, 2, 2, 2], 'BASICO'),
  L('D-3', 'Serviço de reparação', 'MEDIO', [1, 2, 3, 4, 4], 'NOTA_8'),
  L('D-4', 'Laboratório', 'BAIXO', [1, 2, 2, 2, 2], 'BASICO'),
  L('D-4', 'Laboratório', 'MEDIO', [2, 3, 4, 5, 6], 'NOTA_8'),
  L('E-1', 'Escola em geral', 'BAIXO', [1, 2, 3, 4, 4], 'BASICO'),
  L('E-2', 'Escola especial', 'BAIXO', [1, 2, 2, 2, 2], 'BASICO'),
  L('E-3', 'Espaço para cultura física', 'BAIXO', [1, 2, 2, 2, 2], 'BASICO'),
  L('E-4', 'Centro de treinamento profissional', 'BAIXO', [1, 2, 3, 4, 4], 'BASICO'),
  L('E-5', 'Pré-escola', 'BAIXO', [2, 4, 6, 8, 8], 'BASICO', 'Acima de 10 pessoas, o cálculo usa 80% da população fixa.'),
  L('E-6', 'Escola para pessoas com deficiência', 'BAIXO', [2, 4, 6, 6, 8], 'BASICO', 'Acima de 10 pessoas, o cálculo usa 80% da população fixa.'),
  L('F-1', 'Local com objeto de valor inestimável', 'BAIXO', [1, 2, 3, 4, 4], 'BASICO'),
  L('F-1', 'Local com objeto de valor inestimável', 'ALTO', [2, 2, 3, 4, 5], 'NOTA_8'),
  L('F-4', 'Estação e terminal de passageiros', 'BAIXO', [2, 3, 4, 5, 6], 'BASICO'),
  L('F-8', 'Local para refeição', 'BAIXO', null, 'BASICO', 'Calculado pela lotação máxima (item 4.11.2).'),
  L('F-9', 'Recreação pública', 'BAIXO', [1, 2, 2, 2, 2], 'BASICO'),
  L('F-10', 'Exposição de objetos e animais', 'BAIXO', [1, 2, 2, 2, 2], 'NOTA_8'),
  L('G-1', 'Garagem sem acesso de público e sem abastecimento', 'BAIXO', [1, 2, 2, 2, 2], 'BASICO'),
  L('G-2', 'Garagem com acesso de público e sem abastecimento', 'BAIXO', [1, 2, 3, 4, 4], 'BASICO'),
  L('G-3', 'Local com abastecimento de combustível', 'BAIXO', [1, 2, 3, 4, 4], 'BASICO'),
  L('G-4', 'Serviço de conservação, manutenção e reparos', 'BAIXO', [1, 2, 2, 2, 2], 'BASICO'),
  L('H-1', 'Hospital veterinário e assemelhado', 'BAIXO', [1, 2, 2, 2, 2], 'BASICO'),
  L('H-2', 'Local de cuidados especiais por limitações', 'MEDIO', [2, 4, 5, 6, 8], 'NOTA_8'),
  L('H-3', 'Hospital e assemelhado', 'BAIXO', [2, 3, 4, 5, 6], 'NOTA_8'),
  L('H-4', 'Repartição pública, edificações das Forças Armadas e policiais', 'MEDIO', [1, 2, 3, 4, 4], 'BASICO'),
  L('H-6', 'Clínica e consultório médico ou odontológico', 'BAIXO', [1, 2, 2, 2, 2], 'BASICO'),
  L('I-1', 'Indústria com baixa carga de incêndio', 'BAIXO', [1, 2, 2, 2, 2], 'BASICO'),
  L('I-2', 'Indústria com média carga de incêndio', 'MEDIO', [2, 4, 4, 5, 6], 'INTERMEDIARIO'),
  L('I-3', 'Indústria com alta carga de incêndio', 'ALTO', [2, 4, 5, 7, 8], 'AVANCADO'),
  L('J-1', 'Depósito de material incombustível', 'BAIXO', [1, 2, 2, 2, 2], 'BASICO'),
  L('J-2', 'Depósito com baixa carga de incêndio', 'BAIXO', [1, 2, 2, 2, 2], 'BASICO'),
  L('J-3', 'Depósito com média carga de incêndio', 'MEDIO', [1, 2, 3, 4, 4], 'INTERMEDIARIO'),
  L('J-4', 'Depósito com alta carga de incêndio', 'ALTO', [2, 4, 5, 6, 8], 'AVANCADO'),
  L('M-2', 'Tanques e depósitos de líquidos ou gases inflamáveis', 'ALTO', [2, 4, 6, 8, 10], 'AVANCADO'),
];

// Acima de 10 pessoas: mais 1 brigadista a cada grupo de até 20 (risco baixo), 15 (médio) ou 10 (alto) pessoas.
const GRUPO: Record<Risco, number> = { BAIXO: 20, MEDIO: 15, ALTO: 10 };

// Tabela B.2: carga horária mínima (horas) por nível. Atualização a cada 12 meses (item 4.4.1.4.2).
export const CARGA_HORARIA = { BASICO: 4, INTERMEDIARIO: 8, AVANCADO: 24 } as const;
export const NOME_NIVEL: Record<Nivel, string> = {
  BASICO: 'Básico',
  INTERMEDIARIO: 'Intermediário',
  AVANCADO: 'Avançado',
  NOTA_8: 'Básico até 20 brigadistas; acima disso, pelo menos 4 intermediários por turno e mais 1 a cada 20',
  VER_IT: 'Conforme nota da IT 17 para esta divisão',
  ISENTO: 'Isento',
};

export const ehLinha = (divisao: string, risco: string) => TABELA_A1.some((l) => l.divisao === divisao && l.risco === risco);

function porPavimento(l: Linha, pessoas: number): number {
  if (!l.base || pessoas <= 0) return 0;
  if (pessoas <= 10) return l.base[Math.ceil(pessoas / 2) - 1];
  const acima = l.especial?.includes('80%') ? Math.ceil((pessoas - 10) * 0.8) : pessoas - 10;
  return l.base[4] + Math.ceil(acima / GRUPO[l.risco]);
}

export function dimensionarBrigada(divisao: string, risco: string, populacaoPorPavimento: number[]) {
  const linha = TABELA_A1.find((l) => l.divisao === divisao && l.risco === risco);
  if (!linha) return null;
  if (!linha.base) {
    return { linha, porPavimento: [], total: null, nivel: linha.nivel, nivelTexto: NOME_NIVEL[linha.nivel], observacao: linha.especial ?? null };
  }
  const porPav = populacaoPorPavimento.map((p) => porPavimento(linha, p));
  const total = porPav.reduce((a, b) => a + b, 0);
  let nivelTexto = NOME_NIVEL[linha.nivel];
  if (linha.nivel === 'NOTA_8') nivelTexto = total <= 20 ? 'Básico (até 20 brigadistas)' : `Pelo menos ${4 + Math.floor((total - 20) / 20)} intermediário(s) por turno; os demais podem ser básicos`;
  return { linha, porPavimento: porPav, total, nivel: linha.nivel, nivelTexto, observacao: linha.especial ?? null };
}
