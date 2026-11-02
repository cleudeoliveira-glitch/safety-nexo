// Treinamentos mais comuns, para montar a turma com um clique. Tudo pode ser ajustado na turma.
export type ModeloTreinamento = { nome: string; norma: string | null; cargaHoraria: number | null; validadeMeses: number | null; conteudo: string[] };

export const CATALOGO: ModeloTreinamento[] = [
  {
    nome: 'Trabalho em altura',
    norma: 'NR-35',
    cargaHoraria: 8,
    validadeMeses: 24, // treinamento periódico bienal
    conteudo: [
      'Normas e regulamentos aplicáveis ao trabalho em altura',
      'Análise de risco e condições impeditivas',
      'Riscos potenciais inerentes ao trabalho em altura e medidas de prevenção e controle',
      'Sistemas, equipamentos e procedimentos de proteção coletiva',
      'Equipamentos de proteção individual: seleção, inspeção, conservação e limitação de uso',
      'Acidentes típicos em trabalhos em altura',
      'Condutas em situações de emergência, incluindo noções de técnicas de resgate e de primeiros socorros',
    ],
  },
  {
    nome: 'Segurança em instalações e serviços em eletricidade (básico)',
    norma: 'NR-10',
    cargaHoraria: 40,
    validadeMeses: 24, // reciclagem bienal
    conteudo: [
      'Introdução à segurança com eletricidade',
      'Riscos em instalações e serviços com eletricidade',
      'Técnicas de análise de risco',
      'Medidas de controle do risco elétrico',
      'Normas técnicas brasileiras e regulamentações do Ministério do Trabalho',
      'Equipamentos de proteção coletiva e individual',
      'Rotinas de trabalho e procedimentos',
      'Documentação de instalações elétricas',
      'Riscos adicionais',
      'Proteção e combate a incêndios',
      'Acidentes de origem elétrica',
      'Primeiros socorros',
      'Responsabilidades',
    ],
  },
  {
    nome: 'Espaço confinado: trabalhador autorizado e vigia',
    norma: 'NR-33',
    cargaHoraria: 16,
    validadeMeses: 12, // periódico anual
    conteudo: [
      'Definições',
      'Reconhecimento, avaliação e controle de riscos',
      'Funcionamento de equipamentos utilizados',
      'Procedimentos e utilização da Permissão de Entrada e Trabalho',
      'Noções de resgate e primeiros socorros',
    ],
  },
  {
    nome: 'Espaço confinado: supervisor de entrada',
    norma: 'NR-33',
    cargaHoraria: 40,
    validadeMeses: 12,
    conteudo: [
      'Definições',
      'Reconhecimento, avaliação e controle de riscos',
      'Funcionamento de equipamentos utilizados',
      'Procedimentos e utilização da Permissão de Entrada e Trabalho',
      'Noções de resgate e primeiros socorros',
      'Identificação dos espaços confinados',
      'Critérios de indicação e uso de equipamentos para controle de riscos',
      'Conhecimentos sobre práticas seguras em espaços confinados',
      'Legislação de segurança e saúde no trabalho',
      'Programa de proteção respiratória',
      'Área classificada',
      'Operações de salvamento',
    ],
  },
  {
    nome: 'Uso, guarda e conservação de EPI',
    norma: 'NR-06',
    cargaHoraria: null,
    validadeMeses: null,
    conteudo: ['Riscos da atividade e EPIs indicados', 'Uso correto e limitações', 'Guarda, higienização e conservação', 'Quando e como pedir a troca'],
  },
  {
    nome: 'Segurança em máquinas e equipamentos',
    norma: 'NR-12',
    cargaHoraria: null,
    validadeMeses: null,
    conteudo: [
      'Descrição e identificação dos riscos associados a cada máquina e às proteções específicas',
      'Funcionamento das proteções: como e por que devem ser usadas',
      'Como e em que circunstâncias uma proteção pode ser removida e por quem',
      'O que fazer se uma proteção for danificada ou perder sua função',
      'Princípios de segurança na utilização da máquina',
      'Segurança para riscos mecânicos, elétricos e outros relevantes',
      'Método de trabalho seguro',
      'Permissão de trabalho e sistema de bloqueio durante manutenção',
    ],
  },
  {
    nome: 'Integração de segurança',
    norma: null,
    cargaHoraria: 4,
    validadeMeses: null,
    conteudo: ['Política de segurança da empresa', 'Riscos do local de trabalho (PGR)', 'EPIs e regras de uso', 'Procedimentos de emergência e rotas de fuga', 'Comunicação de acidentes e quase acidentes'],
  },
];
