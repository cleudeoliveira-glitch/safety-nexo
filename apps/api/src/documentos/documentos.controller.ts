import { BadRequestException, Controller, ForbiddenException, Param, ParseIntPipe, Post, Res } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mensagemUpgrade, planoAtual, Recurso, temRecurso } from '../common/plano';
import { Response } from 'express';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { LtcatService } from './ltcat.service';
import { PcmsoService } from './pcmso.service';
import { PgrService } from './pgr.service';

@Controller('empresas/:empresaId/documentos')
export class DocumentosController {
  constructor(
    private readonly pgr: PgrService,
    private readonly pcmso: PcmsoService,
    private readonly ltcat: LtcatService,
    private readonly prisma: PrismaService,
  ) {}

  @Recurso('documentos', 'O LTCAT')
  @Post('ltcat')
  async gerarLtcat(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string, @Res() res: Response) {
    const { pdf, versao } = await this.ltcat.gerarPdf(consultoriaId, empresaId);
    enviarPdf(res, pdf, `LTCAT-v${versao}.pdf`);
  }

  @Post('pgr')
  async gerarPgr(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string, @Res() res: Response) {
    // Grátis: 1 PGR para testar (com marca d'água).
    if (!temRecurso(planoAtual(), 'documentos') && (await this.prisma.documento.count({ where: { empresaId, tipo: 'PGR' } })) >= 1) {
      throw new ForbiddenException(mensagemUpgrade('documentos', 'Gerar mais de um PGR'));
    }
    const { pdf, versao } = await this.pgr.gerarPdf(consultoriaId, empresaId);
    enviarPdf(res, pdf, `PGR-v${versao}.pdf`);
  }

  @Recurso('documentos', 'O PCMSO')
  @Post('pcmso')
  async gerarPcmso(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string, @Res() res: Response) {
    const { pdf, versao } = await this.pcmso.gerarPdf(consultoriaId, empresaId);
    enviarPdf(res, pdf, `PCMSO-v${versao}.pdf`);
  }

  @Recurso('documentos', 'O relatório analítico do PCMSO')
  @Post('pcmso/relatorio/:ano')
  async relatorioPcmso(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('ano', ParseIntPipe) ano: number, @Res() res: Response) {
    if (ano < 2000 || ano > new Date().getFullYear()) throw new BadRequestException('Ano inválido.');
    enviarPdf(res, await this.pcmso.relatorioAnalitico(c, e, ano), `Relatorio-analitico-PCMSO-${ano}.pdf`);
  }
}

export function enviarPdf(res: Response, pdf: Buffer, nome: string) {
  res.locals.arquivoPdf = { pdf, nome }; // o ArquivoInterceptor guarda uma cópia no arquivo da empresa
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${nome}"` });
  res.end(pdf);
}
