// Questionários da avaliação psicossocial.
// - Escala validada (ex.: SRQ-20): o texto de cada pergunta tem de ser o da versão publicada, com a fonte.
// - Triagem de fatores do trabalho (NR-01/NR-17): perguntas próprias, sobre a organização do trabalho,
//   sem se apresentar como escala validada nem como teste psicológico. É ela que alimenta o PGR.

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
  // Fatores do trabalho que vão ao inventário do PGR (só na triagem NR-01/NR-17).
  pgr?: { fonte: string; consequencias: string; medida: string; severidade: 'BAIXA' | 'MEDIA' | 'ALTA' };
};
export type Item = { n: number; texto: string; dimensao: string; invertido?: boolean };
export type Questionario = {
  id: string; nome: string; sigla: string; descricao: string; fonte: string; escala: Opcao[];
  dimensoes: Dimensao[]; itens: Item[];
  aviso?: string; // mostrado ao fim, para quem respondeu
  validado: boolean; // escala validada (com fonte) ou triagem própria de fatores do trabalho
  instrucao?: string; // mostrado antes das perguntas
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

const D = (id: string, nome: string, pgr: NonNullable<Dimensao['pgr']>): Dimensao => ({ id, nome, tipo: 'media', rotuloResultado: 'média de 0 a 4', maiorEPior: true, pgr });

// Dimensões da organização do trabalho que a NR-01 manda considerar no GRO e a NR-17 na avaliação ergonômica.
const FATORES: Dimensao[] = [
  D('demandas', 'Demandas e carga de trabalho', { fonte: 'Volume de tarefas, metas, prazos e tamanho da equipe', consequencias: 'Estresse, cansaço, queda de atenção e mais chance de erro e acidente', medida: 'Rever o tamanho da equipe, a divisão das tarefas e as metas', severidade: 'MEDIA' }),
  D('controle', 'Controle e autonomia', { fonte: 'Pouca participação nas decisões e na forma de fazer o trabalho', consequencias: 'Estresse, desânimo e queda de produtividade', medida: 'Ouvir a equipe antes de mudar o trabalho e dar mais liberdade para organizar as tarefas', severidade: 'MEDIA' }),
  D('jornada', 'Jornada, pausas e descanso', { fonte: 'Horas extras, turnos, falta de pausas e de descanso entre jornadas', consequencias: 'Fadiga, sono ruim, faltas e acidentes por cansaço', medida: 'Controlar horas extras, garantir pausas e intervalos e rever a escala de turnos', severidade: 'MEDIA' }),
  D('relacoes', 'Apoio e relações no trabalho', { fonte: 'Pouco apoio da chefia e dos colegas, comunicação ruim, conflitos', consequencias: 'Conflitos, sofrimento, faltas e queda de produtividade', medida: 'Preparar as lideranças para dar apoio, retorno e resolver conflitos', severidade: 'MEDIA' }),
  D('papel', 'Clareza do papel e orientação', { fonte: 'Funções mal definidas, ordens que se contradizem, falta de treinamento', consequencias: 'Erros, retrabalho, conflitos e estresse', medida: 'Escrever as atribuições de cada função e treinar quem chega', severidade: 'MEDIA' }),
  D('reconhecimento', 'Reconhecimento e justiça', { fonte: 'Cobranças e decisões vistas como injustas, falta de reconhecimento, insegurança no emprego', consequencias: 'Desânimo, sofrimento, faltas e rotatividade', medida: 'Deixar claros os critérios de cobrança, promoção e reconhecimento', severidade: 'MEDIA' }),
  D('violencia', 'Assédio, violência e carga emocional', { fonte: 'Humilhação, agressão, assédio moral ou sexual, atendimento a situações difíceis', consequencias: 'Sofrimento psíquico, afastamentos e efeitos na segurança do trabalho', medida: 'Ter um canal de denúncia e um procedimento para prevenir e tratar assédio e violência', severidade: 'ALTA' }),
  D('vida', 'Trabalho e vida pessoal', { fonte: 'Chamados fora do horário, dificuldade de se desligar do trabalho', consequencias: 'Cansaço, estresse e conflitos em casa', medida: 'Combinar regras para contato fora do expediente e respeitar as folgas', severidade: 'MEDIA' }),
];

const FATORES_ITENS: [string, string][] = [
  ['demandas', 'Tenho mais trabalho do que consigo dar conta no meu horário.'],
  ['demandas', 'Preciso trabalhar com pressa por causa de prazos ou metas apertadas.'],
  ['demandas', 'O ritmo do trabalho me deixa esgotado(a) no fim do dia.'],
  ['controle', 'Não tenho voz para decidir como fazer o meu trabalho.'],
  ['controle', 'Mudanças no meu trabalho são feitas sem me consultar.'],
  ['controle', 'Não tenho liberdade para organizar a ordem das minhas tarefas.'],
  ['jornada', 'Faço hora extra ou levo trabalho para casa.'],
  ['jornada', 'Não consigo fazer as pausas e o intervalo de descanso.'],
  ['jornada', 'O horário ou os turnos atrapalham o meu sono e o meu descanso.'],
  ['relacoes', 'Quando preciso de ajuda, não encontro apoio da chefia.'],
  ['relacoes', 'Falta apoio e colaboração entre os colegas.'],
  ['relacoes', 'Há conflitos ou clima ruim na equipe.'],
  ['papel', 'Não está claro o que esperam de mim no trabalho.'],
  ['papel', 'Recebo ordens que se contradizem.'],
  ['papel', 'Falta treinamento ou informação para fazer bem o meu trabalho.'],
  ['reconhecimento', 'Meu esforço não é reconhecido.'],
  ['reconhecimento', 'As cobranças e as decisões não são justas com todos.'],
  ['reconhecimento', 'Sinto insegurança de perder o emprego.'],
  ['violencia', 'Passo por humilhação, grito ou constrangimento no trabalho.'],
  ['violencia', 'Sofro ou vejo agressão, ameaça ou assédio (moral ou sexual) no trabalho.'],
  ['violencia', 'Lido com situações que mexem muito com o emocional, como clientes difíceis, sofrimento de outras pessoas ou acidentes.'],
  ['vida', 'Sou chamado(a) para resolver coisas do trabalho fora do expediente.'],
  ['vida', 'O trabalho atrapalha a minha vida com a família e os amigos.'],
  ['vida', 'Não consigo me desligar do trabalho quando estou de folga.'],
];

export const QUESTIONARIOS: Questionario[] = [
  {
    id: 'fatores',
    sigla: 'Fatores NR-01',
    nome: 'Fatores psicossociais do trabalho (NR-01 e NR-17)',
    descricao: 'Olha a organização do trabalho em 8 temas, como carga, pausas, apoio, assédio e reconhecimento. 24 frases, cada uma com a frequência. O resultado vai para o PGR, setor por setor.',
    fonte: 'Triagem do Safety Nexo sobre a organização do trabalho, nos temas que a NR-01 (gerenciamento de riscos) e a NR-17 (ergonomia) mandam considerar. Não é teste psicológico nem diagnóstico de ninguém: serve para orientar medidas na empresa. O resultado de cada setor pode ser combinado com a avaliação técnica do responsável (peso 2).',
    escala: [{ valor: 0, rotulo: 'Nunca' }, { valor: 1, rotulo: 'Raramente' }, { valor: 2, rotulo: 'Às vezes' }, { valor: 3, rotulo: 'Muitas vezes' }, { valor: 4, rotulo: 'Sempre' }],
    dimensoes: FATORES,
    itens: FATORES_ITENS.map(([dimensao, texto], i) => ({ n: i + 1, texto, dimensao })),
    validado: false,
    instrucao: 'Pense nos últimos 3 meses de trabalho e marque com que frequência cada frase acontece com você. Não existe resposta certa ou errada, e ninguém fica sabendo o que você respondeu.',
    aviso: 'Obrigado por responder. Se você está passando por assédio ou violência no trabalho, use o canal de denúncia da empresa. Se estiver sofrendo muito, o CVV atende de graça pelo 188, 24 horas, ou em cvv.org.br.',
  },
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
    validado: true,
    aviso: 'Se você está sofrendo ou pensou em acabar com a vida, procure ajuda: o CVV atende de graça e sem se identificar pelo telefone 188, 24 horas, ou em cvv.org.br. Em emergência, ligue 192 (SAMU).',
  },
];

export const questionario = (id: string) => QUESTIONARIOS.find((q) => q.id === id);
