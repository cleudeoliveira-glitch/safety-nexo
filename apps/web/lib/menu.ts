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
  // Recurso do plano que a tela usa: sem ele, o menu mostra um cadeado.
  recurso?: string;
  // Partes do mesmo assunto: aparecem logo abaixo do item quando ele está aberto.
  partes?: ItemMenu[];
};
export type GrupoMenu = { titulo: string; itens: ItemMenu[] };

// Item com partes: o clique leva à primeira parte que a pessoa pode abrir.
function assunto(nome: string, icone: NomeIcone, partes: Omit<ItemMenu, 'icone'>[]): ItemMenu {
  const comIcone = partes.map((p) => ({ ...p, icone }));
  return { ...comIcone[0], nome, partes: comIcone, soConsultoria: comIcone.every((p) => p.soConsultoria) };
}

// Cada assunto aparece uma vez só. Telas do mesmo assunto ficam como partes do item.
export const MENU: GrupoMenu[] = [
  {
    titulo: '',
    itens: [
      assunto('Painel', 'casa', [
        { nome: 'Resumo', rota: '/', geral: true },
        { nome: 'Indicadores', rota: '/ssma' },
        { nome: 'Todas as empresas', rota: '/geral', geral: true, soConsultoria: true },
      ]),
    ],
  },
  {
    titulo: 'A empresa',
    itens: [
      assunto('Cadastro da empresa', 'predio', [
        { nome: 'Dados da empresa', rota: '#dados', soConsultoria: true },
        { nome: 'GHEs, riscos e exames', rota: '#ghes', soConsultoria: true },
        { nome: 'Trazer PGR antigo (IA)', rota: '/importar-pdf', soConsultoria: true },
      ]),
      assunto('Colaboradores', 'pessoas', [
        { nome: 'Lista, ASO e EPI', rota: '/colaboradores' },
        { nome: 'Importar do RH', rota: '/conectores#rh' },
        { nome: 'Terceirizadas', rota: '/conectores#terceiros' },
        { nome: 'Espaço do trabalhador', rota: '/trabalhador' },
      ]),
      assunto('Documentos', 'documento', [
        { nome: 'Emitir documento', rota: '/emitir', geral: true },
        { nome: 'Arquivo', rota: '/arquivo' },
        { nome: 'Assinaturas', rota: '/assinaturas', recurso: 'assinatura' },
        { nome: 'Histórico de alterações', rota: '/historico', soConsultoria: true },
      ]),
    ],
  },
  {
    titulo: 'Dia a dia',
    itens: [
      assunto('APR e permissão de trabalho', 'escudo', [
        { nome: 'APR', rota: '/operacao#apr' },
        { nome: 'Permissão de trabalho', rota: '/operacao#pt' },
        { nome: 'Espaços confinados e resgate', rota: '/confinados' },
      ]),
      assunto('DDS', 'fala', [
        { nome: 'Registrar DDS', rota: '/operacao#dds' },
        { nome: 'Biblioteca (150 temas)', rota: '/dds', geral: true },
      ]),
      { nome: 'Inspeções', icone: 'lista', rota: '/operacao#checklist' },
      { nome: 'EPI e almoxarifado', icone: 'caixa', rota: '/almoxarifado' },
    ],
  },
  {
    titulo: 'Programas',
    itens: [
      // Fica à vista, fora de grupo, a pedido do Rodrigo: é o que mais procuram por causa da NR-01.
      { nome: 'Psicossocial', icone: 'cerebro', rota: '/psicossocial', soConsultoria: true },
      assunto('Prevenção', 'check', [
        { nome: 'Relatos e denúncias', rota: '/prevencao#relatos' },
        { nome: 'Plano de ação', rota: '/prevencao#acoes' },
      ]),
      assunto('Acidentes e afastamentos', 'cruz', [
        { nome: 'Acidentes (CAT)', rota: '/saude#cat' },
        { nome: 'Investigação', rota: '/prevencao#investigacao', soConsultoria: true },
        { nome: 'Afastamentos', rota: '/saude#afastamentos' },
        { nome: 'Atestados e faltas', rota: '/conectores#faltas' },
      ]),
      assunto('Saúde e ergonomia', 'coracao', [
        { nome: 'Ergonomia (AEP e AET)', rota: '/saude#aet' },
        { nome: 'Prontuário de saúde', rota: '/prontuario', soConsultoria: true },
      ]),
      assunto('CIPA', 'votar', [
        { nome: 'Dimensionamento', rota: '#cipa', soConsultoria: true },
        { nome: 'Eleição', rota: '/cipa', soConsultoria: true },
        { nome: 'Reuniões e atas', rota: '/cipa#reunioes', soConsultoria: true },
      ]),
      assunto('Treinamentos', 'formatura', [
        { nome: 'Treinamentos das NRs', rota: '/treinamentos' },
        { nome: 'Slides para aplicar', rota: '/material', geral: true },
        { nome: 'SIPAT', rota: '/cultura#sipat' },
        { nome: 'Programa 5S', rota: '/cultura#5s' },
      ]),
      { nome: 'Emergência e brigada', icone: 'fogo', rota: '/emergencia' },
      assunto('eSocial', 'nuvem', [
        { nome: 'Desta empresa', rota: '/esocial', soConsultoria: true, recurso: 'esocial' },
        { nome: 'De todas e multas', rota: '/esocial-geral', geral: true, soConsultoria: true, recurso: 'esocial' },
        { nome: 'FAP e RAT', rota: '/fap', soConsultoria: true },
      ]),
    ],
  },
  {
    titulo: 'Ferramentas',
    itens: [
      { nome: 'Calculadoras de SST', icone: 'numero', rota: '/calculadoras', geral: true },
      { nome: 'Comercial', icone: 'cifrao', rota: '/comercial', geral: true, soConsultoria: true, recurso: 'proposta' },
      { nome: 'Mudanças nas normas', icone: 'sino', rota: '/normas', geral: true, soConsultoria: true },
      assunto('Minha conta', 'cracha', [
        { nome: 'Meu perfil', rota: '/perfil', geral: true },
        { nome: 'Meu plano', rota: '/plano', geral: true, soConsultoria: true },
        { nome: 'Integrações', rota: '/integracoes', geral: true, soConsultoria: true },
      ]),
    ],
  },
];

// Todas as telas do menu, uma por linha (itens soltos e partes).
export const TELAS_DO_MENU: ItemMenu[] = MENU.flatMap((g) => g.itens.flatMap((i) => i.partes ?? [i]));

// Endereço final de um item para a empresa em foco. Sem empresa, os módulos levam ao cadastro da primeira.
export function enderecoDoItem(item: ItemMenu, empresaId: string): string {
  if (item.geral) return item.rota;
  if (!empresaId) return '/empresas/nova';
  return `/empresas/${empresaId}${item.rota}`;
}
