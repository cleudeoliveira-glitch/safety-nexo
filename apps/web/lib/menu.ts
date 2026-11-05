import type { NomeIcone } from '@/components/Icone';

// Todos os módulos do sistema, na ordem do menu lateral.
// "rota" que começa com "/" fica dentro da empresa em foco (/empresas/{id}/...);
// "geral" é um endereço fora da empresa; "#" leva a uma parte do cadastro da empresa.
export type ItemMenu = {
  nome: string;
  icone: NomeIcone;
  rota: string;
  geral?: boolean;
  soConsultoria?: boolean;
};
export type GrupoMenu = { titulo: string; itens: ItemMenu[] };

export const MENU: GrupoMenu[] = [
  {
    titulo: 'Início',
    itens: [
      { nome: 'Painel (dashboard)', icone: 'casa', rota: '/', geral: true },
      { nome: 'Dashboard de indicadores', icone: 'grafico', rota: '/ssma' },
      { nome: 'Emitir documento', icone: 'documento', rota: '/emitir', geral: true },
      { nome: 'Visão geral das empresas', icone: 'grade', rota: '/geral', geral: true, soConsultoria: true },
      { nome: 'Comercial', icone: 'cifrao', rota: '/comercial', geral: true, soConsultoria: true },
      { nome: 'Mudanças nas normas', icone: 'sino', rota: '/normas', geral: true, soConsultoria: true },
      { nome: 'Meu plano', icone: 'coroa', rota: '/plano', geral: true, soConsultoria: true },
    ],
  },
  {
    titulo: 'Cadastro da empresa',
    itens: [
      { nome: 'Dados da empresa', icone: 'predio', rota: '#dados', soConsultoria: true },
      { nome: 'GHEs, riscos e exames', icone: 'alerta', rota: '#ghes', soConsultoria: true },
      { nome: 'Colaboradores, ASO e EPI', icone: 'pessoas', rota: '#colaboradores' },
      { nome: 'Importar funcionários do RH', icone: 'upload', rota: '/conectores#rh' },
      { nome: 'Trazer PGR antigo (IA)', icone: 'brilho', rota: '/importar-pdf', soConsultoria: true },
    ],
  },
  {
    titulo: 'Programas e laudos',
    itens: [
      { nome: 'PGR, PCMSO, LTCAT, LIP, LPP', icone: 'documento', rota: '#documentos', soConsultoria: true },
      { nome: 'CIPA', icone: 'votar', rota: '#cipa', soConsultoria: true },
      { nome: 'Ergonomia (AET)', icone: 'cadeira', rota: '/saude#aet' },
      { nome: 'Acidentes (CAT)', icone: 'cruz', rota: '/saude#cat' },
      { nome: 'Afastamentos', icone: 'calendario', rota: '/saude#afastamentos' },
      { nome: 'Prontuário de saúde', icone: 'coracao', rota: '/prontuario', soConsultoria: true },
      { nome: 'Psicossocial', icone: 'cerebro', rota: '/psicossocial', soConsultoria: true },
    ],
  },
  {
    titulo: 'Prevenção',
    itens: [
      { nome: 'Relatos pelo QR code', icone: 'qr', rota: '/prevencao#relatos' },
      { nome: 'Plano de ação', icone: 'check', rota: '/prevencao#acoes' },
      { nome: 'Investigação de acidentes', icone: 'lupa', rota: '/prevencao#investigacao', soConsultoria: true },
    ],
  },
  {
    titulo: 'Dia a dia',
    itens: [
      { nome: 'APR (análise de risco)', icone: 'escudo', rota: '/operacao#apr' },
      { nome: 'Permissão de trabalho', icone: 'chave', rota: '/operacao#pt' },
      { nome: 'DDS (registrar)', icone: 'fala', rota: '/operacao#dds' },
      { nome: 'Biblioteca de DDS (150 temas)', icone: 'livro', rota: '/dds', geral: true },
      { nome: 'Checklists de NRs', icone: 'lista', rota: '/operacao#checklist' },
      { nome: 'Almoxarifado de EPI', icone: 'caixa', rota: '/almoxarifado' },
      { nome: 'Campo (sem internet)', icone: 'sinal', rota: '/campo', geral: true },
    ],
  },
  {
    titulo: 'Pessoas e treinamentos',
    itens: [
      { nome: 'Treinamentos das NRs', icone: 'formatura', rota: '/treinamentos' },
      { nome: 'Espaço do trabalhador', icone: 'cracha', rota: '/trabalhador' },
      { nome: 'Eleição da CIPA', icone: 'votar', rota: '/cipa', soConsultoria: true },
      { nome: 'SIPAT', icone: 'festa', rota: '/cultura#sipat' },
      { nome: 'Programa 5S', icone: 'vassoura', rota: '/cultura#5s' },
      { nome: 'Emergência e brigada', icone: 'fogo', rota: '/emergencia' },
    ],
  },
  {
    titulo: 'Governança',
    itens: [
      { nome: 'eSocial', icone: 'nuvem', rota: '/esocial', soConsultoria: true },
      { nome: 'eSocial de todas e multas', icone: 'nuvem', rota: '/esocial-geral', geral: true, soConsultoria: true },
      { nome: 'FAP e RAT', icone: 'porcento', rota: '/fap', soConsultoria: true },
      { nome: 'Terceirizadas', icone: 'aperto', rota: '/conectores#terceiros' },
      { nome: 'Atestados e faltas', icone: 'relogio', rota: '/conectores#faltas' },
    ],
  },
  {
    titulo: 'Documentos',
    itens: [
      { nome: 'Arquivo de documentos', icone: 'pasta', rota: '/arquivo' },
      { nome: 'Assinaturas', icone: 'caneta', rota: '/assinaturas' },
      { nome: 'Histórico de alterações', icone: 'relogio', rota: '/historico', soConsultoria: true },
    ],
  },
  {
    titulo: 'Conta',
    itens: [
      { nome: 'Meu perfil', icone: 'cracha', rota: '/perfil', geral: true },
      { nome: 'Integrações', icone: 'sinal', rota: '/integracoes', geral: true, soConsultoria: true },
    ],
  },
];

// Endereço final de um item para a empresa em foco. Sem empresa, os módulos levam ao cadastro da primeira.
export function enderecoDoItem(item: ItemMenu, empresaId: string): string {
  if (item.geral) return item.rota;
  if (!empresaId) return '/empresas/nova';
  return `/empresas/${empresaId}${item.rota}`;
}
