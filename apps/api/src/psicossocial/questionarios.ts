// Questionários da avaliação psicossocial. O texto de cada pergunta tem de ser o da versão validada, com a fonte.
// Não incluir questionário sem a fonte conferida.

export type Opcao = { valor: number; rotulo: string };
export type Dimensao = {
  id: string;
  nome: string;
  // Como o resultado do setor é calculado:
  // 'casos': % de pessoas com soma dos itens >= corte (ex.: SRQ-20, 8 ou mais).
  // 'media': média dos itens (já com os invertidos ajustados), na escala do questionário.
  tipo: 'casos' | 'media';
  corte?: number;
  rotuloResultado: string;
  // Quanto maior, pior? (para o mapa de calor)
  maiorEPior: boolean;
};
export type Item = { n: number; texto: string; dimensao: string; invertido?: boolean };
export type Questionario = {
  id: string; nome: string; sigla: string; descricao: string; fonte: string; escala: Opcao[];
  dimensoes: Dimensao[]; itens: Item[];
  aviso?: string; // mostrado ao fim, para quem respondeu
};

const SRQ20_TEXTOS = [
  'Tem dores de cabeça com frequência?',
  'Tem falta de apetite?',
  'Dorme mal?',
  'Fica com medo com facilidade?',
  'Suas mãos tremem?',
  'Se sente nervoso(a), tenso(a) ou preocupado(a)?',
  'Sua digestão não é boa ou sofre de perturbação digestiva?',
  'Não consegue pensar com clareza?',
  'Sente-se infeliz?',
  'Chora mais que o comum?',
  'Acha difícil apreciar (gostar de) suas atividades diárias?',
  'Acha difícil tomar decisões?',
  'Seu trabalho diário é um sofrimento? Tormento? Tem dificuldade em fazer seu trabalho?',
  'Não é capaz de ter um papel útil na vida?',
  'Perdeu interesse nas coisas?',
  'Acha que é uma pessoa que não vale nada?',
  'O pensamento de acabar com a sua vida já passou por sua cabeça?',
  'Se sente cansado(a) todo o tempo?',
  'Tem sensações desagradáveis no estômago?',
  'Fica cansado(a) com facilidade?',
];

export const QUESTIONARIOS: Questionario[] = [
  {
    id: 'srq20',
    sigla: 'SRQ-20',
    nome: 'Self-Reporting Questionnaire (SRQ-20)',
    descricao: 'Rastreia sofrimento mental (transtornos mentais comuns) nos últimos 30 dias. 20 perguntas de sim ou não.',
    fonte: 'Organização Mundial da Saúde. Versão brasileira: Gonçalves DM, Stein AT, Kapczinski F. Cadernos de Saúde Pública 2008;24(2):380-390 (Tabela 3). Ponto de corte 7/8: 8 ou mais respostas "sim" indica caso positivo.',
    escala: [{ valor: 1, rotulo: 'Sim' }, { valor: 0, rotulo: 'Não' }],
    dimensoes: [{ id: 'sofrimento', nome: 'Sofrimento mental', tipo: 'casos', corte: 8, rotuloResultado: '% com 8 ou mais respostas "sim"', maiorEPior: true }],
    // Pronomes de tratamento ("O(a) Sr(a).") tirados para a leitura no celular; o conteúdo das perguntas é o da tabela.
    itens: SRQ20_TEXTOS.map((texto, i) => ({ n: i + 1, texto, dimensao: 'sofrimento' })),
    aviso: 'Se você está sofrendo ou pensou em acabar com a vida, procure ajuda: o CVV atende de graça e sem se identificar pelo telefone 188, 24 horas, ou em cvv.org.br. Em emergência, ligue 192 (SAMU).',
  },
];

export const questionario = (id: string) => QUESTIONARIOS.find((q) => q.id === id);
