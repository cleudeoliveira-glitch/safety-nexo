import { Body, Controller, Delete, Get, Param, Post, Put, Res } from '@nestjs/common';
import { Response } from 'express';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { enviarPdf } from '../documentos/documentos.controller';
import { FapRatDto } from './dto';
import { FapService } from './fap.service';

@PermiteEmpresa()
@Controller('empresas/:empresaId/fap')
export class FapController {
  constructor(private readonly fap: FapService) {}

  @Get() listar(@ConsultoriaId() c: string, @Param('empresaId') e: string) { return this.fap.listar(c, e); }
  @Put() salvar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: FapRatDto) { return this.fap.salvar(c, e, dto); }
  @Delete(':id') remover(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.fap.remover(c, e, id); }
  @Post('relatorio') async relatorio(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Res() res: Response) { enviarPdf(res, await this.fap.relatorio(c, e), 'FAP-RAT.pdf'); }
}
