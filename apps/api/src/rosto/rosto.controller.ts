import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { Publica } from '../auth/publica.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { enviarPdf } from '../documentos/documentos.controller';
import { CadastrarRostoDto, CapturaDto, EntregaRostoDto, IdentificarDto } from './dto';
import { RostoService } from './rosto.service';

const origem = (req: Request) => ({
  ip: String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.ip || null,
  aparelho: String(req.headers['user-agent'] ?? '') || null,
});

@PermiteEmpresa()
@Controller()
export class RostoController {
  constructor(private readonly rosto: RostoService) {}

  @Get('rosto/config')
  config() { return this.rosto.config(); }

  @Publica()
  @Get('validar-rosto/:codigo')
  validar(@Param('codigo') codigo: string) { return this.rosto.validar(codigo); }

  @Get('empresas/:e/rosto')
  listar(@ConsultoriaId() c: string, @Param('e') e: string) { return this.rosto.listar(c, e); }

  @Post('empresas/:e/rosto/identificar')
  identificar(@ConsultoriaId() c: string, @Param('e') e: string, @Body() dto: IdentificarDto) { return this.rosto.identificar(c, e, dto.descritor); }

  @Get('empresas/:e/colaboradores/:id/rosto')
  status(@ConsultoriaId() c: string, @Param('e') e: string, @Param('id') id: string) { return this.rosto.status(c, e, id); }

  @Put('empresas/:e/colaboradores/:id/rosto')
  cadastrar(@ConsultoriaId() c: string, @Param('e') e: string, @Param('id') id: string, @Body() dto: CadastrarRostoDto, @Req() req: Request) {
    return this.rosto.cadastrar(c, e, id, dto, origem(req));
  }

  @Delete('empresas/:e/colaboradores/:id/rosto')
  remover(@ConsultoriaId() c: string, @Param('e') e: string, @Param('id') id: string) { return this.rosto.remover(c, e, id); }

  @Post('empresas/:e/colaboradores/:id/epis/rosto')
  entregar(@ConsultoriaId() c: string, @Param('e') e: string, @Param('id') id: string, @Body() dto: EntregaRostoDto, @Req() req: Request) {
    return this.rosto.entregarEpi(c, e, id, dto, origem(req));
  }

  @Post('empresas/:e/dds/:ddsId/presenca-rosto')
  dds(@ConsultoriaId() c: string, @Param('e') e: string, @Param('ddsId') d: string, @Body() dto: CapturaDto, @Req() req: Request) {
    return this.rosto.presencaDds(c, e, d, dto, origem(req));
  }

  @Post('empresas/:e/turmas/:turmaId/presenca-rosto')
  turma(@ConsultoriaId() c: string, @Param('e') e: string, @Param('turmaId') t: string, @Body() dto: CapturaDto, @Req() req: Request) {
    return this.rosto.presencaTurma(c, e, t, dto, origem(req));
  }

  @Get('empresas/:e/presencas-faciais')
  comprovantes(@ConsultoriaId() c: string, @Param('e') e: string, @Query('tipo') tipo: string, @Query('refId') refId: string) {
    return this.rosto.comprovantes(c, e, tipo, refId);
  }

  @Post('empresas/:e/presencas-faciais/:codigo/pdf')
  async pdf(@ConsultoriaId() c: string, @Param('e') e: string, @Param('codigo') codigo: string, @Res() res: Response) {
    enviarPdf(res, await this.rosto.pdfComprovante(c, e, codigo), 'Comprovante-facial.pdf');
  }
}
