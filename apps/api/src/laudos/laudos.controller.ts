import { Controller, Get, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { enviarPdf } from '../documentos/documentos.controller';
import { ANEXOS_NR15, ANEXOS_NR16, GRAUS } from './conteudo';
import { LaudosService } from './laudos.service';

@Controller()
export class LaudosController {
  constructor(private readonly laudos: LaudosService) {}

  @PermiteEmpresa()
  @Get('laudos/anexos')
  anexos() {
    return { nr15: ANEXOS_NR15, nr16: ANEXOS_NR16, graus: GRAUS };
  }

  @Post('empresas/:empresaId/documentos/lip')
  async lip(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Res() res: Response) {
    const { pdf, versao } = await this.laudos.laudo(c, e, 'LIP');
    enviarPdf(res, pdf, `LIP-v${versao}.pdf`);
  }

  @Post('empresas/:empresaId/documentos/lpp')
  async lpp(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Res() res: Response) {
    const { pdf, versao } = await this.laudos.laudo(c, e, 'LPP');
    enviarPdf(res, pdf, `LPP-v${versao}.pdf`);
  }

  @Post('empresas/:empresaId/documentos/pgrtr')
  async pgrtr(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Res() res: Response) {
    const { pdf, versao } = await this.laudos.pgrtr(c, e);
    enviarPdf(res, pdf, `PGRTR-v${versao}.pdf`);
  }

  // A empresa cliente também entrega a OS aos novos funcionários.
  @PermiteEmpresa()
  @Post('empresas/:empresaId/documentos/os')
  async osTodos(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Res() res: Response) {
    enviarPdf(res, await this.laudos.ordemServico(c, e), 'Ordens-de-servico.pdf');
  }

  @PermiteEmpresa()
  @Post('empresas/:empresaId/colaboradores/:colaboradorId/os')
  async os(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('colaboradorId') id: string, @Res() res: Response) {
    enviarPdf(res, await this.laudos.ordemServico(c, e, id), 'Ordem-de-servico.pdf');
  }
}
