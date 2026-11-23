import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { createHash } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import type { PrismaService } from '../prisma/prisma.service';

// Caderno de falhas do Diagnóstico (Painel ADM).
// Guarda cada erro que um cliente viu, para o dono do sistema não precisar abrir os registros do Render.
// Erros iguais (mesma origem, rota e mensagem) viram uma linha só, com a contagem de vezes.

let banco: PrismaService | null = null;
export const ligarCadernoDeFalhas = (prisma: PrismaService) => { banco = prisma; };

export type Falha = { origem: 'MOTOR' | 'TELA' | 'ASAAS' | 'EMAIL'; rota?: string | null; status?: number | null; mensagem: string; detalhe?: string | null; consultoriaId?: string | null; usuarioId?: string | null };

// Ids no meio do endereço viram ":id", para juntar o mesmo erro de clientes diferentes.
export const rotaGenerica = (rota: string) =>
  rota.split('?')[0].replace(/\/c[a-z0-9]{20,30}(?=\/|$)/g, '/:id').replace(/\/[0-9a-f-]{32,36}(?=\/|$)/gi, '/:id').replace(/\/\d+(?=\/|$)/g, '/:n').slice(0, 300);

// Nunca deixa um erro do caderno derrubar o pedido do cliente.
export function registrarFalha(f: Falha) {
  if (!banco) return;
  const mensagem = (f.mensagem || 'Erro sem mensagem').replace(/\s+/g, ' ').trim().slice(0, 1000);
  const rota = f.rota ? rotaGenerica(f.rota) : null;
  const chave = createHash('sha1').update(`${f.origem}|${rota ?? ''}|${mensagem.slice(0, 200)}`).digest('hex');
  const agora = new Date();
  const detalhe = f.detalhe ? f.detalhe.slice(0, 4000) : null;
  banco.falhaSistema
    .upsert({
      where: { chave },
      create: { chave, origem: f.origem, rota, status: f.status ?? null, mensagem, detalhe, consultoriaId: f.consultoriaId ?? null, usuarioId: f.usuarioId ?? null, ultimaEm: agora },
      update: { vezes: { increment: 1 }, ultimaEm: agora, status: f.status ?? undefined, detalhe: detalhe ?? undefined, consultoriaId: f.consultoriaId ?? undefined, usuarioId: f.usuarioId ?? undefined },
    })
    .catch(() => undefined);
}

// Pega todo erro inesperado do motor (código 500 ou mais) e anota no caderno. A resposta ao cliente continua a mesma.
@Catch()
export class FiltroDeFalhas extends BaseExceptionFilter {
  catch(erro: unknown, host: ArgumentsHost) {
    const status = erro instanceof HttpException ? erro.getStatus() : 500;
    if (status >= 500 && host.getType() === 'http') {
      const req = host.switchToHttp().getRequest<Request & { sessao?: { sub: string; consultoriaId: string } }>();
      const e = erro as Error;
      const resposta = erro instanceof HttpException ? erro.getResponse() : null;
      const mensagem = typeof resposta === 'object' && resposta && 'message' in resposta ? String((resposta as { message: unknown }).message) : e?.message ?? String(erro);
      registrarFalha({
        origem: 'MOTOR', rota: `${req.method} ${req.originalUrl ?? req.url}`, status, mensagem,
        detalhe: e?.stack ?? null, consultoriaId: req.sessao?.consultoriaId, usuarioId: req.sessao?.sub,
      });
    }
    super.catch(erro, host);
  }
}

// Anota quando o Asaas e o agendador do GitHub chamaram o motor pela última vez, e com que resultado.
// Assim o Diagnóstico sabe se o aviso de pagamento está chegando e se as tarefas diárias estão rodando.
const VIGIADAS = /^\/(pagamentos\/asaas|tarefas\/[a-z-]+)$/;
export function vigiarChamadas(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'POST' || !VIGIADAS.test(req.path)) return next();
  const caminho = req.path;
  res.on('finish', () => {
    if (!banco) return;
    const valor = JSON.stringify({ em: new Date().toISOString(), status: res.statusCode });
    const chave = `chamada:${caminho}`;
    banco.configPlataforma.upsert({ where: { chave }, create: { chave, valor }, update: { valor } }).catch(() => undefined);
    if (res.statusCode >= 400 && res.statusCode < 500) {
      // 401/503: token errado ou faltando no servidor. O filtro não pega (é menor que 500), então anota aqui.
      registrarFalha({ origem: caminho.startsWith('/pagamentos') ? 'ASAAS' : 'MOTOR', rota: `POST ${caminho}`, status: res.statusCode, mensagem: res.statusCode === 401 ? 'Recusado: o segredo/token enviado não confere com o do servidor.' : `Recusado com código ${res.statusCode}.` });
    }
  });
  next();
}
