import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { enviarPdf } from '../documentos/documentos.controller';
import { CriarInspecaoDto } from './dto';
import { InspecoesService } from './inspecoes.service';
import { MODELOS_CHECKLIST } from './modelos';

// Checklists: a empresa cliente também faz as inspeções do dia a dia.
@PermiteEmpresa()
@Controller()
export class InspecoesController {
  constructor(private readonly inspecoes: InspecoesService) {}

  @Get('inspecoes/modelos')
  modelos() {
    return Object.entries(MODELOS_CHECKLIST).map(([modelo, m]) => ({ modelo, ...m }));
  }

  @Get('empresas/:empresaId/inspecoes')
  listar(@ConsultoriaId() c: string, @Param('empresaId') e: string) {
    return this.inspecoes.listar(c, e);
  }

  @Post('empresas/:empresaId/inspecoes')
  criar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: CriarInspecaoDto) {
    return this.inspecoes.criar(c, e, dto);
  }

  @Post('empresas/:empresaId/inspecoes/:id/pdf')
  async pdf(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Res() res: Response) {
    enviarPdf(res, await this.inspecoes.gerarPdf(c, e, id), 'Inspecao.pdf');
  }
}
