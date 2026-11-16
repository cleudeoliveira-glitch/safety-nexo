import type { Capa } from './layout';

// O que é cada documento, para que serve e o que a norma pede. Vai na capa, então aparece
// na pré-visualização antes de gerar o PDF e fica no próprio documento.
export const ESCOPOS: Record<string, Capa['escopo']> = {
  PGR: {
    oQueE: 'O programa que reúne o inventário de riscos e o plano de ação da empresa.',
    paraQue: 'Mostrar, setor por setor, o que pode machucar ou adoecer quem trabalha aqui, o tamanho de cada risco e o que vai ser feito para controlar.',
    norma: 'A NR-01 (item 1.5) pede a caracterização dos processos, ambientes e atividades, os perigos com suas fontes e os grupos expostos, a avaliação com nível de risco e um plano de ação com prazos e acompanhamento. Revisão a cada 2 anos ou quando algo mudar.',
  },
  PGRTR: {
    oQueE: 'O programa de gerenciamento de riscos próprio do trabalho rural.',
    paraQue: 'Levantar os riscos das atividades no campo e organizar as medidas de prevenção.',
    norma: 'A NR-31 (item 31.3) pede o levantamento dos riscos por atividade, as medidas de prevenção e o plano de ação, com a participação dos trabalhadores.',
  },
  PCMSO: {
    oQueE: 'O programa de exames médicos ocupacionais da empresa.',
    paraQue: 'Acompanhar a saúde de cada trabalhador conforme os riscos a que ele está exposto e perceber cedo qualquer doença ligada ao trabalho.',
    norma: 'A NR-07 pede um médico responsável, exames planejados a partir dos riscos do PGR, com tipo e periodicidade por função, e um relatório analítico por ano.',
  },
  LTCAT: {
    oQueE: 'O laudo das condições ambientais do trabalho para a Previdência.',
    paraQue: 'Registrar se há exposição a agentes nocivos e servir de base para o PPP e para a aposentadoria especial.',
    norma: 'A Lei 8.213/91 (art. 58) e a IN PRES/INSS 128/2022 pedem laudo assinado por médico do trabalho ou engenheiro de segurança, com os agentes, a intensidade ou concentração, o tempo de exposição, a eficácia do EPC e do EPI e a conclusão por função.',
  },
  LIP: {
    oQueE: 'O laudo de insalubridade e periculosidade.',
    paraQue: 'Dizer, GHE por GHE, se há direito ao adicional de insalubridade (e em qual grau) ou de periculosidade.',
    norma: 'A CLT (art. 195), a NR-15 e a NR-16 pedem perícia feita por médico do trabalho ou engenheiro de segurança, com a avaliação dos agentes pelos anexos das normas e a conclusão fundamentada.',
  },
  LPP: {
    oQueE: 'O laudo de periculosidade.',
    paraQue: 'Dizer quais atividades ou áreas dão direito ao adicional de periculosidade de 30%.',
    norma: 'A CLT (art. 193 e 195) e a NR-16 pedem perícia feita por médico do trabalho ou engenheiro de segurança, indicando o anexo da norma que enquadra cada atividade.',
  },
  AET: {
    oQueE: 'A análise ergonômica aprofundada de um posto ou atividade.',
    paraQue: 'Entender por que o trabalho está causando desconforto ou risco e propor mudanças que funcionem na prática.',
    norma: 'A NR-17 (itens 17.3.2 e 17.3.3) pede a análise da demanda, do funcionamento do trabalho, os métodos usados, o diagnóstico, as recomendações e a devolutiva com os trabalhadores.',
  },
};

type EmpresaCapa = {
  razaoSocial: string; cnpj: string; cnae: string | null; grauRisco: number | null; endereco: string | null; numFuncionarios: number;
  responsavelTecnicoNome: string | null; responsavelTecnicoRegistro: string | null; responsavelTecnicoFormacao: string | null; responsavelTecnicoArt: string | null;
};

// Responsável técnico da empresa: engenheiro emite ART (CREA); técnico de segurança emite TRT (CFT).
export const responsavelTecnico = (e: EmpresaCapa, papel = 'Responsável técnico'): Capa['responsaveis'][number] => ({
  papel,
  nome: e.responsavelTecnicoNome,
  formacao: e.responsavelTecnicoFormacao,
  registro: e.responsavelTecnicoRegistro,
  documento: { rotulo: 'ART/TRT', numero: e.responsavelTecnicoArt },
});

export function capaDe(sigla: keyof typeof ESCOPOS, e: EmpresaCapa, versao: number | undefined, emitidoEm: Date, responsaveis: Capa['responsaveis'], vigencia?: string): Capa {
  return {
    sigla,
    empresa: { razaoSocial: e.razaoSocial, cnpj: e.cnpj, cnae: e.cnae, grauRisco: e.grauRisco, endereco: e.endereco, numFuncionarios: e.numFuncionarios },
    responsaveis,
    versao,
    emitidoEm,
    vigencia,
    escopo: ESCOPOS[sigla],
  };
}

// Documentos sem capa (OS, APR, PT, inspeção): identificação completa no cabeçalho, como pede o parecer do item 8.
export function identificacao(e: Pick<EmpresaCapa, 'razaoSocial' | 'cnpj' | 'cnae' | 'grauRisco' | 'endereco' | 'responsavelTecnicoNome' | 'responsavelTecnicoRegistro'>): [string, string][] {
  const linhas: [string, string | null][] = [
    ['Empresa', e.razaoSocial],
    ['CNPJ', e.cnpj],
    ['CNAE', e.cnae],
    ['Grau de risco', e.grauRisco ? String(e.grauRisco) : null],
    ['Endereço', e.endereco],
    ['Responsável técnico', e.responsavelTecnicoNome ? [e.responsavelTecnicoNome, e.responsavelTecnicoRegistro].filter(Boolean).join(' · ') : null],
  ];
  return linhas.filter((l): l is [string, string] => Boolean(l[1]));
}
