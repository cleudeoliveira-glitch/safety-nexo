// Planos do Safety Nexo, como aparecem para os clientes (página /planos e tela "Meu plano").
// Preços, limites e recursos iguais aos do servidor (apps/api/src/admin/planos.ts e common/plano.ts): ao mudar lá, mude aqui também.
export type PlanoSite = {
  codigo: string;
  nome: string;
  precoMensal: number;
  limiteEmpresas: number | null; // null = sem limite
  paraQuem: string;
  destaque?: boolean;
  inclui: string[]; // o que este plano acrescenta ao anterior
  base?: string; // "Tudo do ..."
};

export const PLANOS_SITE: PlanoSite[] = [
  {
    codigo: 'FREE', nome: 'Grátis', precoMensal: 0, limiteEmpresas: 1,
    paraQuem: 'Para conhecer o sistema. Os primeiros 14 dias têm tudo liberado.',
    inclui: ['1 empresa com até 10 funcionários', '1 PGR e as ordens de serviço para testar', 'PDF com a marca "Versão Teste", sem logo', 'Demonstração da pesquisa psicossocial'],
  },
  {
    codigo: 'START', nome: 'Start', precoMensal: 47, limiteEmpresas: 1,
    paraQuem: 'Para o técnico que trabalha dentro de uma empresa ou para quem está começando.',
    inclui: ['1 empresa, funcionários sem limite', 'PGR, PCMSO, LTCAT, LIP, LPP, PPP, AET, ASO, CAT, OS, EPI, DDS, CIPA e checklists', 'PDF com a logo da empresa, sem marca d\'água', 'Treinamentos com slides prontos', 'Uso no campo sem internet', 'Assinatura com o dedo, foto e local', '2 pesquisas psicossociais por mês'],
  },
  {
    codigo: 'ESSENCIAL', nome: 'Essencial', precoMensal: 97, limiteEmpresas: 5, base: 'Tudo do Start',
    paraQuem: 'Para a consultoria que está começando a atender empresas.',
    inclui: ['Até 5 empresas clientes', 'Logo da consultoria no rodapé dos documentos', 'eSocial S-2210, S-2220, S-2240 e S-2230', 'Proposta comercial com aprovação por link', '5 pesquisas psicossociais por mês'],
  },
  {
    codigo: 'PROFISSIONAL', nome: 'Profissional', precoMensal: 197, limiteEmpresas: 15, destaque: true, base: 'Tudo do Essencial',
    paraQuem: 'Para a consultoria que já tem uma carteira de clientes.',
    inclui: ['Até 15 empresas clientes', 'Entrega de EPI pelo reconhecimento do rosto', 'Contratos, serviços e cobrança por Pix', 'Equipe de até 3 pessoas', '15 pesquisas psicossociais por mês'],
  },
  {
    codigo: 'ENTERPRISE', nome: 'Ilimitado', precoMensal: 397, limiteEmpresas: null, base: 'Tudo do Profissional',
    paraQuem: 'Para quem atende muitas empresas e não quer se preocupar com limite.',
    inclui: ['Empresas sem limite', 'Pesquisas psicossociais sem limite', 'Equipe sem limite', 'Documentos sem a marca Safety Nexo'],
  },
];

// O que vem em todos os planos pagos.
export const INCLUSO_EM_TODOS: { grupo: string; itens: string[] }[] = [
  { grupo: 'Programas e laudos', itens: ['PGR, PCMSO, LTCAT, LIP e LPP em PDF', 'PPP, AET (ergonomia) e CAT', 'Ordem de serviço e ficha de EPI', 'Dimensionamento e eleição da CIPA'] },
  { grupo: 'Dia a dia', itens: ['APR e permissão de trabalho', 'DDS com 150 temas prontos', 'Checklists das NRs', 'Almoxarifado de EPI', 'Uso em campo sem internet'] },
  { grupo: 'Pessoas e saúde', itens: ['Treinamentos das NRs com slides, certificado e QR code', 'Prontuário de saúde, ASO e afastamentos', 'SIPAT, 5S, emergência e brigada', 'Relatos pelo QR code e plano de ação'] },
  { grupo: 'Para a empresa cliente', itens: ['Login para cada empresa cliente ver a própria área', 'Convite por WhatsApp', 'Avisos de mudanças nas normas', 'Arquivo de documentos com busca dentro do PDF'] },
];

export const reais = (v: number) => (v === 0 ? 'Grátis' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }));
export const textoLimite = (n: number | null) => (n === null ? 'Empresas sem limite' : `Até ${n} empresa${n === 1 ? '' : 's'}`);
