import { NextResponse, type NextRequest } from 'next/server';
import { ehRoboBloqueado } from '@/lib/robos';

// Porteiro do site: roda antes de qualquer página.
// 1) Robôs de IA e programas de copiar site recebem "acesso negado" (403) e não veem nada.
// 2) Toda resposta leva o aviso "não use para treinar IA" e as páginas internas pedem para não aparecer em buscas.
const PAGINAS_DE_VENDA = /^\/($|planos|privacidade|termos|cadastro|entrar|robots\.txt)/;

export function middleware(req: NextRequest) {
  const caminho = req.nextUrl.pathname;
  const ua = req.headers.get('user-agent');

  if (caminho !== '/robots.txt' && ehRoboBloqueado(ua)) {
    return new NextResponse('Acesso negado.', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow, noarchive, noai, noimageai' },
    });
  }

  const res = NextResponse.next();
  res.headers.set(
    'X-Robots-Tag',
    PAGINAS_DE_VENDA.test(caminho) ? 'noarchive, noai, noimageai' : 'noindex, nofollow, noarchive, noai, noimageai',
  );
  return res;
}

// Arquivos internos do Next (_next), ícones e o service worker ficam de fora para o site continuar rápido.
export const config = {
  matcher: ['/((?!_next/|icone-|logo\\.png|manifest\\.webmanifest|sw\\.js|favicon).*)'],
};
