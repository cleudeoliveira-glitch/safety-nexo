// Checklists de inspeção. São pontos de partida: a pessoa pode tirar, incluir e reescrever itens.
// Cada item traz a gravidade sugerida da infração (1 a 4, como I1 a I4 da NR-28), usada para estimar a multa.
// A gravidade é uma sugestão: o código exato de cada item está no Anexo II da NR-28 e a pessoa pode trocar.
// tipo: S = segurança do trabalho, M = medicina do trabalho (a NR-28 tem uma tabela para cada).

type Item = [texto: string, grau: 1 | 2 | 3 | 4];
type Modelo = { titulo: string; grupo: string; tipo: 'S' | 'M'; itens: Item[] };

const MODELOS: Record<string, Modelo> = {
  'NR-01': {
    titulo: 'Gerenciamento de riscos ocupacionais (NR-01)',
    grupo: 'Documentos e gestão',
    tipo: 'S',
    itens: [
      ['PGR elaborado, com inventário de riscos e plano de ação', 3],
      ['Inventário de riscos revisado nos últimos 2 anos ou após mudanças', 2],
      ['Riscos psicossociais e ergonômicos considerados no PGR', 2],
      ['Trabalhadores informados sobre os riscos e as medidas de prevenção', 2],
      ['Ordens de serviço de segurança entregues e assinadas', 2],
      ['Plano de ação com responsáveis e prazos acompanhados', 2],
      ['Treinamentos com certificado e conteúdo registrados', 2],
      ['Acidentes e doenças analisados e registrados', 2],
    ],
  },
  'NR-05': {
    titulo: 'CIPA ou designado (NR-05)',
    grupo: 'Documentos e gestão',
    tipo: 'S',
    itens: [
      ['CIPA constituída e dimensionada, ou designado nomeado', 2],
      ['Processo eleitoral documentado (edital, votação, ata)', 2],
      ['Treinamento dos membros da CIPA realizado', 2],
      ['Reuniões mensais feitas e com ata', 1],
      ['Mapa de riscos ou relatório de percepção de riscos atualizado', 1],
      ['Calendário de reuniões divulgado', 1],
    ],
  },
  'NR-06': {
    titulo: 'Equipamentos de Proteção Individual (NR-06)',
    grupo: 'Pessoas e proteção',
    tipo: 'S',
    itens: [
      ['EPIs adequados aos riscos de cada atividade, conforme o PGR', 3],
      ['Todos os EPIs em uso com CA válido', 3],
      ['Fichas de entrega assinadas e atualizadas', 2],
      ['Trabalhadores orientados sobre uso, guarda e conservação dos EPIs', 2],
      ['EPIs sendo usados durante a atividade', 3],
      ['EPIs em bom estado de conservação e higiene', 2],
      ['Troca imediata quando o EPI está danificado ou é extraviado', 3],
      ['Local adequado para guardar os EPIs', 1],
    ],
  },
  'NR-07': {
    titulo: 'Saúde ocupacional e PCMSO (NR-07)',
    grupo: 'Documentos e gestão',
    tipo: 'M',
    itens: [
      ['PCMSO elaborado por médico do trabalho e atualizado', 3],
      ['Exames admissionais feitos antes do início das atividades', 3],
      ['Exames periódicos em dia', 3],
      ['Exames de retorno ao trabalho, mudança de risco e demissional feitos', 3],
      ['ASOs arquivados e entregues aos trabalhadores', 2],
      ['Relatório analítico anual do PCMSO feito', 2],
      ['Material de primeiros socorros disponível e com pessoa treinada', 2],
    ],
  },
  'NR-08': {
    titulo: 'Edificações (NR-08)',
    grupo: 'Ambiente',
    tipo: 'S',
    itens: [
      ['Pisos sem buracos, saliências ou desníveis perigosos', 3],
      ['Pisos antiderrapantes em áreas molhadas', 2],
      ['Escadas e rampas com corrimão e degraus em bom estado', 3],
      ['Aberturas no piso e nas paredes protegidas', 4],
      ['Telhado e estrutura sem infiltrações ou risco de queda de material', 3],
      ['Circulação de pessoas sinalizada e desobstruída', 2],
    ],
  },
  'NR-10': {
    titulo: 'Instalações e serviços em eletricidade (NR-10)',
    grupo: 'Máquinas e energia',
    tipo: 'S',
    itens: [
      ['Quadros e painéis fechados, identificados e sinalizados', 3],
      ['Frente dos quadros elétricos desobstruída', 2],
      ['Sem fios expostos, emendas improvisadas ou extensões precárias', 4],
      ['Tomadas e plugues em bom estado e no padrão', 2],
      ['Instalações e equipamentos aterrados', 3],
      ['Disjuntores e dispositivos DR adequados e identificados', 3],
      ['Diagrama elétrico atualizado e disponível', 2],
      ['Quem intervém nas instalações é autorizado e tem treinamento NR-10 válido', 4],
      ['Procedimento de bloqueio e etiquetagem disponível e aplicado', 4],
      ['Prontuário das instalações elétricas (quando a carga passar de 75 kW)', 2],
    ],
  },
  'NR-11': {
    titulo: 'Empilhadeiras, transporte e armazenagem (NR-11)',
    grupo: 'Máquinas e energia',
    tipo: 'S',
    itens: [
      ['Operadores de empilhadeira treinados e com crachá de identificação', 3],
      ['Empilhadeira com sinal sonoro de ré, luzes e cinto funcionando', 3],
      ['Capacidade de carga indicada no equipamento', 2],
      ['Inspeção diária do equipamento registrada', 2],
      ['Pilhas de material estáveis, com altura segura e longe de paredes e quadros', 3],
      ['Corredores de circulação demarcados e desobstruídos', 2],
      ['Estantes e porta-paletes fixos, sem danos e com carga máxima indicada', 3],
    ],
  },
  'NR-12': {
    titulo: 'Segurança em máquinas e equipamentos (NR-12)',
    grupo: 'Máquinas e energia',
    tipo: 'S',
    itens: [
      ['Proteções fixas ou móveis nas zonas de perigo (transmissões e partes móveis)', 4],
      ['Proteções móveis com intertravamento funcionando', 4],
      ['Botão de parada de emergência acessível e funcionando', 4],
      ['Comandos de partida protegidos contra acionamento acidental', 3],
      ['Máquina aterrada e com instalação elétrica protegida', 3],
      ['Sinalização de segurança e identificação da máquina', 2],
      ['Manual de instruções disponível em português', 2],
      ['Operadores capacitados e autorizados', 3],
      ['Manutenções registradas', 2],
      ['Área ao redor da máquina livre e demarcada', 2],
      ['Inventário de máquinas atualizado', 1],
    ],
  },
  'NR-13': {
    titulo: 'Caldeiras, vasos de pressão e compressores (NR-13)',
    grupo: 'Máquinas e energia',
    tipo: 'S',
    itens: [
      ['Placa de identificação visível no equipamento', 2],
      ['Válvula de segurança e manômetro instalados e funcionando', 4],
      ['Prontuário e registro de segurança disponíveis', 3],
      ['Inspeções de segurança dentro do prazo', 4],
      ['Operador com treinamento específico (caldeiras)', 4],
      ['Local de instalação adequado, ventilado e com saída livre', 3],
    ],
  },
  'NR-15': {
    titulo: 'Ruído, calor e agentes nocivos (NR-15)',
    grupo: 'Ambiente',
    tipo: 'S',
    itens: [
      ['Avaliação de ruído feita e dentro do prazo', 3],
      ['Avaliação de calor feita onde há fontes de calor', 3],
      ['Produtos químicos com ficha de segurança (FDS) disponível', 2],
      ['Medidas de proteção coletiva aplicadas antes do EPI', 3],
      ['Protetor auditivo usado onde o ruído passa do limite', 3],
      ['Pausas e hidratação onde há exposição ao calor', 3],
      ['LTCAT ou laudo de insalubridade atualizado', 2],
    ],
  },
  'NR-17': {
    titulo: 'Ergonomia (NR-17)',
    grupo: 'Pessoas e proteção',
    tipo: 'S',
    itens: [
      ['Avaliação ergonômica preliminar feita e no PGR', 2],
      ['Cadeiras reguláveis em altura, com encosto e apoio para os pés quando preciso', 2],
      ['Monitores na altura dos olhos e teclado na altura dos cotovelos', 1],
      ['Iluminação adequada à tarefa', 2],
      ['Levantamento e transporte de cargas com peso seguro ou com ajuda mecânica', 3],
      ['Pausas em atividades repetitivas ou de digitação', 2],
      ['Trabalho em pé com possibilidade de alternar com sentado', 2],
    ],
  },
  // AEP: a avaliação ergonômica preliminar do item 17.3.1. Cada "não conforme" vira ação no plano;
  // quando ela não basta (queixas, afastamentos, PCMSO), parte-se para a AET.
  'NR-17-AEP': {
    titulo: 'Avaliação ergonômica preliminar - AEP (NR-17)',
    grupo: 'Pessoas e proteção',
    tipo: 'S',
    itens: [
      ['Tronco: a tarefa não exige ficar inclinado ou torcido por muito tempo', 2],
      ['Braços: não trabalha com as mãos acima dos ombros com frequência', 2],
      ['Repetição: movimentos repetitivos têm pausas ou rodízio de tarefa', 2],
      ['Cargas: levantar e carregar com peso seguro e boa pega, ou com ajuda mecânica', 3],
      ['Empurrar e puxar: carrinhos e paleteiras em bom estado e piso sem buracos', 2],
      ['Em pé: dá para alternar com sentado ou há assento para descanso', 2],
      ['Sentado: cadeira regulável, com encosto e apoio para os pés quando preciso', 2],
      ['Computador: monitor na altura dos olhos, teclado e mouse na altura dos cotovelos', 1],
      ['Bancada ou máquina na altura certa para a tarefa e para quem trabalha', 2],
      ['Ferramentas leves, com boa pega e sem vibração excessiva', 2],
      ['Iluminação, temperatura e ruído confortáveis para a tarefa', 2],
      ['Ritmo, metas e jornada permitem pausas, sem pressão excessiva', 2],
      ['Sem queixas de dor ou afastamentos ligados a esta tarefa', 2],
      ['Trabalhadores ouvidos sobre as dificuldades da tarefa', 1],
    ],
  },
  'NR-18': {
    titulo: 'Obras e construção civil (NR-18)',
    grupo: 'Atividades de risco',
    tipo: 'S',
    itens: [
      ['PGR da obra elaborado e no canteiro', 3],
      ['Bordas de laje, poços e aberturas com proteção contra queda', 4],
      ['Andaimes montados com base firme, guarda-corpo e rodapé', 4],
      ['Escadas de mão em bom estado e amarradas', 3],
      ['Instalações elétricas provisórias protegidas', 4],
      ['Áreas de vivência (banheiro, refeitório, vestiário) adequadas', 2],
      ['Escavações com escoramento ou talude quando preciso', 4],
      ['Uso de capacete, botina e cinto onde exigido', 3],
      ['Treinamento admissional da obra registrado', 2],
    ],
  },
  'NR-20': {
    titulo: 'Inflamáveis e combustíveis (NR-20)',
    grupo: 'Atividades de risco',
    tipo: 'S',
    itens: [
      ['Inflamáveis armazenados em local ventilado, sinalizado e longe de faíscas', 4],
      ['Recipientes identificados e fechados', 2],
      ['Quantidade guardada dentro do limite permitido', 3],
      ['Extintor adequado próximo ao local', 3],
      ['Trabalhadores com treinamento de NR-20 conforme a classe da instalação', 3],
      ['Proibição de fumar sinalizada', 2],
    ],
  },
  'NR-23': {
    titulo: 'Proteção contra incêndios (NR-23)',
    grupo: 'Emergência',
    tipo: 'S',
    itens: [
      ['Extintores no local indicado, sinalizados e desobstruídos', 3],
      ['Extintores com carga e teste hidrostático dentro da validade', 3],
      ['Saídas de emergência sinalizadas e desobstruídas', 4],
      ['Rotas de fuga sinalizadas', 3],
      ['Iluminação de emergência funcionando', 3],
      ['Hidrantes e mangueiras em condições de uso (quando houver)', 3],
      ['Alarme de incêndio funcionando (quando houver)', 3],
      ['Trabalhadores orientados sobre uso de extintores e abandono do local', 2],
      ['Inflamáveis armazenados em local adequado e identificado', 3],
      ['AVCB ou CLCB dentro da validade', 2],
    ],
  },
  'NR-24': {
    titulo: 'Condições sanitárias e de conforto (NR-24)',
    grupo: 'Ambiente',
    tipo: 'S',
    itens: [
      ['Instalações sanitárias separadas por sexo, limpas e em número suficiente', 2],
      ['Lavatórios com material para lavar e secar as mãos', 1],
      ['Chuveiros onde a atividade exige (sujeira, calor ou produtos)', 2],
      ['Vestiários com armários individuais quando há troca de roupa', 2],
      ['Local de refeições limpo, com mesas, assentos e meio de aquecer a comida', 2],
      ['Água potável e fresca, com bebedouro ou copos individuais', 2],
      ['Lixeiras com tampa', 1],
      ['Limpeza e manutenção periódicas', 1],
    ],
  },
  'NR-26': {
    titulo: 'Sinalização de segurança (NR-26)',
    grupo: 'Ambiente',
    tipo: 'S',
    itens: [
      ['Placas de segurança visíveis e em bom estado', 2],
      ['Tubulações identificadas por cor ou etiqueta', 1],
      ['Produtos químicos com rótulo de perigo', 2],
      ['Áreas de risco demarcadas no piso', 2],
      ['Sinalização de uso obrigatório de EPI nos setores', 1],
    ],
  },
  'NR-32': {
    titulo: 'Serviços de saúde (NR-32)',
    grupo: 'Atividades de risco',
    tipo: 'S',
    itens: [
      ['Coletores de perfurocortantes no local de uso, sem passar do limite', 4],
      ['Proibição de reencapar agulhas cumprida', 3],
      ['Trabalhadores vacinados (tétano, hepatite B, difteria) com registro', 3],
      ['Lavatório com sabão e papel toalha nos postos de atendimento', 2],
      ['Resíduos separados conforme o plano de resíduos', 2],
      ['Proibição de adornos e de comer nos postos de trabalho', 2],
      ['Treinamento inicial e contínuo registrado', 2],
    ],
  },
  'NR-33': {
    titulo: 'Espaços confinados (NR-33)',
    grupo: 'Atividades de risco',
    tipo: 'S',
    itens: [
      ['Espaços confinados identificados e sinalizados', 3],
      ['Permissão de entrada e trabalho (PET) emitida para cada entrada', 4],
      ['Medição de gases antes e durante a entrada', 4],
      ['Vigia do lado de fora durante toda a atividade', 4],
      ['Equipamento de resgate disponível no local', 4],
      ['Trabalhadores, vigias e supervisores treinados', 4],
    ],
  },
  'NR-35': {
    titulo: 'Trabalho em altura (NR-35)',
    grupo: 'Atividades de risco',
    tipo: 'S',
    itens: [
      ['Análise de risco ou permissão de trabalho emitida', 3],
      ['Trabalhadores treinados em NR-35 e com aptidão no ASO', 4],
      ['Cinto tipo paraquedista e talabarte com CA válido e inspecionados', 4],
      ['Ponto de ancoragem resistente e definido antes do serviço', 4],
      ['Área abaixo isolada e sinalizada', 3],
      ['Plano de resgate definido e equipe sabendo agir', 3],
      ['Escadas, andaimes e plataformas em bom estado', 3],
    ],
  },
  ESCRITORIO: {
    titulo: 'Escritório e área administrativa',
    grupo: 'Por ambiente',
    tipo: 'S',
    itens: [
      ['Cadeiras e mesas em boas condições e reguláveis', 2],
      ['Fios e cabos organizados, sem risco de tropeço', 2],
      ['Tomadas sem sobrecarga (sem benjamins em série)', 3],
      ['Extintor sinalizado e dentro da validade', 3],
      ['Saída de emergência livre', 4],
      ['Ar-condicionado com manutenção (PMOC) em dia', 1],
      ['Armários e estantes fixos e sem excesso de peso no alto', 2],
    ],
  },
  COZINHA: {
    titulo: 'Cozinha industrial e refeitório',
    grupo: 'Por ambiente',
    tipo: 'S',
    itens: [
      ['Botijões ou central de gás fora do ambiente e com mangueira na validade', 4],
      ['Coifa e exaustão limpas e funcionando', 2],
      ['Piso antiderrapante e sem gordura acumulada', 3],
      ['Facas e máquinas de corte com proteção e guardadas corretamente', 3],
      ['Luvas térmicas e avental disponíveis', 2],
      ['Câmara fria com abertura por dentro', 4],
      ['Extintor classe K ou adequado próximo ao fogão', 3],
    ],
  },
  ALMOXARIFADO: {
    titulo: 'Almoxarifado e depósito',
    grupo: 'Por ambiente',
    tipo: 'S',
    itens: [
      ['Materiais pesados nas prateleiras de baixo', 2],
      ['Prateleiras fixas e sem danos', 3],
      ['Escada adequada para alcançar o alto', 2],
      ['Produtos químicos separados e com ficha de segurança', 3],
      ['Corredores livres e iluminados', 2],
      ['Extintor sinalizado e desobstruído', 3],
    ],
  },
  VEICULOS: {
    titulo: 'Veículos e frota',
    grupo: 'Por ambiente',
    tipo: 'S',
    itens: [
      ['Motoristas com habilitação válida para a categoria', 3],
      ['Exame toxicológico em dia para motoristas profissionais (C, D e E)', 3],
      ['Inspeção diária do veículo feita', 2],
      ['Pneus, freios, luzes e cintos em boas condições', 4],
      ['Carga amarrada e dentro do limite de peso', 3],
      ['Kit de emergência (triângulo, extintor quando exigido, macaco)', 2],
    ],
  },
};

export type ModeloChecklist = { titulo: string; grupo: string; tipo: 'S' | 'M'; itens: string[]; graus: number[] };

// itens fica como lista de textos (o app de campo guarda isso sem internet); graus vem ao lado, na mesma ordem.
export const MODELOS_CHECKLIST: Record<string, ModeloChecklist> = Object.fromEntries(
  Object.entries(MODELOS).map(([k, m]) => [k, { titulo: m.titulo, grupo: m.grupo, tipo: m.tipo, itens: m.itens.map((i) => i[0]), graus: m.itens.map((i) => i[1]) }]),
);

export const ehModelo = (m: string) => m === 'LIVRE' || m in MODELOS_CHECKLIST;

// Gravidade sugerida para um item já salvo sem gravidade (inspeções antigas): procura o texto no modelo.
export function grauDoModelo(modelo: string, texto: string): number | undefined {
  const m = MODELOS_CHECKLIST[modelo];
  if (!m) return undefined;
  const i = m.itens.indexOf(texto);
  return i >= 0 ? m.graus[i] : undefined;
}
