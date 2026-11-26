import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { createHash } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import type { PrismaService } from '../prisma/prisma.service';
import type { PushService } from '../push/push';
import { ERRO_INTERNO, mensagemEmPortugues, rotuloDoErro } from '../common/erros-pt';

// Caderno de falhas do Diagnóstico (Painel ADM).
// Guarda cada erro que um cliente viu, para o dono do sistema não precisar abrir os registros do Render.
// Erros iguais (mesma origem, rota e mensagem) viram uma linha só, com a contagem de vezes.

let banco: PrismaService | null = null;
let aviso: PushService | null = null;
export const ligarCadernoDeFalhas = (prisma: PrismaService, push?: PushService) => { banco = prisma; aviso = push ?? null; };

// Erro novo (que ainda não estava no caderno) vira aviso no celular do dono.
// No máximo 6 avisos de erro por hora, para uma pane grande não encher o celular: o resto fica no Diagnóstico.
const ONDE: Record<Falha['origem'], string> = { MOTOR: 'no sistema', TELA: 'numa tela', ASAAS: 'no pagamento (Asaas)', EMAIL: 'no envio de e-mail' };
let avisosNaHora: number[] = [];
function avisarErroNovo(f: Falha & { mensagem: string }, rota: string | null) {
  if (!aviso || !banco) return;
  const agora = Date.now();
  avisosNaHora = avisosNaHora.filter((t) => agora - t < 3600_000);
  if (avisosNaHora.length >= 6) return;
  avisosNaHora.push(agora);
  const push = aviso;
  const nomeCliente = f.consultoriaId
    ? banco.consultoria.findUnique({ where: { id: f.consultoriaId }, select: { nome: true } }).then((c) => c?.nome ?? null).catch(() => null)
    : Promise.resolve(null);
  nomeCliente.then((cliente) => push.avisarAdmins({
    titulo: `Erro novo ${ONDE[f.origem]}`,
    corpo: `${cliente ? `${cliente} viu um erro` : 'Apareceu um erro'}${rota ? ` em ${rota}` : ''}: "${f.mensagem.slice(0, 110)}". Veja no Diagnóstico.`,
    url: '/admin/diagnostico', tag: `erro-${agora}`,
  }, 'erro'));
}

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
    .then((r) => { if (r.vezes === 1) avisarErroNovo({ ...f, mensagem }, rota); })
    .catch(() => undefined);
}

// Pega todo erro do motor: o inesperado (código 500 ou mais) vai para o caderno, e toda resposta de erro
// sai em português (ver common/erros-pt.ts), mesmo as que o Nest e o Express escrevem em inglês.
@Catch()
export class FiltroDeFalhas extends BaseExceptionFilter {
  catch(erro: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') return super.catch(erro, host);
    const http = host.switchToHttp();
    const req = http.getRequest<Request & { sessao?: { sub: string; consultoriaId: string } }>();
    const res = http.getResponse<Response>();
    const ehHttp = erro instanceof HttpException;
    // Erros do envio de arquivos e do Express trazem o código em "status" (ex.: 413 quando o JSON é grande demais).
    const statusSolto = !ehHttp && typeof (erro as { status?: unknown })?.status === 'number' ? (erro as { status: number }).status : null;
    const status = ehHttp ? erro.getStatus() : statusSolto && statusSolto >= 400 && statusSolto < 600 ? statusSolto : 500;
    const resposta = ehHttp ? erro.getResponse() : null;
    const original = typeof resposta === 'object' && resposta && 'message' in resposta ? (resposta as { message: unknown }).message : typeof resposta === 'string' ? resposta : (erro as Error)?.message;
    if (status >= 500) {
      const e = erro as Error;
      registrarFalha({
        origem: 'MOTOR', rota: `${req.method} ${req.originalUrl ?? req.url}`, status, mensagem: Array.isArray(original) ? original.join('; ') : String(original ?? e?.message ?? erro),
        detalhe: e?.stack ?? null, consultoriaId: req.sessao?.consultoriaId, usuarioId: req.sessao?.sub,
      });
    }
    // Erro que não foi preparado para o cliente (falha de banco, de rede, de código): nunca mostra o texto técnico.
    const message = ehHttp || statusSolto ? mensagemEmPortugues(status, original) : ERRO_INTERNO;
    if (res.headersSent) return;
    const extra = typeof resposta === 'object' && resposta ? Object.fromEntries(Object.entries(resposta).filter(([k]) => !['message', 'error', 'statusCode'].includes(k))) : {};
    res.status(status).json({ ...extra, statusCode: status, message, error: rotuloDoErro(status) });
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
