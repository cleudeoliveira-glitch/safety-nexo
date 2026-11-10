// Quem responde pelo Safety Nexo nos textos legais (privacidade e termos).
// Os valores vêm das variáveis do Netlify; sem elas, aparecem os padrões abaixo.
export const PLATAFORMA = {
  nome: process.env.NEXT_PUBLIC_PLATAFORMA_RAZAO_SOCIAL ?? 'Safety Nexo',
  documento: process.env.NEXT_PUBLIC_PLATAFORMA_DOCUMENTO ?? '', // CNPJ ou CPF de quem explora o serviço
  cidade: process.env.NEXT_PUBLIC_PLATAFORMA_CIDADE ?? '',
  encarregado: process.env.NEXT_PUBLIC_ENCARREGADO_NOME ?? '',
  emailPrivacidade: process.env.NEXT_PUBLIC_EMAIL_PRIVACIDADE ?? '',
  whatsapp: (process.env.NEXT_PUBLIC_WHATSAPP_SUPORTE ?? '5562994343838').replace(/\D/g, ''),
  versaoTermos: '2026-11-10',
};

export const contatoPrivacidade = () =>
  PLATAFORMA.emailPrivacidade || `WhatsApp (${PLATAFORMA.whatsapp.slice(2, 4)}) ${PLATAFORMA.whatsapp.slice(4, 9)}-${PLATAFORMA.whatsapp.slice(9)}`;
