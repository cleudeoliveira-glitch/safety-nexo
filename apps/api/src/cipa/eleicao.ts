import { calendarioCipa } from './dimensionamento';

const DIA_MS = 24 * 60 * 60 * 1000;
const dias = (de: Date, ate: Date) => Math.round((ate.getTime() - de.getTime()) / DIA_MS);
const data = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });

type Prazos = { editalEm: Date; inscricaoInicio: Date; inscricaoFim: Date; eleicaoEm: Date };

// Confere os prazos do item 5.5 contra o mandato atual. Devolve avisos em linguagem simples.
export function conferirPrazos(eleicao: Prazos, inicioMandatoAtual: Date | null): string[] {
  const avisos: string[] = [];
  if (eleicao.inscricaoInicio < eleicao.editalEm) avisos.push('As inscrições começam antes da publicação do edital.');
  // 5.5.3 b: mínimo de quinze dias corridos de inscrição, contando o primeiro e o último dia.
  const diasInscricao = dias(eleicao.inscricaoInicio, eleicao.inscricaoFim) + 1;
  if (diasInscricao < 15) avisos.push(`As inscrições ficam abertas ${diasInscricao} dia(s); a NR-05 pede no mínimo 15 dias corridos (5.5.3, b).`);
  if (eleicao.eleicaoEm <= eleicao.inscricaoFim) avisos.push('A eleição precisa ser depois do fim das inscrições.');

  if (inicioMandatoAtual) {
    const c = calendarioCipa(inicioMandatoAtual);
    if (eleicao.editalEm > c.convocacaoAte) avisos.push(`O edital deveria sair até ${data(c.convocacaoAte)}, 60 dias antes do fim do mandato (5.5.1).`);
    if (eleicao.eleicaoEm > c.eleicaoAte) avisos.push(`A eleição deveria ocorrer até ${data(c.eleicaoAte)}, 30 dias antes do fim do mandato (5.5.3, f).`);
  }
  return avisos;
}

// 5.5.4: abaixo de 50% de participação não há apuração; a votação é prorrogada.
export function participacao(votantes: number | null, empregados: number) {
  if (votantes === null || empregados <= 0) return null;
  const percentual = Math.round((votantes / empregados) * 1000) / 10;
  return { votantes, empregados, percentual, valida: percentual >= 50 };
}

type Candidato = { id: string; nome: string; votos: number | null; dataAdmissao: Date | null };
export type Situacao = 'TITULAR' | 'SUPLENTE' | 'NAO_ELEITO';

// 5.5.6: os mais votados assumem como titulares e depois suplentes.
// 5.5.7: no empate, vence quem tem mais tempo de serviço no estabelecimento.
// 5.5.8: os não eleitos ficam listados em ordem decrescente de votos.
export function apurar<T extends Candidato>(candidatos: T[], efetivos: number, suplentes: number) {
  const admissao = (c: Candidato) => c.dataAdmissao?.getTime() ?? Number.POSITIVE_INFINITY;
  return [...candidatos]
    .sort((a, b) => (b.votos ?? 0) - (a.votos ?? 0) || admissao(a) - admissao(b) || a.nome.localeCompare(b.nome))
    .map((c, i) => ({
      ...c,
      posicao: i + 1,
      situacao: (i < efetivos ? 'TITULAR' : i < efetivos + suplentes ? 'SUPLENTE' : 'NAO_ELEITO') as Situacao,
    }));
}

// 5.7.4: carga horária mínima do treinamento por grau de risco.
export function cargaHoraria(grauRisco: number | null): number | null {
  return grauRisco ? ({ 1: 8, 2: 12, 3: 16, 4: 20 } as Record<number, number>)[grauRisco] ?? null : null;
}

// 5.7.2, mais a alínea sobre assédio incluída pela Lei 14.457/2022.
export const CONTEUDO_TREINAMENTO = [
  'Estudo do ambiente, das condições de trabalho e dos riscos originados do processo produtivo',
  'Noções sobre acidentes e doenças relacionadas ao trabalho e medidas de prevenção',
  'Metodologia de investigação e análise de acidentes e doenças relacionadas ao trabalho',
  'Princípios gerais de higiene do trabalho e de medidas de prevenção dos riscos',
  'Noções sobre as legislações trabalhista e previdenciária relativas à segurança e saúde no trabalho',
  'Noções sobre a inclusão de pessoas com deficiência e reabilitados nos processos de trabalho',
  'Organização da CIPA e outros assuntos necessários ao exercício das atribuições da Comissão',
  'Prevenção e combate ao assédio sexual e a outras formas de violência no trabalho',
];
