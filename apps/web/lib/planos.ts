// Planos do Safety Nexo, como aparecem para os clientes (página /planos e tela "Meu plano").
// Preços e limites iguais aos do servidor (apps/api/src/admin/planos.ts): ao mudar lá, mude aqui também.
export type PlanoSite = {
  codigo: string;
  nome: string;
  precoMensal: number;
  limiteEmpresas: number | null; // null = sem limite
  paraQuem: string;
  destaque?: boolean;
};

export const PLANOS_SITE: PlanoSite[] = [
  { codigo: 'FREE', nome: 'Free', precoMensal: 0, limiteEmpresas: 1, paraQuem: 'Para conhecer o sistema com uma empresa de verdade, sem cartão.' },
  { codigo: 'ESSENCIAL', nome: 'Essencial', precoMensal: 67, limiteEmpresas: 3, paraQuem: 'Para quem está começando a atender as primeiras empresas.' },
  { codigo: 'PROFISSIONAL', nome: 'Profissional', precoMensal: 127, limiteEmpresas: 10, paraQuem: 'Para a consultoria que já tem uma carteira de clientes.', destaque: true },
  { codigo: 'PREMIUM', nome: 'Premium', precoMensal: 197, limiteEmpresas: 30, paraQuem: 'Para a consultoria em crescimento, com equipe.' },
  { codigo: 'ENTERPRISE', nome: 'Enterprise', precoMensal: 397, limiteEmpresas: null, paraQuem: 'Para quem atende muitas empresas e não quer se preocupar com limite.' },
];

// Tudo o que vem em TODOS os planos. O que muda de um plano para outro é só quantas empresas clientes você atende.
export const INCLUSO_EM_TODOS: { grupo: string; itens: string[] }[] = [
  { grupo: 'Programas e laudos', itens: ['PGR, PCMSO, LTCAT, LIP e LPP em PDF com a sua logo', 'PPP, AET (ergonomia) e CAT', 'Ordem de serviço e ficha de EPI', 'Dimensionamento e eleição da CIPA'] },
  { grupo: 'Dia a dia', itens: ['APR e permissão de trabalho', 'DDS com 150 temas prontos', 'Checklists das NRs', 'Almoxarifado de EPI com entrega por reconhecimento do rosto', 'Uso em campo sem internet'] },
  { grupo: 'Pessoas e saúde', itens: ['Treinamentos das NRs com certificado e QR code', 'Prontuário de saúde, ASO e afastamentos', 'Avaliação psicossocial (NR-01)', 'SIPAT, 5S, emergência e brigada', 'Relatos pelo QR code e plano de ação'] },
  { grupo: 'Governança', itens: ['eSocial S-2210, S-2220, S-2240 e S-2230 direto ao governo', 'FAP e RAT', 'Terceirizadas, atestados e faltas', 'Importação de funcionários por planilha do RH'] },
  { grupo: 'Documentos e comercial', itens: ['Arquivo de documentos com busca dentro do PDF', 'Assinatura com o dedo, por link ou com certificado digital', 'Propostas, contratos e cobrança por Pix', 'Login para cada empresa cliente ver a própria área', 'Avisos de mudanças nas normas'] },
];

export const reais = (v: number) => (v === 0 ? 'Grátis' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }));
export const textoLimite = (n: number | null) => (n === null ? 'Empresas sem limite' : `Até ${n} empresa${n === 1 ? '' : 's'} cliente${n === 1 ? '' : 's'}`);
