// Nível de ação (NR-09): a partir dele já começam as ações preventivas (monitoramento da exposição,
// informação aos trabalhadores e controle médico), mesmo abaixo do limite de tolerância.
// Ruído: metade da dose (50%). Pela NR-15 (q = 5) isso dá 80 dB(A); pela NHO-01 (q = 3), 82 dB(A).
// Agentes químicos: metade do limite de exposição. Calor e vibração têm regra própria nos anexos e ficam de fora.
export type SituacaoExposicao = 'ACIMA_LIMITE' | 'NIVEL_ACAO' | 'ABAIXO';
export type AgenteMedido = { tipo: string; agente: string; intensidade?: string | null; limiteTolerancia?: string | null; tecnicaMedicao?: string | null };

export const ehRuido = (agente: string) => /ru[ií]do/i.test(agente);
const numero = (t?: string | null) => {
  const m = (t ?? '').replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

export function nivelDeAcao(r: AgenteMedido): { situacao: SituacaoExposicao; nivelAcao: number; limite: number; valor: number; unidade: string } | null {
  if (/calor|ibutg|vibra/i.test(r.agente)) return null;
  const valor = numero(r.intensidade);
  if (valor === null) return null;
  const emDose = /%/.test(r.intensidade ?? '');
  let limite = numero(r.limiteTolerancia);
  let nivelAcao: number;
  let unidade = (r.intensidade ?? '').replace(/^[\s\d.,-]+/, '').trim();
  if (r.tipo === 'FISICO' && ehRuido(r.agente)) {
    if (emDose) { limite = 100; nivelAcao = 50; unidade = '%'; }
    else {
      limite = limite ?? 85;
      nivelAcao = limite - (/nho.?0?1/i.test(r.tecnicaMedicao ?? '') ? 3 : 5);
      unidade = 'dB(A)';
    }
  } else if (r.tipo === 'QUIMICO' && limite !== null && limite > 0) {
    nivelAcao = limite / 2;
  } else return null;
  const situacao: SituacaoExposicao = valor > limite! ? 'ACIMA_LIMITE' : valor >= nivelAcao ? 'NIVEL_ACAO' : 'ABAIXO';
  return { situacao, nivelAcao, limite: limite!, valor, unidade };
}

export const NOME_SITUACAO_EXPOSICAO: Record<SituacaoExposicao, string> = {
  ACIMA_LIMITE: 'acima do limite de tolerância',
  NIVEL_ACAO: 'acima do nível de ação',
  ABAIXO: 'abaixo do nível de ação',
};

// Respirador no EPI do risco: pede o Programa de Proteção Respiratória.
export const pedeRespirador = (epi?: string | null) => /respira|pff ?[123]|m[aá]scara|semifacial|facial inteira|filtro (qu[ií]mico|mec[aâ]nico|p[123])|\bvo\b|cartucho/i.test(epi ?? '');
