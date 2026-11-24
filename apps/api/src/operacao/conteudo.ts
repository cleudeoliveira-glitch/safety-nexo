// Conteúdo pronto da Operação Diária. Os checklists são sugestões de partida: a consultoria
// marca, desmarca e completa conforme o procedimento da empresa.

export const TIPOS_PT = {
  ALTURA: {
    nome: 'Trabalho em altura',
    norma: 'NR-35',
    pede: 'Trabalho acima de 2 metros com risco de queda. A NR-35 pede trabalhador capacitado (reciclagem a cada 2 anos), ASO apto para altura, análise de risco e permissão quando não for rotina.',
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
    pede: 'A NR-33 só deixa entrar com a permissão assinada pelo supervisor de entrada, vigia do lado de fora o tempo todo, atmosfera medida e resgate pronto. Treinamento renovado todo ano.',
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
    nome: 'Trabalho a quente (solda, corte, esmeril)',
    norma: 'NR-18, NR-20 e NR-34',
    pede: 'Solda, corte e esmerilhamento perto de material que pega fogo pedem permissão, área limpa de inflamáveis num raio de 10 metros, extintor por perto e vigia de incêndio durante e depois do serviço.',
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
    pede: 'A NR-10 pede profissional autorizado, com o curso básico de 40 horas e reciclagem a cada 2 anos. Antes de tocar: desligar, bloquear, testar a ausência de tensão e aterrar.',
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
  ICAMENTO: {
    nome: 'Içamento de carga',
    norma: 'NR-11, NR-12 e NR-18',
    pede: 'Operador habilitado e treinado, equipamento e acessórios inspecionados, área isolada e plano de içamento (rigging) quando a carga passar de 75% da capacidade.',
    checklist: [
      'Operador do guindaste, munck ou ponte rolante habilitado e com treinamento válido',
      'Sinaleiro (rigger) definido e combinado com o operador',
      'Peso da carga conhecido e abaixo da capacidade do equipamento no raio de trabalho',
      'Equipamento inspecionado no dia (cabos, ganchos com trava, freios, limitadores)',
      'Acessórios de amarração (cintas, correntes, manilhas) inspecionados e com capacidade identificada',
      'Base do equipamento nivelada e patolas apoiadas em solo firme',
      'Distância segura de redes elétricas',
      'Área isolada e sinalizada: ninguém passa ou fica embaixo da carga',
      'Vento e chuva dentro do limite do fabricante',
      'Cabo guia para controlar a carga sem tocar nela',
    ],
  },
  ESCAVACAO: {
    nome: 'Escavação',
    norma: 'NR-18',
    pede: 'Vala com mais de 1,25 metro pede talude ou escoramento definido por profissional habilitado, escada de saída e redes enterradas localizadas antes de cavar.',
    checklist: [
      'Redes enterradas (água, gás, energia, telefone) localizadas antes de cavar',
      'Profundidade e tipo de solo avaliados por profissional habilitado',
      'Talude ou escoramento definido em projeto quando o solo pode desmoronar',
      'Material retirado e equipamentos afastados da borda da vala',
      'Escada ou rampa de saída a cada trecho da vala',
      'Bordas isoladas e sinalizadas, com iluminação à noite',
      'Água acumulada esgotada e solo conferido depois de chuva',
      'Atmosfera avaliada quando a vala for funda ou perto de rede de gás ou esgoto',
      'Máquinas com sinal sonoro de ré e sinaleiro para manobras',
    ],
  },
} as const;
export type TipoPt = keyof typeof TIPOS_PT;

// Situações especiais da APR: a pessoa marca o que a atividade envolve e o sistema lembra os perigos
// que costumam ficar de fora e a permissão de trabalho que a norma pede.
export const CONTEXTOS_APR: Record<string, { nome: string; norma: string; lembrar: string; pt?: TipoPt }> = {
  ALTURA: { nome: 'Trabalho em altura', norma: 'NR-35', pt: 'ALTURA', lembrar: 'Queda da pessoa e de ferramentas, ancoragem que não aguenta, telha frágil, resgate de quem fica pendurado no cinto.' },
  ESPACO_CONFINADO: { nome: 'Espaço confinado', norma: 'NR-33', pt: 'ESPACO_CONFINADO', lembrar: 'Falta de oxigênio, gás tóxico ou inflamável, entrada de produto pela tubulação, dificuldade de resgate.' },
  ELETRICIDADE: { nome: 'Eletricidade', norma: 'NR-10', pt: 'ELETRICIDADE', lembrar: 'Choque, arco elétrico, religamento por engano, tensão de retorno, circuito vizinho energizado.' },
  ICAMENTO: { nome: 'Içamento de carga', norma: 'NR-11 e NR-12', pt: 'ICAMENTO', lembrar: 'Carga suspensa sobre pessoas, tombamento do equipamento, rede elétrica no raio de giro, acessório sem capacidade.' },
  QUENTE: { nome: 'Solda, corte ou esmeril', norma: 'NR-18, NR-20 e NR-34', pt: 'QUENTE', lembrar: 'Incêndio, explosão, fumos metálicos, radiação nos olhos de quem passa, brasa que acende depois.' },
  ESCAVACAO: { nome: 'Escavação ou vala', norma: 'NR-18', pt: 'ESCAVACAO', lembrar: 'Desmoronamento, rede enterrada (gás, energia), queda na vala, gás acumulado no fundo.' },
  MAQUINAS: { nome: 'Máquinas e equipamentos', norma: 'NR-12', lembrar: 'Partes móveis, partida inesperada durante a manutenção, proteção retirada, prensamento das mãos.' },
  ENERGIAS: { nome: 'Energias perigosas (pressão, hidráulica, vapor, mola)', norma: 'NR-12 e NR-13', lembrar: 'Energia que fica guardada mesmo desligado: bloquear todas as fontes e aliviar a pressão antes de abrir.' },
  QUIMICOS: { nome: 'Produtos químicos ou inflamáveis', norma: 'NR-20 e NR-26', lembrar: 'Respingo, vapor, fonte de ignição, derramamento. Leia a FISPQ antes e tenha kit de contenção.' },
  TRANSITO: { nome: 'Perto de veículos, empilhadeiras ou vias', norma: 'NR-11', lembrar: 'Atropelamento, manobra em ré, pouca visibilidade. Isolar, sinalizar e usar colete refletivo.' },
  ISOLADO: { nome: 'Trabalho sozinho ou em local isolado', norma: 'NR-01', lembrar: 'Ninguém para socorrer: combine comunicação a cada intervalo e quem vai atrás se não houver resposta.' },
  CLIMA: { nome: 'Céu aberto ou tempo ruim', norma: 'NR-21', lembrar: 'Raio, chuva, vento forte, sol e calor. Combine quando parar o serviço e garanta água e sombra.' },
};
export const ehContextoApr = (c: string) => c in CONTEXTOS_APR;
export const ehTipoPt = (tipo: string): tipo is TipoPt => tipo in TIPOS_PT;

import { TEMAS_DDS as TEMAS_BASE } from './temas-dds';
import { VIVENCIAS_DDS } from './vivencias-dds';

// Cada tema sai com o texto para falar, a pergunta, uma situação para contar e a dinâmica vivencial.
export const TEMAS_DDS = TEMAS_BASE.map((t) => ({ ...t, situacao: VIVENCIAS_DDS[t.tema]?.situacao ?? '', dinamica: VIVENCIAS_DDS[t.tema]?.dinamica ?? '' }));

// Espaços confinados (NR-33): tipos comuns e os perigos que costumam ter.
export const TIPOS_ESPACO = {
  TANQUE: 'Tanque ou reservatório',
  SILO: 'Silo ou moega',
  POCO: 'Poço, cisterna ou poço de visita',
  GALERIA: 'Galeria, túnel ou duto de cabos',
  VASO: 'Vaso de pressão ou caldeira (parada)',
  DUTO: 'Duto, tubulação ou chaminé',
  CAIXA: 'Caixa de inspeção, esgoto ou gordura',
  OUTRO: 'Outro',
} as const;

export const RISCOS_CONFINADO = {
  POUCO_OXIGENIO: 'Falta de oxigênio',
  EXCESSO_OXIGENIO: 'Excesso de oxigênio',
  INFLAMAVEL: 'Gases ou vapores inflamáveis',
  TOXICO: 'Gases tóxicos (H2S, CO e outros)',
  POEIRA: 'Poeira que pode explodir ou sufocar',
  ENGOLFAMENTO: 'Engolfamento (ficar soterrado por grãos, areia ou líquido)',
  MECANICO: 'Partes móveis (agitadores, roscas, hélices)',
  ELETRICO: 'Energia elétrica',
  TEMPERATURA: 'Calor ou frio extremo',
  QUEDA: 'Queda na entrada ou dentro do espaço',
  BIOLOGICO: 'Agentes biológicos (esgoto, lodo)',
  AFOGAMENTO: 'Afogamento',
} as const;

// Pontos de partida para o plano de resgate. A equipe ajusta ao local e ao que tem disponível.
export const MODELOS_RESGATE = {
  ALTURA: {
    cenarios: 'Trabalhador fica suspenso pelo cinto depois de uma queda e não consegue sair sozinho.\nTrabalhador passa mal ou se machuca em cima do telhado, andaime ou plataforma.\nQueda de ferramenta ou material atinge alguém embaixo.',
    equipamentos: ['Kit de resgate em altura (descensor, polia, cordas)', 'Tripé ou ponto de ancoragem para o resgate', 'Maca tipo envelope ou cesto', 'Cinto e talabarte reservas para o resgatista', 'Rádio ou celular com sinal no local', 'Kit de primeiros socorros'],
    procedimento: '1. Quem viu avisa o vigia ou o líder e dispara o alerta combinado.\n2. O líder do resgate chama a equipe e liga para o SAMU (192) ou Bombeiros (193) se houver ferido.\n3. Ninguém sobe sem cinto, talabarte e ponto de ancoragem: a área é isolada embaixo.\n4. Converse com a vítima para saber se está consciente e peça para mexer as pernas, se conseguir.\n5. A vítima suspensa precisa ser retirada o quanto antes: ficar pendurada pelo cinto é perigoso em poucos minutos.\n6. Resgate pelo método treinado (descida assistida ou içamento) até o chão, sem pressa desnecessária e sem improviso.\n7. No chão, mantenha a pessoa deitada, aquecida e acompanhada até o socorro chegar.\n8. Registre o que aconteceu e abra a investigação.',
    primeirosSocorros: 'Não deixe a vítima de pé logo depois do resgate. Mantenha deitada e aquecida, observe a respiração e chame o SAMU. Não dê água nem comida.',
  },
  ESPACO_CONFINADO: {
    cenarios: 'Trabalhador desmaia dentro do espaço por falta de oxigênio ou gás tóxico.\nTrabalhador se machuca e não consegue sair pela abertura.\nO monitor de gases dispara alarme durante o trabalho.\nEngolfamento por grãos, areia ou líquido.',
    equipamentos: ['Tripé com guincho de resgate', 'Cinto paraquedista com argola nas costas para cada entrante', 'Detector de gases calibrado', 'Ventilador ou exaustor com mangote', 'Máscara autônoma (ar mandado ou cilindro) para o resgatista', 'Maca tipo envelope', 'Rádio para falar com quem está dentro', 'Kit de primeiros socorros'],
    procedimento: '1. Ao primeiro sinal de problema, o vigia manda todos saírem e não entra no espaço.\n2. O vigia tenta o resgate pelo lado de fora, puxando pelo guincho do tripé.\n3. Se não der, chama a equipe de resgate e liga para os Bombeiros (193) e o SAMU (192).\n4. Ninguém entra para socorrer sem máscara autônoma e sem medir a atmosfera: a maior parte das mortes em espaço confinado é de quem foi ajudar.\n5. Aumente a ventilação sem jogar oxigênio puro dentro do espaço.\n6. Retire a vítima pelo método treinado e leve para um lugar com ar fresco.\n7. A PET fica suspensa até a investigação terminar.',
    primeirosSocorros: 'Leve a vítima para o ar livre, deite e observe se respira. Se não respirar, comece a massagem cardíaca se tiver treinamento e mantenha o SAMU na linha até chegar.',
  },
} as const;
