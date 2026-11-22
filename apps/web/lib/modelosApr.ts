import type { EtapaApr, TipoPt } from './api';

// Modelos prontos de APR para as atividades que mais aparecem no dia a dia.
// São um ponto de partida: a técnica confere e ajusta para a realidade do local.
export type ModeloApr = { id: string; nome: string; norma: string; palavras: string[]; pt?: TipoPt; etapas: EtapaApr[] };

export const MODELOS_APR: ModeloApr[] = [
  {
    id: 'altura', nome: 'Trabalho em altura (telhado, andaime, escada)', norma: 'NR-35', pt: 'ALTURA',
    palavras: ['altura', 'telhado', 'telha', 'andaime', 'escada', 'plataforma', 'fachada', 'calha', 'cobertura', 'forro', 'marquise'],
    etapas: [
      { etapa: 'Isolar e sinalizar a área de baixo', riscos: 'Queda de materiais e ferramentas sobre quem passa', medidas: 'Fita zebrada ou cones, placa de aviso, ninguém circulando embaixo', epis: 'Capacete com jugular, botina' },
      { etapa: 'Conferir o acesso (escada, andaime ou PEMT) e os pontos de ancoragem', riscos: 'Escada ou andaime instável, ancoragem que não aguenta', medidas: 'Inspeção antes do uso, andaime travado e nivelado, ancoragem indicada por profissional', epis: 'Capacete, luvas de vaqueta' },
      { etapa: 'Subir e se prender', riscos: 'Queda de altura', medidas: 'Três pontos de apoio na subida, talabarte duplo, ficar sempre ancorado (100% do tempo)', epis: 'Cinturão paraquedista, talabarte duplo com absorvedor, capacete com jugular' },
      { etapa: 'Executar o serviço', riscos: 'Queda de altura, queda de ferramentas, telha frágil', medidas: 'Tábua ou passarela sobre telhas, ferramentas amarradas, parar com chuva ou vento forte', epis: 'Cinturão paraquedista, capacete com jugular, óculos, luvas' },
      { etapa: 'Descer, recolher materiais e liberar a área', riscos: 'Queda na descida, materiais esquecidos no alto', medidas: 'Descer ancorado, conferir se nada ficou no alto, só tirar o isolamento no final', epis: 'Cinturão paraquedista, capacete' },
    ],
  },
  {
    id: 'quente', nome: 'Solda, corte e esmerilhamento (trabalho a quente)', norma: 'NR-18 / NR-34', pt: 'QUENTE',
    palavras: ['solda', 'soldagem', 'corte', 'maçarico', 'macarico', 'oxicorte', 'esmeril', 'esmerilhadeira', 'lixadeira', 'quente', 'serralheria'],
    etapas: [
      { etapa: 'Preparar o local: tirar inflamáveis num raio de 10 m', riscos: 'Incêndio, explosão', medidas: 'Retirar ou cobrir materiais combustíveis com manta, extintor ao lado, conferir se não há gás no ambiente', epis: 'Botina, luvas' },
      { etapa: 'Conferir equipamento (máquina de solda, cilindros, mangueiras)', riscos: 'Choque elétrico, vazamento de gás, retrocesso de chama', medidas: 'Cabos sem emenda, aterramento, válvula corta-chama, cilindros em pé e presos', epis: 'Luvas de raspa' },
      { etapa: 'Soldar ou cortar', riscos: 'Radiação, fumos metálicos, queimadura, respingos', medidas: 'Biombo para proteger quem passa, ventilação ou exaustão, vigia de incêndio quando precisar', epis: 'Máscara de solda, avental, perneira e luvas de raspa, respirador PFF2 para fumos, protetor auricular' },
      { etapa: 'Esmerilhar e dar acabamento', riscos: 'Projeção de partículas, ruído, disco que quebra', medidas: 'Disco certo para a rotação da máquina, coifa de proteção no lugar, faíscas para longe das pessoas', epis: 'Protetor facial, óculos, protetor auricular, luvas' },
      { etapa: 'Encerrar: vigiar o local por 30 minutos', riscos: 'Fogo que começa depois (brasa escondida)', medidas: 'Ronda no local após o fim, fechar cilindros, recolher cabos', epis: 'Luvas, botina' },
    ],
  },
  {
    id: 'eletrica', nome: 'Serviço em eletricidade (quadro, painel, instalação)', norma: 'NR-10', pt: 'ELETRICIDADE',
    palavras: ['elétric', 'eletric', 'quadro', 'painel', 'disjuntor', 'tomada', 'fiação', 'fiacao', 'cabo', 'luminária', 'luminaria', 'lâmpada', 'lampada', 'subestação', 'subestacao'],
    etapas: [
      { etapa: 'Planejar e avisar quem usa o circuito', riscos: 'Religamento por engano', medidas: 'Ordem de serviço, só profissional autorizado (NR-10), combinar o desligamento com o setor', epis: '—' },
      { etapa: 'Desligar, bloquear e etiquetar', riscos: 'Choque elétrico, arco elétrico', medidas: 'Seccionar, cadeado e etiqueta no disjuntor, cada um com seu cadeado', epis: 'Luvas isolantes, vestimenta antichama, protetor facial' },
      { etapa: 'Testar ausência de tensão e aterrar', riscos: 'Choque por tensão residual ou retorno', medidas: 'Detector de tensão testado antes, aterramento temporário', epis: 'Luvas isolantes com luva de cobertura, capacete classe B, óculos' },
      { etapa: 'Executar o serviço', riscos: 'Choque, arco, queda se estiver em escada', medidas: 'Ferramentas isoladas, área sinalizada, escada de fibra', epis: 'Capacete classe B, luvas isolantes, botina sem metal, vestimenta antichama' },
      { etapa: 'Retirar bloqueios e religar', riscos: 'Energizar com alguém no circuito', medidas: 'Conferir que todos saíram, retirar aterramento, cada um tira o próprio cadeado, testar o funcionamento', epis: 'Luvas isolantes, protetor facial' },
    ],
  },
  {
    id: 'confinado', nome: 'Entrada em espaço confinado (tanque, cisterna, poço)', norma: 'NR-33', pt: 'ESPACO_CONFINADO',
    palavras: ['confinado', 'tanque', 'cisterna', 'poço', 'poco', 'reservatório', 'reservatorio', 'caixa d', 'silo', 'galeria', 'fossa', 'tubulação', 'tubulacao'],
    etapas: [
      { etapa: 'Emitir a PET e isolar o espaço', riscos: 'Entrada sem controle', medidas: 'Permissão de entrada assinada, sinalização, supervisor e vigia definidos', epis: '—' },
      { etapa: 'Bloquear energias e fluidos', riscos: 'Entrada de produto, partida de agitador, choque', medidas: 'Raquetear ou bloquear válvulas, bloqueio elétrico com cadeado', epis: 'Luvas, óculos' },
      { etapa: 'Ventilar e medir a atmosfera', riscos: 'Falta de oxigênio, gases tóxicos ou inflamáveis', medidas: 'Ventilação forçada, medir O2, LIE, H2S e CO antes de entrar e durante o serviço', epis: 'Detector de gases' },
      { etapa: 'Entrar e trabalhar', riscos: 'Asfixia, intoxicação, queda, calor', medidas: 'Vigia do lado de fora o tempo todo, comunicação combinada, equipamento de resgate pronto', epis: 'Cinturão com ponto dorsal, capacete, respirador adequado ao contaminante, luvas, botas' },
      { etapa: 'Sair, conferir pessoas e encerrar a PET', riscos: 'Alguém ficar dentro', medidas: 'Contar quem entrou e quem saiu, fechar e encerrar a permissão', epis: '—' },
    ],
  },
  {
    id: 'icamento', nome: 'Içamento de carga (munck, guindaste, ponte rolante)', norma: 'NR-11 / NR-12', pt: 'ICAMENTO',
    palavras: ['içamento', 'icamento', 'içar', 'icar', 'munck', 'guindaste', 'ponte rolante', 'talha', 'guincho', 'carga suspensa'],
    etapas: [
      { etapa: 'Planejar o içamento (peso, raio, capacidade)', riscos: 'Tombamento, sobrecarga', medidas: 'Conferir peso com acessórios e tabela de carga, plano de rigging se passar de 75% da capacidade', epis: '—' },
      { etapa: 'Patolar e isolar a área', riscos: 'Afundamento do solo, rede elétrica perto', medidas: 'Patolas sobre calços, distância da rede elétrica, área isolada no raio de giro', epis: 'Capacete com jugular, botina, colete refletivo' },
      { etapa: 'Amarrar a carga', riscos: 'Queda da carga, prensamento das mãos', medidas: 'Cintas e manilhas inspecionadas e certificadas, ângulo certo das pernas da linga', epis: 'Luvas de vaqueta, capacete' },
      { etapa: 'Içar e movimentar', riscos: 'Carga suspensa sobre pessoas, balanço da carga', medidas: 'Ninguém embaixo da carga, sinaleiro único, cabo-guia para controlar', epis: 'Capacete com jugular, colete refletivo' },
      { etapa: 'Posicionar e soltar a carga', riscos: 'Prensamento, tombamento da peça', medidas: 'Apoiar sobre calços, só soltar com a carga estável', epis: 'Luvas, botina com biqueira' },
    ],
  },
  {
    id: 'escavacao', nome: 'Escavação e vala', norma: 'NR-18', pt: 'ESCAVACAO',
    palavras: ['escavação', 'escavacao', 'vala', 'valeta', 'fundação', 'fundacao', 'buraco', 'retroescavadeira', 'tubulação enterrada'],
    etapas: [
      { etapa: 'Consultar interferências (redes enterradas)', riscos: 'Atingir cabo elétrico, gás ou água', medidas: 'Consultar plantas e concessionárias, sondagem manual perto das redes', epis: 'Capacete, botina' },
      { etapa: 'Isolar e sinalizar a escavação', riscos: 'Queda de pessoas ou veículos na vala', medidas: 'Guarda-corpo ou tela, sinalização noturna, material escavado a mais de 0,5 m da borda', epis: 'Colete refletivo, capacete' },
      { etapa: 'Escavar', riscos: 'Desmoronamento, atropelamento pela máquina', medidas: 'Escoramento ou talude acima de 1,25 m, ninguém no raio da máquina', epis: 'Capacete, botina, protetor auricular, colete refletivo' },
      { etapa: 'Trabalhar dentro da vala', riscos: 'Soterramento, falta de ar em vala funda', medidas: 'Escada a cada 15 m, conferir o escoramento todo dia e depois de chuva', epis: 'Capacete, botina de borracha, luvas' },
      { etapa: 'Reaterrar e liberar', riscos: 'Queda, atropelamento', medidas: 'Compactar em camadas, retirar sinalização só no final', epis: 'Capacete, botina, protetor auricular' },
    ],
  },
  {
    id: 'maquina', nome: 'Manutenção de máquina ou equipamento', norma: 'NR-12',
    palavras: ['manutenção', 'manutencao', 'máquina', 'maquina', 'equipamento', 'prensa', 'esteira', 'motor', 'correia', 'rolamento', 'compressor', 'troca de peça'],
    etapas: [
      { etapa: 'Parar a máquina e avisar o operador', riscos: 'Partida inesperada', medidas: 'Combinar a parada, placa "em manutenção" no comando', epis: '—' },
      { etapa: 'Bloquear todas as energias', riscos: 'Prensamento, corte, choque, energia acumulada (ar, mola, hidráulica)', medidas: 'Cadeado e etiqueta em cada fonte, aliviar pressão, travar partes que podem cair', epis: 'Luvas, óculos' },
      { etapa: 'Testar se está mesmo parada', riscos: 'Bloqueio no ponto errado', medidas: 'Tentar dar partida com a chave bloqueada', epis: '—' },
      { etapa: 'Fazer a manutenção', riscos: 'Corte, prensamento, projeção, ruído, produto químico (óleo, graxa)', medidas: 'Ferramenta certa, peças pesadas com apoio ou talha', epis: 'Luvas de vaqueta ou nitrílica, óculos, protetor auricular, botina' },
      { etapa: 'Recolocar proteções e liberar', riscos: 'Máquina volta sem proteção', medidas: 'Proteções e dispositivos de segurança de volta e testados antes de tirar o bloqueio', epis: 'Luvas, óculos' },
    ],
  },
  {
    id: 'quimico', nome: 'Limpeza ou serviço com produto químico', norma: 'NR-01 / NR-09',
    palavras: ['químico', 'quimico', 'limpeza', 'produto', 'ácido', 'acido', 'soda', 'solvente', 'desinfecção', 'desinfeccao', 'higienização', 'higienizacao', 'dedetização', 'dedetizacao'],
    etapas: [
      { etapa: 'Ler a FDS e separar o produto certo', riscos: 'Uso de produto errado, mistura perigosa', medidas: 'Ficha com dados de segurança (FDS) à mão, nunca misturar produtos (ex.: cloro e amoníaco)', epis: '—' },
      { etapa: 'Diluir ou preparar', riscos: 'Respingo nos olhos e na pele, vapores', medidas: 'Local ventilado, produto sobre a água (nunca o contrário), embalagem identificada', epis: 'Luvas nitrílicas, óculos de ampla visão, avental impermeável' },
      { etapa: 'Aplicar', riscos: 'Contato com a pele, inalação, piso escorregadio', medidas: 'Sinalizar piso molhado, ventilar, pausas em ambiente fechado', epis: 'Luvas nitrílicas, óculos, respirador com filtro químico se a FDS pedir, bota de borracha' },
      { etapa: 'Guardar e descartar', riscos: 'Derramamento, contaminação', medidas: 'Fechar embalagens, guardar longe de alimentos, descartar conforme a FDS', epis: 'Luvas nitrílicas' },
    ],
  },
  {
    id: 'carga', nome: 'Carga, descarga e movimentação manual', norma: 'NR-11 / NR-17',
    palavras: ['carga', 'descarga', 'caminhão', 'caminhao', 'carregar', 'descarregar', 'estoque', 'paleteira', 'empilhadeira', 'mudança', 'mudanca', 'movimentação', 'movimentacao'],
    etapas: [
      { etapa: 'Posicionar e calçar o veículo', riscos: 'Veículo se mover, atropelamento', medidas: 'Freio de mão, calço nas rodas, motor desligado, área sinalizada', epis: 'Colete refletivo, botina' },
      { etapa: 'Organizar o caminho até o estoque', riscos: 'Tropeço, queda, batida', medidas: 'Caminho livre e iluminado, usar paleteira ou carrinho sempre que der', epis: 'Botina com biqueira' },
      { etapa: 'Levantar e carregar', riscos: 'Dor lombar, lesão por esforço, queda da carga no pé', medidas: 'Peso dentro do limite da pessoa, dobrar os joelhos e manter a carga junto ao corpo, ajuda de outro colega para cargas pesadas', epis: 'Luvas de vaqueta, botina com biqueira' },
      { etapa: 'Empilhar e guardar', riscos: 'Queda da pilha, corte com fitas e bordas', medidas: 'Pilha estável e dentro da altura máxima, mais pesado embaixo', epis: 'Luvas, botina' },
    ],
  },
  {
    id: 'pintura', nome: 'Pintura (rolo, pistola ou spray)', norma: 'NR-01 / NR-09',
    palavras: ['pintura', 'pintar', 'tinta', 'verniz', 'esmalte', 'pistola', 'spray', 'textura'],
    etapas: [
      { etapa: 'Preparar a superfície (lixar, limpar)', riscos: 'Poeira, projeção de partículas', medidas: 'Lixamento úmido quando der, ventilação', epis: 'Respirador PFF2, óculos, luvas' },
      { etapa: 'Preparar a tinta', riscos: 'Vapor de solvente, incêndio', medidas: 'Local ventilado, sem fumar ou chama perto, extintor próximo', epis: 'Luvas nitrílicas, óculos' },
      { etapa: 'Pintar', riscos: 'Inalação de solvente, queda se estiver em escada, respingo', medidas: 'Ventilação, pausas, escada firme (acima de 2 m, seguir a APR de altura)', epis: 'Respirador com filtro para vapores orgânicos, óculos, luvas nitrílicas, macacão' },
      { etapa: 'Limpar ferramentas e guardar sobras', riscos: 'Contato com solvente, descarte errado', medidas: 'Panos com solvente em lixeira metálica com tampa, embalagens fechadas', epis: 'Luvas nitrílicas' },
    ],
  },
  {
    id: 'rocada', nome: 'Roçada e poda', norma: 'NR-12 / NR-31',
    palavras: ['roçada', 'rocada', 'roçadeira', 'rocadeira', 'poda', 'árvore', 'arvore', 'capina', 'jardinagem', 'motosserra'],
    etapas: [
      { etapa: 'Isolar a área e afastar pessoas', riscos: 'Pedras e galhos lançados em quem passa', medidas: 'Isolar raio de 15 m, tela de proteção perto de vidros e carros', epis: 'Colete refletivo' },
      { etapa: 'Conferir a máquina', riscos: 'Fio ou lâmina solta, vazamento de combustível', medidas: 'Proteção da lâmina no lugar, abastecer com motor frio e desligado', epis: 'Luvas' },
      { etapa: 'Roçar ou podar', riscos: 'Corte, projeção, ruído, vibração, animais peçonhentos, queda de galho', medidas: 'Pausas, nunca podar perto de rede elétrica, olhar o terreno antes', epis: 'Protetor facial com tela, óculos, protetor auricular, perneira, luvas, botina' },
      { etapa: 'Recolher e limpar', riscos: 'Corte, picada de animais', medidas: 'Usar rastelo, não pôr a mão direto no mato', epis: 'Luvas de vaqueta, perneira, botina' },
    ],
  },
];

const semAcento = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Modelo que combina com o que a pessoa escreveu na atividade (o que tiver mais palavras em comum).
export function modeloParaAtividade(atividade: string): ModeloApr | null {
  const texto = semAcento(atividade);
  if (texto.trim().length < 3) return null;
  let melhor: { m: ModeloApr; n: number } | null = null;
  for (const m of MODELOS_APR) {
    const n = m.palavras.filter((p) => texto.includes(semAcento(p))).length;
    if (n && (!melhor || n > melhor.n)) melhor = { m, n };
  }
  return melhor?.m ?? null;
}
