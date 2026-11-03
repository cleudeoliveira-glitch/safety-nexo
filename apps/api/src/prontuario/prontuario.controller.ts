import { Body, Controller, Delete, Get, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { FREQUENCIAS } from './audiometria';
import { RegistroSaudeDto } from './dto';
import { ProntuarioService } from './prontuario.service';

// Dados de saúde: só a consultoria vê. O PDF não vai para o arquivo de documentos, que a empresa cliente também abre.
@Controller('empresas/:empresaId/prontuario')
export class ProntuarioController {
  constructor(private readonly p: ProntuarioService) {}

  @Get('frequencias') frequencias() { return FREQUENCIAS; }
  @Get() listar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Query('colaboradorId') col?: string) { return this.p.listar(c, e, col); }
  @Post() criar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: RegistroSaudeDto) { return this.p.criar(c, e, dto); }
  @Delete(':id') remover(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.p.remover(c, e, id); }
  @Post('pdf/:colaboradorId') async pdf(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('colaboradorId') col: string, @Res() res: Response) {
    const { pdf, nome } = await this.p.pdfProntuario(c, e, col);
    const arquivo = `Prontuario-${nome.normalize('NFD').replace(/[^\w ]/g, '').trim().replace(/\s+/g, '-')}.pdf`;
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${arquivo}"`, 'Cache-Control': 'no-store' });
    res.end(pdf);
  }
}
