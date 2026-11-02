import { Body, Controller, Delete, Get, Param, Post, Put, Res } from '@nestjs/common';
import { Response } from 'express';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { enviarPdf } from '../documentos/documentos.controller';
import { ConfigEmergenciaDto, ControleDto } from './dto';
import { EmergenciaService } from './emergencia.service';
import { CARGA_HORARIA, TABELA_A1 } from './it17';

@Controller()
export class EmergenciaController {
  constructor(private readonly emergencia: EmergenciaService) {}

  @PermiteEmpresa()
  @Get('emergencia/tabela')
  tabela() {
    return { divisoes: TABELA_A1.map(({ divisao, descricao, risco }) => ({ divisao, descricao, risco })), cargaHoraria: CARGA_HORARIA };
  }

  @PermiteEmpresa()
  @Get('empresas/:empresaId/emergencia')
  situacao(@ConsultoriaId() c: string, @Param('empresaId') e: string) {
    return this.emergencia.situacao(c, e);
  }

  @Put('empresas/:empresaId/emergencia')
  salvar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: ConfigEmergenciaDto) {
    return this.emergencia.salvarConfig(c, e, dto);
  }

  // A empresa cliente também mantém extintores e validades em dia.
  @PermiteEmpresa()
  @Post('empresas/:empresaId/emergencia/controles')
  criar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: ControleDto) {
    return this.emergencia.criarControle(c, e, dto);
  }

  @PermiteEmpresa()
  @Delete('empresas/:empresaId/emergencia/controles/:id')
  remover(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) {
    return this.emergencia.removerControle(c, e, id);
  }

  @PermiteEmpresa()
  @Post('empresas/:empresaId/emergencia/plano')
  async plano(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Res() res: Response) {
    enviarPdf(res, await this.emergencia.plano(c, e), 'Plano-de-emergencia.pdf');
  }
}
