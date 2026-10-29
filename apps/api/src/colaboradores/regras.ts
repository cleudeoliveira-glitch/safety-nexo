// Regras do ASO, separadas para poder testar sem banco.

export const TIPOS_ASO = ['ADMISSIONAL', 'PERIODICO', 'RETORNO_TRABALHO', 'MUDANCA_RISCO', 'DEMISSIONAL'] as const;
export type TipoAso = (typeof TIPOS_ASO)[number];

export const NOME_TIPO_ASO: Record<TipoAso, string> = {
  ADMISSIONAL: 'Admissional',
  PERIODICO: 'Periódico',
  RETORNO_TRABALHO: 'Retorno ao trabalho',
  MUDANCA_RISCO: 'Mudança de risco',
  DEMISSIONAL: 'Demissional',
};

type ExameProgramado = {
  nome: string;
  admissional: boolean;
  periodico: boolean;
  retornoTrabalho: boolean;
  mudancaRisco: boolean;
  demissional: boolean;
  periodicidadeMeses: number | null;
};

const CAMPO_DO_TIPO: Record<TipoAso, keyof ExameProgramado> = {
  ADMISSIONAL: 'admissional',
  PERIODICO: 'periodico',
  RETORNO_TRABALHO: 'retornoTrabalho',
  MUDANCA_RISCO: 'mudancaRisco',
  DEMISSIONAL: 'demissional',
};

// Exames do PCMSO que o GHE prevê para este tipo de ASO.
export function examesDoTipo(programa: ExameProgramado[], tipo: TipoAso): string[] {
  return programa.filter((e) => e[CAMPO_DO_TIPO[tipo]]).map((e) => e.nome);
}

// Próximo exame periódico: a menor periodicidade entre os exames periódicos do GHE.
// Não há próximo exame após o demissional nem quando o resultado é inapto.
export function proximoExame(programa: ExameProgramado[], tipo: TipoAso, resultado: string, dataExame: Date): Date | null {
  if (tipo === 'DEMISSIONAL' || resultado !== 'APTO') return null;
  const meses = programa
    .filter((e) => e.periodico && e.periodicidadeMeses)
    .map((e) => e.periodicidadeMeses as number);
  if (meses.length === 0) return null;
  const proxima = new Date(dataExame);
  proxima.setMonth(proxima.getMonth() + Math.min(...meses));
  return proxima;
}
