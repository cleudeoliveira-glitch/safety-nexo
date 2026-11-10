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
// Se o médico ainda não definiu prazo, vale o padrão da NR-07 (7.5.8): todo ano para quem tem
// risco no PGR e a cada 2 anos para os demais.
// Não há próximo exame após o demissional nem quando o resultado é inapto.
export function proximoExame(programa: ExameProgramado[], tipo: TipoAso, resultado: string, dataExame: Date, temRisco = true): Date | null {
  if (tipo === 'DEMISSIONAL' || resultado !== 'APTO') return null;
  const meses = programa
    .filter((e) => e.periodico && e.periodicidadeMeses)
    .map((e) => e.periodicidadeMeses as number);
  const prazo = meses.length ? Math.min(...meses) : temRisco ? 12 : 24;
  const proxima = new Date(dataExame);
  proxima.setMonth(proxima.getMonth() + prazo);
  return proxima;
}

// NR-07 (7.5.11): o demissional pode ser dispensado se o último exame foi feito há menos de
// 135 dias (grau de risco 1 e 2) ou 90 dias (grau 3 e 4).
export function dispensaDemissional(grauRisco: number | null, ultimoExame: Date | null, desligamento: Date) {
  const limite = grauRisco && grauRisco >= 3 ? 90 : 135;
  if (!ultimoExame) return { dispensa: false, limite, dias: null as number | null };
  const dias = Math.floor((desligamento.getTime() - ultimoExame.getTime()) / 86_400_000);
  return { dispensa: dias >= 0 && dias < limite, limite, dias };
}
