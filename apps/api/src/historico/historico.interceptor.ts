import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { descreverAcao } from './acoes';

// Grava no histórico toda alteração feita com sucesso por um usuário logado. Não guarda o conteúdo enviado
// (pode ter senha ou certificado): só quem, o quê, em qual empresa e quando.
@Injectable()
export class HistoricoInterceptor implements NestInterceptor {
  private readonly log = new Logger('Historico');
  constructor(private readonly prisma: PrismaService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    const metodo: string = req.method;
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(metodo)) return next.handle();
    return next.handle().pipe(tap(() => {
      const sessao = req.sessao;
      if (!sessao?.sub) return; // cadastro, entrar e rotas públicas ficam de fora
      if (req.headers?.['x-previa'] === '1') return; // pré-visualização não é emissão
      const rota: string = `${req.baseUrl ?? ''}${req.route?.path ?? req.path}`;
      if (!descreverAcao(metodo, rota)) return; // consultas feitas por POST (ex.: prévia da importação)
      this.gravar(sessao, metodo, rota, /\/empresas\/:empresaId\/excluir$/.test(rota) ? null : req.params?.empresaId ?? null) // empresa excluída não pode ficar ligada ao registro.catch((e) => this.log.warn(`não gravou o histórico: ${e.message}`));
    }));
  }

  private async gravar(sessao: { sub: string; consultoriaId: string; papel: string }, metodo: string, rota: string, empresaId: string | null) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: sessao.sub }, select: { nome: true } });
    await this.prisma.historico.create({
      data: { consultoriaId: sessao.consultoriaId, empresaId, usuarioId: sessao.sub, usuarioNome: usuario?.nome ?? '—', papel: sessao.papel, acao: descreverAcao(metodo, rota), metodo, rota },
    });
  }
}
