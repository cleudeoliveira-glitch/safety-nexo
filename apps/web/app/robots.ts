import type { MetadataRoute } from 'next';
import { ROBOS_IA, COPIADORES } from '@/lib/robos';

// Buscadores (Google, Bing) veem só as páginas de venda. A área do sistema fica de fora.
// Robôs de IA e copiadores ficam proibidos em tudo (e são barrados de verdade no middleware).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: [...ROBOS_IA, ...COPIADORES], disallow: '/' },
      { userAgent: '*', allow: ['/$', '/planos', '/privacidade', '/termos', '/cadastro', '/entrar'], disallow: '/' },
    ],
  };
}
