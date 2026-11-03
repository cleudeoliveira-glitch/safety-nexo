import { Body, Controller, Delete, Get, Param, Post, Put, Res } from '@nestjs/common';
import { Response } from 'express';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { enviarPdf } from '../documentos/documentos.controller';
import { ESCALA_5S, SENSOS } from './cinco-s';
import { CulturaService } from './cultura.service';
import { AtividadeDto, Auditoria5sDto, PresencaDto, SipatDto } from './dto';

// A CIPA da empresa cliente também organiza a SIPAT e faz as auditorias 5S.
@PermiteEmpresa()
@Controller('empresas/:empresaId')
export class CulturaController {
  constructor(private readonly cultura: CulturaService) {}

  @Get('sipat') listar(@ConsultoriaId() c: string, @Param('empresaId') e: string) { return this.cultura.listarSipats(c, e); }
  @Post('sipat') criar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: SipatDto) { return this.cultura.criarSipat(c, e, dto); }
  @Delete('sipat/:id') remover(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.cultura.removerSipat(c, e, id); }
  @Post('sipat/:id/atividades') atividade(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Body() dto: AtividadeDto) { return this.cultura.criarAtividade(c, e, id, dto); }
  @Delete('sipat/:id/atividades/:ativId') removerAtividade(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Param('ativId') a: string) { return this.cultura.removerAtividade(c, e, id, a); }
  @Put('sipat/:id/atividades/:ativId/presenca') presenca(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Param('ativId') a: string, @Body() dto: PresencaDto) { return this.cultura.presenca(c, e, id, a, dto.presentes); }
  @Post('sipat/:id/programacao') async programacao(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Res() res: Response) { enviarPdf(res, await this.cultura.pdfProgramacao(c, e, id), 'SIPAT-programacao.pdf'); }
  @Post('sipat/:id/atividades/:ativId/lista') async lista(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Param('ativId') a: string, @Res() res: Response) { enviarPdf(res, await this.cultura.pdfPresenca(c, e, id, a), 'SIPAT-Lista-de-presenca.pdf'); }
  @Post('sipat/:id/relatorio') async relatorio(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Res() res: Response) { enviarPdf(res, await this.cultura.pdfRelatorio(c, e, id), 'SIPAT-relatorio.pdf'); }

  @Get('5s/checklist') checklist() { return { escala: ESCALA_5S, sensos: SENSOS }; }
  @Get('5s') listar5s(@ConsultoriaId() c: string, @Param('empresaId') e: string) { return this.cultura.listar5s(c, e); }
  @Post('5s') criar5s(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: Auditoria5sDto) { return this.cultura.criar5s(c, e, dto); }
  @Delete('5s/:id') remover5s(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.cultura.remover5s(c, e, id); }
  @Post('5s/:id/pdf') async pdf5s(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Res() res: Response) { enviarPdf(res, await this.cultura.pdf5s(c, e, id), 'Auditoria-5S.pdf'); }
}
