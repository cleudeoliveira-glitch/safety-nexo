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

import { TEMAS_DDS as TEMAS_BASE } from './temas-dds';
import { VIVENCIAS_DDS } from './vivencias-dds';

// Cada tema sai com o texto para falar, a pergunta, uma situação para contar e a dinâmica vivencial.
export const TEMAS_DDS = TEMAS_BASE.map((t) => ({ ...t, situacao: VIVENCIAS_DDS[t.tema]?.situacao ?? '', dinamica: VIVENCIAS_DDS[t.tema]?.dinamica ?? '' }));
