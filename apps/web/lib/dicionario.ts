// Dicionário SST embutido: cada sigla com o nome completo e uma explicação curta.
export type Verbete = { sigla: string; nome: string; explicacao: string };

export const dicionario: Verbete[] = [
  { sigla: 'ASO', nome: 'Atestado de Saúde Ocupacional', explicacao: 'Documento do médico que diz se o trabalhador está apto para a função. Emitido nos exames admissional, periódico, de retorno, de mudança de risco e demissional (NR-07).' },
  { sigla: 'CIPA', nome: 'Comissão Interna de Prevenção de Acidentes e de Assédio', explicacao: 'Grupo de representantes da empresa e dos empregados que atua na prevenção de acidentes e do assédio (NR-05).' },
  { sigla: 'CNAE', nome: 'Classificação Nacional de Atividades Econômicas', explicacao: 'Código da atividade da empresa. Está no cartão do CNPJ e define o grau de risco pela NR-04.' },
  { sigla: 'EPI', nome: 'Equipamento de Proteção Individual', explicacao: 'Equipamento de uso pessoal que protege o trabalhador, como luva, protetor auricular e capacete. A entrega precisa ser registrada (NR-06).' },
  { sigla: 'GHE', nome: 'Grupo Homogêneo de Exposição', explicacao: 'Grupo de trabalhadores expostos aos mesmos riscos, do mesmo jeito. O PGR e o PCMSO são organizados por GHE.' },
  { sigla: 'GR', nome: 'Grau de Risco', explicacao: 'Número de 1 a 4 que indica o risco da atividade da empresa, conforme o CNAE na NR-04. Define, por exemplo, o dimensionamento do SESMT.' },
  { sigla: 'PCMSO', nome: 'Programa de Controle Médico de Saúde Ocupacional', explicacao: 'Programa que define quais exames cada trabalhador faz e quando, a partir dos riscos do PGR (NR-07).' },
  { sigla: 'PGR', nome: 'Programa de Gerenciamento de Riscos', explicacao: 'Documento que identifica os perigos, avalia os riscos e define o plano de ação da empresa (NR-01).' },
  { sigla: 'SESMT', nome: 'Serviços Especializados em Segurança e em Medicina do Trabalho', explicacao: 'Equipe de SST que a empresa precisa manter conforme o grau de risco e o número de empregados (NR-04).' },
];
