import { Body, Controller, Get, Param, Post, Put, Res } from '@nestjs/common';
import { Response } from 'express';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { enviarPdf } from '../documentos/documentos.controller';
import { CipaService } from './cipa.service';
import { CipaDto } from './dto';

@Controller('empresas/:empresaId/cipa')
export class CipaController {
  constructor(private readonly cipa: CipaService) {}

  @Get()
  situacao(@ConsultoriaId() c: string, @Param('empresaId') e: string) {
    return this.cipa.situacao(c, e);
  }

  @Put()
  salvar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: CipaDto) {
    return this.cipa.salvar(c, e, dto);
  }

  @Post('pdf')
  async pdf(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Res() res: Response) {
    enviarPdf(res, await this.cipa.gerarPdf(c, e), 'Dimensionamento-CIPA.pdf');
  }
}
