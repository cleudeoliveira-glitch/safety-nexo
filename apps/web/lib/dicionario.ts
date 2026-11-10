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
  { sigla: 'AET', nome: 'Análise Ergonômica do Trabalho', explicacao: 'Estudo detalhado de um posto de trabalho quando a avaliação ergonômica preliminar pede aprofundamento (NR-17).' },
  { sigla: 'APR', nome: 'Análise Preliminar de Risco', explicacao: 'Análise feita antes de um serviço fora da rotina: passos, riscos de cada passo e medidas de controle.' },
  { sigla: 'AVCB', nome: 'Auto de Vistoria do Corpo de Bombeiros', explicacao: 'Documento dos Bombeiros que atesta que o prédio tem as medidas de segurança contra incêndio.' },
  { sigla: 'CA', nome: 'Certificado de Aprovação', explicacao: 'Número que prova que o EPI foi aprovado pelo Ministério do Trabalho. Sem CA válido o EPI não pode ser entregue (NR-06).' },
  { sigla: 'CAT', nome: 'Comunicação de Acidente de Trabalho', explicacao: 'Registro do acidente ou doença do trabalho no eSocial (S-2210), até o 1º dia útil seguinte; em caso de morte, na hora.' },
  { sigla: 'CBO', nome: 'Classificação Brasileira de Ocupações', explicacao: 'Código oficial do cargo. Sai no PPP e no eSocial.' },
  { sigla: 'DDS', nome: 'Diálogo Diário de Segurança', explicacao: 'Conversa curta de segurança no começo do turno, de 5 a 15 minutos.' },
  { sigla: 'EPC', nome: 'Equipamento de Proteção Coletiva', explicacao: 'Proteção que vale para todos ao mesmo tempo, como guarda-corpo, exaustor e proteção de máquina. Vem antes do EPI.' },
  { sigla: 'FAP', nome: 'Fator Acidentário de Prevenção', explicacao: 'Multiplicador de 0,5 a 2,0 sobre o RAT. Menos acidentes, menos imposto.' },
  { sigla: 'LTCAT', nome: 'Laudo Técnico das Condições Ambientais do Trabalho', explicacao: 'Laudo que diz se a exposição a agentes nocivos dá direito à aposentadoria especial. Base do PPP.' },
  { sigla: 'NR', nome: 'Norma Regulamentadora', explicacao: 'As normas de segurança e saúde do trabalho do Ministério do Trabalho, da NR-01 à NR-38.' },
  { sigla: 'PPP', nome: 'Perfil Profissiográfico Previdenciário', explicacao: 'Histórico do trabalhador com os riscos a que ficou exposto. Hoje é gerado pelo eSocial.' },
  { sigla: 'PT', nome: 'Permissão de Trabalho', explicacao: 'Autorização por escrito para um trabalho de risco (altura, espaço confinado, a quente), válida por um período curto.' },
  { sigla: 'RAT', nome: 'Risco Ambiental do Trabalho', explicacao: 'Alíquota de 1%, 2% ou 3% sobre a folha, conforme o CNAE. Multiplicada pelo FAP.' },
  { sigla: 'SIPAT', nome: 'Semana Interna de Prevenção de Acidentes do Trabalho', explicacao: 'Semana de atividades de prevenção organizada pela CIPA uma vez por ano (NR-05).' },
];
