// Anexos da NR-15 (insalubridade) e da NR-16 (periculosidade).
// O grau sugerido é o que o próprio anexo define; quando o anexo define o grau por substância
// ou por atividade, fica em branco para o profissional escolher.

export type Grau = 'NAO' | 'MINIMO' | 'MEDIO' | 'MAXIMO';
export const GRAUS: Record<Grau, { nome: string; percentual: number }> = {
  NAO: { nome: 'Não insalubre', percentual: 0 },
  MINIMO: { nome: 'Grau mínimo', percentual: 10 },
  MEDIO: { nome: 'Grau médio', percentual: 20 },
  MAXIMO: { nome: 'Grau máximo', percentual: 40 },
};
export const ehGrau = (g: string): g is Grau => g in GRAUS;

export const ANEXOS_NR15: { anexo: string; nome: string; grau: Grau | null }[] = [
  { anexo: '1', nome: 'Ruído contínuo ou intermitente', grau: 'MEDIO' },
  { anexo: '2', nome: 'Ruído de impacto', grau: 'MEDIO' },
  { anexo: '3', nome: 'Calor', grau: 'MEDIO' },
  { anexo: '5', nome: 'Radiações ionizantes', grau: 'MAXIMO' },
  { anexo: '6', nome: 'Condições hiperbáricas', grau: 'MAXIMO' },
  { anexo: '7', nome: 'Radiações não ionizantes', grau: 'MEDIO' },
  { anexo: '8', nome: 'Vibrações', grau: 'MEDIO' },
  { anexo: '9', nome: 'Frio', grau: 'MEDIO' },
  { anexo: '10', nome: 'Umidade', grau: 'MEDIO' },
  { anexo: '11', nome: 'Agentes químicos com limite de tolerância', grau: null },
  { anexo: '12', nome: 'Poeiras minerais', grau: 'MAXIMO' },
  { anexo: '13', nome: 'Agentes químicos (avaliação qualitativa)', grau: null },
  { anexo: '13-A', nome: 'Benzeno', grau: null },
  { anexo: '14', nome: 'Agentes biológicos', grau: null },
];

export const ANEXOS_NR16: { codigo: string; anexo: string; nome: string }[] = [
  { codigo: 'EXPLOSIVOS', anexo: 'Anexo 1', nome: 'Atividades e operações perigosas com explosivos' },
  { codigo: 'INFLAMAVEIS', anexo: 'Anexo 2', nome: 'Atividades e operações perigosas com inflamáveis' },
  { codigo: 'SEGURANCA', anexo: 'Anexo 3', nome: 'Exposição a roubos ou outras violências físicas na segurança pessoal ou patrimonial' },
  { codigo: 'ELETRICIDADE', anexo: 'Anexo 4', nome: 'Atividades e operações perigosas com energia elétrica' },
  { codigo: 'MOTOCICLETA', anexo: 'Anexo 5', nome: 'Atividades perigosas em motocicleta' },
  { codigo: 'RADIACOES', anexo: 'Anexo (*)', nome: 'Radiações ionizantes ou substâncias radioativas' },
];
export const ehAnexoNr16 = (c: string) => c === 'NENHUM' || ANEXOS_NR16.some((a) => a.codigo === c);
