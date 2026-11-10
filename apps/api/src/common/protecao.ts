import type { NextFunction, Request, Response } from 'express';

// Proteção do servidor sem custo e sem biblioteca extra:
// 1) cabeçalhos que mandam o navegador se proteger;
// 2) limite de pedidos por endereço (IP), mais apertado no login e nas páginas abertas.

export function cabecalhosSeguranca(_req: Request, res: Response, next: NextFunction) {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // A API só devolve dados, PDFs e imagens: nada dela deve rodar como página.
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; img-src 'self' data:; style-src 'unsafe-inline'");
  next();
}

type Regra = { nome: string; teste: (metodo: string, caminho: string) => boolean; max: number; janelaMs: number; mensagem: string };

const MIN = 60_000;
const HORA = 60 * MIN;

// A primeira regra que combinar vale. A última vale para todo o resto.
const REGRAS: Regra[] = [
  { nome: 'entrar', teste: (m, c) => m === 'POST' && c === '/auth/entrar', max: 10, janelaMs: 5 * MIN, mensagem: 'Muitas tentativas de entrar. Espere 5 minutos e tente de novo.' },
  { nome: 'cadastro', teste: (m, c) => m === 'POST' && c === '/auth/cadastro', max: 5, janelaMs: HORA, mensagem: 'Muitos cadastros seguidos deste local. Tente de novo daqui a uma hora.' },
  { nome: 'senha', teste: (m, c) => m === 'POST' && (c === '/auth/esqueci' || c === '/auth/redefinir'), max: 5, janelaMs: 15 * MIN, mensagem: 'Muitos pedidos de troca de senha. Espere 15 minutos.' },
  // Páginas abertas (sem login): portal do trabalhador, votação, relato/denúncia, questionário, assinatura, proposta.
  {
    nome: 'aberta',
    teste: (m, c) => m !== 'GET' && /^\/(portal|cipa-voto|relato|psicossocial|assinar|proposta-online)\b/.test(c),
    max: 30, janelaMs: 5 * MIN, mensagem: 'Muitos envios seguidos. Espere alguns minutos.',
  },
  { nome: 'geral', teste: () => true, max: 600, janelaMs: MIN, mensagem: 'Muitos pedidos ao mesmo tempo. Espere um minuto.' },
];

const contagem = new Map<string, number[]>();

// Limpa a memória de tempos em tempos para não crescer sem fim.
setInterval(() => {
  const agora = Date.now();
  for (const [chave, lista] of contagem) {
    const viva = lista.filter((t) => agora - t < HORA);
    if (viva.length) contagem.set(chave, viva);
    else contagem.delete(chave);
  }
}, 10 * MIN).unref();

export function limiteDePedidos(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'OPTIONS' || req.path === '/health') return next();
  const regra = REGRAS.find((r) => r.teste(req.method, req.path))!;
  const chave = `${regra.nome}:${req.ip}`;
  const agora = Date.now();
  const lista = (contagem.get(chave) ?? []).filter((t) => agora - t < regra.janelaMs);
  if (lista.length >= regra.max) {
    const espera = Math.ceil((regra.janelaMs - (agora - lista[0])) / 1000);
    res.setHeader('Retry-After', String(Math.max(espera, 1)));
    res.status(429).json({ statusCode: 429, message: regra.mensagem });
    return;
  }
  lista.push(agora);
  contagem.set(chave, lista);
  next();
}

// Trava por e-mail: depois de 8 senhas erradas em 15 minutos, aquele e-mail fica 15 minutos sem entrar,
// mesmo que a pessoa troque de internet. Some sozinha quando acerta a senha.
const errosLogin = new Map<string, number[]>();
const MAX_ERROS = 8;
const JANELA_ERROS = 15 * MIN;

export function loginTravado(email: string): boolean {
  const lista = (errosLogin.get(email) ?? []).filter((t) => Date.now() - t < JANELA_ERROS);
  errosLogin.set(email, lista);
  return lista.length >= MAX_ERROS;
}
export function registrarErroLogin(email: string) {
  errosLogin.set(email, [...(errosLogin.get(email) ?? []).filter((t) => Date.now() - t < JANELA_ERROS), Date.now()]);
}
export function limparErrosLogin(email: string) {
  errosLogin.delete(email);
}
