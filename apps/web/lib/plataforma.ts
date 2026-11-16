// Quem responde pelo Safety Nexo nos textos legais (privacidade e termos).
// As variáveis do Netlify têm prioridade; sem elas, valem os dados abaixo (informados pelo Rodrigo em 2026-11-10).
// O CPF vai mascarado de propósito: a página é pública.
export const PLATAFORMA = {
  nome: process.env.NEXT_PUBLIC_PLATAFORMA_RAZAO_SOCIAL ?? 'Cleude de Oliveira Silva Soares',
  documento: process.env.NEXT_PUBLIC_PLATAFORMA_DOCUMENTO ?? 'CPF 978.***.***-87', // CNPJ ou CPF de quem explora o serviço
  cidade: process.env.NEXT_PUBLIC_PLATAFORMA_CIDADE ?? '',
  encarregado: process.env.NEXT_PUBLIC_ENCARREGADO_NOME ?? 'Cleude de Oliveira Silva Soares',
  emailPrivacidade: process.env.NEXT_PUBLIC_EMAIL_PRIVACIDADE ?? 'cleude.oliveira@gmail.com',
  whatsapp: (process.env.NEXT_PUBLIC_WHATSAPP_SUPORTE ?? '5562994343838').replace(/\D/g, ''),
  versaoTermos: '2026-11-10',
};

export const contatoPrivacidade = () =>
  PLATAFORMA.emailPrivacidade || `WhatsApp (${PLATAFORMA.whatsapp.slice(2, 4)}) ${PLATAFORMA.whatsapp.slice(4, 9)}-${PLATAFORMA.whatsapp.slice(9)}`;
