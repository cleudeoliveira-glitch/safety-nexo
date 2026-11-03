import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { ArquivoService } from './arquivo.service';

// Todo PDF de uma empresa que sai pelo enviarPdf() é guardado no arquivo de documentos, com versão.
@Injectable()
export class ArquivoInterceptor implements NestInterceptor {
  private readonly log = new Logger('Arquivo');
  constructor(private readonly arquivo: ArquivoService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();
    return next.handle().pipe(tap(() => {
      const pdf = res.locals?.arquivoPdf as { pdf: Buffer; nome: string } | undefined;
      const empresaId = req.params?.empresaId;
      if (!pdf || !empresaId || !req.sessao?.sub) return;
      const rota = String(req.originalUrl ?? req.url).split('?')[0];
      this.arquivo.guardarGerado(req.sessao, empresaId, rota, pdf.nome, pdf.pdf, req.params?.colaboradorId)
        .catch((e) => this.log.warn(`não guardou ${pdf.nome}: ${e.message}`));
    }));
  }
}
