import { Body, Controller, Delete, Get, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { Publica } from '../auth/publica.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { enviarPdf } from '../documentos/documentos.controller';
import { CriarTurmaDto, ParticipantesDto } from './dto';
import { TreinamentosService } from './treinamentos.service';

@Controller()
export class TreinamentosController {
  constructor(private readonly treinamentos: TreinamentosService) {}

  @Get('treinamentos/catalogo')
  catalogo() {
    return this.treinamentos.catalogo();
  }

  @Publica()
  @Get('validar/:codigo')
  validar(@Param('codigo') codigo: string) {
    return this.treinamentos.validar(codigo);
  }

  @Get('empresas/:empresaId/turmas')
  listar(@ConsultoriaId() c: string, @Param('empresaId') e: string) {
    return this.treinamentos.listar(c, e);
  }

  @Post('empresas/:empresaId/turmas')
  criar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: CriarTurmaDto) {
    return this.treinamentos.criar(c, e, dto);
  }

  @Post('empresas/:empresaId/turmas/:turmaId/participantes')
  adicionar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('turmaId') t: string, @Body() dto: ParticipantesDto) {
    return this.treinamentos.adicionarParticipantes(c, e, t, dto.colaboradorIds);
  }

  @Delete('empresas/:empresaId/turmas/:turmaId/participantes/:id')
  remover(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('turmaId') t: string, @Param('id') id: string) {
    return this.treinamentos.removerParticipante(c, e, t, id);
  }

  @Post('empresas/:empresaId/turmas/:turmaId/lista')
  async lista(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('turmaId') t: string, @Res() res: Response) {
    enviarPdf(res, await this.treinamentos.gerarPdf(c, e, t, 'lista'), 'Lista-de-presenca.pdf');
  }

  @Post('empresas/:empresaId/turmas/:turmaId/certificados')
  async certificados(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('turmaId') t: string, @Res() res: Response) {
    enviarPdf(res, await this.treinamentos.gerarPdf(c, e, t, 'certificados'), 'Certificados.pdf');
  }
}
