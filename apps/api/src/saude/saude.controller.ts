import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { enviarPdf } from '../documentos/documentos.controller';
import { CriarAetDto, CriarCatDto, EnvioCatDto } from './dto';
import { SaudeService } from './saude.service';

@Controller('empresas/:empresaId')
export class SaudeController {
  constructor(private readonly saude: SaudeService) {}

  @PermiteEmpresa()
  @Get('aets')
  listarAets(@ConsultoriaId() c: string, @Param('empresaId') e: string) {
    return this.saude.listarAets(c, e);
  }

  @Post('aets')
  criarAet(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: CriarAetDto) {
    return this.saude.criarAet(c, e, dto);
  }

  @PermiteEmpresa()
  @Post('aets/:id/pdf')
  async pdfAet(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Res() res: Response) {
    enviarPdf(res, await this.saude.pdfAet(c, e, id), 'AET.pdf');
  }

  // A empresa cliente pode abrir a CAT: quem fica sabendo do acidente primeiro é ela.
  @PermiteEmpresa()
  @Get('cats')
  listarCats(@ConsultoriaId() c: string, @Param('empresaId') e: string) {
    return this.saude.listarCats(c, e);
  }

  @PermiteEmpresa()
  @Post('cats')
  criarCat(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: CriarCatDto) {
    return this.saude.criarCat(c, e, dto);
  }

  @PermiteEmpresa()
  @Post('cats/:id/enviada')
  marcarEnviada(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Body() dto: EnvioCatDto) {
    return this.saude.marcarEnviada(c, e, id, dto.recibo);
  }

  @PermiteEmpresa()
  @Post('cats/:id/pdf')
  async pdfCat(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Res() res: Response) {
    enviarPdf(res, await this.saude.pdfCat(c, e, id), 'CAT.pdf');
  }
}
