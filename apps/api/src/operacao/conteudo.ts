// Conteúdo pronto da Operação Diária. Os checklists são sugestões de partida: a consultoria
// marca, desmarca e completa conforme o procedimento da empresa.

export const TIPOS_PT = {
  ALTURA: {
    nome: 'Trabalho em altura',
    norma: 'NR-35',
    checklist: [
      'Executantes com treinamento de trabalho em altura válido',
      'Executantes com ASO apto para trabalho em altura',
      'Análise de risco (APR) feita e conhecida pela equipe',
      'Cinto tipo paraquedista e talabarte inspecionados',
      'Ponto de ancoragem definido e resistente',
      'Área abaixo isolada e sinalizada',
      'Condições do tempo adequadas (sem chuva, vento forte ou raios)',
      'Escada, andaime ou plataforma inspecionados',
      'Plano de resgate definido e equipe de resgate disponível',
      'Ferramentas presas ou acondicionadas contra queda',
    ],
  },
  ESPACO_CONFINADO: {
    nome: 'Entrada em espaço confinado',
    norma: 'NR-33',
    checklist: [
      'Trabalhadores autorizados e vigia com treinamento de espaço confinado válido',
      'Executantes com ASO apto para espaço confinado',
      'Supervisor de entrada designado',
      'Equipamentos e linhas isolados, bloqueados e etiquetados',
      'Atmosfera avaliada antes da entrada (oxigênio, inflamáveis e tóxicos)',
      'Monitoramento contínuo da atmosfera durante o trabalho',
      'Ventilação ou exaustão funcionando',
      'Vigia posicionado do lado de fora durante todo o trabalho',
      'Meio de comunicação entre vigia e trabalhadores testado',
      'Equipamentos de resgate e equipe de emergência disponíveis',
    ],
  },
  QUENTE: {
    nome: 'Trabalho a quente',
    norma: 'Solda, corte e esmerilhamento',
    checklist: [
      'Área livre de materiais inflamáveis e combustíveis no raio de alcance das fagulhas',
      'Materiais que não podem ser removidos protegidos com manta antichama',
      'Avaliação de gases inflamáveis no local, quando aplicável',
      'Extintor adequado ao lado do serviço',
      'Observador de incêndio designado',
      'Equipamento de solda ou corte inspecionado (cabos, mangueiras, válvulas antirretrocesso)',
      'Cilindros presos e com capacete de proteção',
      'Biombos ou anteparos para proteger quem está ao redor',
      'Vigilância da área por pelo menos 30 minutos após o término',
    ],
  },
  ELETRICIDADE: {
    nome: 'Serviço em eletricidade',
    norma: 'NR-10',
    checklist: [
      'Executantes autorizados e com treinamento NR-10 válido',
      'Seccionamento do circuito',
      'Impedimento de reenergização (bloqueio e etiqueta)',
      'Constatação da ausência de tensão',
      'Instalação de aterramento temporário',
      'Proteção dos elementos energizados próximos',
      'Sinalização de impedimento de reenergização',
      'Ferramentas isoladas e EPIs para risco elétrico inspecionados',
      'Diagrama ou esquema elétrico disponível',
    ],
  },
} as const;
export type TipoPt = keyof typeof TIPOS_PT;
export const ehTipoPt = (tipo: string): tipo is TipoPt => tipo in TIPOS_PT;

// Temas de DDS com texto curto para o ministrante ler ou adaptar.
export const TEMAS_DDS: { tema: string; conteudo: string }[] = [
  {
    tema: 'Por que usar o EPI',
    conteudo:
      'O EPI é a última barreira entre você e o risco. Ele só protege se estiver em bom estado, no tamanho certo e sendo usado durante todo o tempo de exposição. Se o seu EPI estiver danificado, desconfortável ou faltando, avise o supervisor antes de começar o trabalho. Usar o EPI é obrigação do trabalhador, e fornecer o EPI adequado é obrigação da empresa.',
  },
  {
    tema: 'Ordem e limpeza',
    conteudo:
      'Um ambiente arrumado evita tropeços, quedas, cortes e incêndios. Cada ferramenta tem o seu lugar, e corredores e saídas de emergência precisam ficar livres. Limpe o que sujar na hora, principalmente óleo e água no piso. Lixo e retalhos vão para o local certo, separados quando houver coleta seletiva.',
  },
  {
    tema: 'Levantamento manual de cargas',
    conteudo:
      'Antes de levantar, avalie o peso e peça ajuda ou use um equipamento se for preciso. Aproxime-se da carga, dobre os joelhos e mantenha as costas retas, levantando com a força das pernas. Mantenha a carga perto do corpo e não gire o tronco: vire com os pés. Planeje o caminho antes, para não carregar peso por cima de obstáculos.',
  },
  {
    tema: 'Quase acidente: por que relatar',
    conteudo:
      'Quase acidente é o que quase machucou alguém. Para cada acidente grave, acontecem muitos quase acidentes antes, e cada um é um aviso. Relatar não é dedurar: é dar a chance de corrigir a causa antes que alguém se machuque. Conte o que aconteceu, onde e como, e sugira o que poderia ser feito.',
  },
  {
    tema: 'Prevenção de incêndio',
    conteudo:
      'O fogo precisa de três coisas: combustível, oxigênio e calor. Prevenir é separar essas três. Não sobrecarregue tomadas, não fume fora das áreas permitidas e guarde inflamáveis em local ventilado e identificado. Saiba onde ficam os extintores e as saídas de emergência, e nunca deixe materiais na frente deles.',
  },
  {
    tema: 'Uso de extintores',
    conteudo:
      'Cada classe de fogo pede um extintor: classe A para madeira, papel e tecido; classe B para líquidos inflamáveis; classe C para equipamentos elétricos energizados. Para usar: retire a trava, aponte para a base das chamas, aperte o gatilho e faça movimentos de varredura. Se o fogo não ceder em poucos segundos, saia e acione a brigada.',
  },
  {
    tema: 'Riscos da eletricidade',
    conteudo:
      'Só pessoas autorizadas mexem em instalações elétricas. Nunca use fios emendados, plugues quebrados ou extensões improvisadas. Mantenha painéis fechados e não coloque objetos na frente deles. Se ver um fio desencapado ou sentir choque em um equipamento, desligue se for seguro, isole a área e avise a manutenção.',
  },
  {
    tema: 'Trabalho em altura',
    conteudo:
      'Trabalho em altura é qualquer atividade acima de 2 metros do nível inferior onde haja risco de queda. Só faz quem é treinado e está apto no exame médico. O cinto paraquedista precisa estar ancorado em ponto seguro o tempo todo. Escadas devem estar firmes e ultrapassar 1 metro o ponto de apoio. Na dúvida, pare e chame o responsável.',
  },
  {
    tema: 'Proteção das mãos',
    conteudo:
      'As mãos são as partes do corpo mais atingidas em acidentes. Use a luva certa para cada risco: corte, calor, produto químico ou eletricidade. Nunca coloque as mãos em partes móveis de máquinas sem desligar e bloquear. Não use anéis, pulseiras e relógios perto de máquinas.',
  },
  {
    tema: 'Proteção auditiva',
    conteudo:
      'A perda de audição por ruído é lenta, não dói e não tem volta. Se você precisa gritar para conversar com alguém a um braço de distância, o ruído provavelmente está alto. Use o protetor auditivo durante todo o tempo de exposição, coloque com as mãos limpas e guarde no estojo. Protetor que fica no bolso não protege.',
  },
  {
    tema: 'Produtos químicos',
    conteudo:
      'Antes de usar um produto, leia o rótulo e a ficha de segurança (FDS). Nunca troque o produto de embalagem sem identificar, e nunca use garrafas de bebida para guardar químicos. Use as luvas, óculos e máscara indicados. Não misture produtos de limpeza: alguns liberam gases tóxicos. Em contato com a pele ou os olhos, lave com muita água.',
  },
  {
    tema: 'Ergonomia no posto de trabalho',
    conteudo:
      'Ajuste a cadeira para que os pés fiquem apoiados e os joelhos em ângulo reto. A tela deve ficar na altura dos olhos, a um braço de distância. Faça pausas curtas para alongar e mudar de posição. Se sentir dor que se repete, não espere piorar: comunique o supervisor ou o serviço de saúde.',
  },
  {
    tema: 'Máquinas e equipamentos',
    conteudo:
      'Só opere máquinas para as quais você foi treinado e autorizado. Nunca retire ou desative proteções e dispositivos de segurança. Antes de limpar, ajustar ou fazer manutenção, desligue e bloqueie a energia. Conheça a posição do botão de emergência e teste-o no início do turno.',
  },
  {
    tema: 'Saúde mental e estresse',
    conteudo:
      'Cansaço, preocupação e estresse tiram a atenção e aumentam o risco de acidente. Durma bem, faça pausas e converse quando algo não estiver bem. Cuidar da saúde mental também é segurança. Se você ou um colega estiver passando por um momento difícil, procure apoio: a empresa e os serviços de saúde podem ajudar.',
  },
  {
    tema: 'Assédio no trabalho',
    conteudo:
      'Assédio moral é a exposição repetida a humilhações e constrangimentos. Assédio sexual é qualquer conduta de natureza sexual não desejada. Os dois são proibidos e podem ser denunciados pelo canal da empresa ou à CIPA, com garantia de sigilo. Respeito é parte da segurança: todos têm direito a um ambiente de trabalho saudável.',
  },
  {
    tema: 'Comunicação de acidentes',
    conteudo:
      'Todo acidente, por menor que pareça, precisa ser comunicado ao supervisor na hora. Um corte pequeno pode infeccionar, e uma pancada pode ter consequência depois. O registro garante o atendimento, os direitos do trabalhador e a investigação para evitar que se repita.',
  },
  {
    tema: 'Trânsito interno e empilhadeiras',
    conteudo:
      'Respeite as faixas de pedestres e as áreas demarcadas. Nunca passe por trás ou debaixo da carga de uma empilhadeira. Faça contato visual com o operador antes de cruzar o caminho. Operadores: velocidade baixa, buzina nos cruzamentos e carga sempre baixa durante o deslocamento.',
  },
  {
    tema: 'Hidratação e calor',
    conteudo:
      'Em ambientes quentes, o corpo perde muita água pelo suor. Beba água com frequência, mesmo sem sede. Dor de cabeça, tontura, cãibras e enjoo podem ser sinais de excesso de calor: pare, vá para a sombra e avise o supervisor. Faça pausas em local fresco e use roupas leves quando possível.',
  },
  {
    tema: 'Ferramentas manuais',
    conteudo:
      'Use cada ferramenta só para a função dela: chave de fenda não é talhadeira. Inspecione antes de usar e separe as que estiverem com cabo solto, rachado ou gasto. Guarde as ferramentas no lugar certo e não carregue ferramentas pontiagudas no bolso. Ferramenta boa e bem usada evita cortes e pancadas.',
  },
  {
    tema: 'Atenção e pressa',
    conteudo:
      'A pressa é uma das maiores causas de acidente. Quando o prazo aperta, a tentação é pular etapas de segurança. Nenhum serviço é tão urgente que não possa ser feito com segurança. Se perceber que está trabalhando no automático ou distraído, pare um minuto, respire e retome com atenção.',
  },
];
