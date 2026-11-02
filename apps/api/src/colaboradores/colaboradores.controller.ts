import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { enviarPdf } from '../documentos/documentos.controller';
import { ColaboradoresService } from './colaboradores.service';
import { CreateAsoDto, CreateEntregaEpiDto } from './dto';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';

@PermiteEmpresa()
@Controller('empresas/:empresaId/colaboradores/:colaboradorId')
export class ColaboradoresController {
  constructor(private readonly colaboradores: ColaboradoresService) {}

  @Get()
  detalhar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('colaboradorId') id: string) {
    return this.colaboradores.detalhar(c, e, id);
  }

  @Post('asos')
  registrarAso(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('colaboradorId') id: string, @Body() dto: CreateAsoDto) {
    return this.colaboradores.registrarAso(c, e, id, dto);
  }

  @Post('asos/:asoId/pdf')
  async pdfAso(
    @ConsultoriaId() c: string,
    @Param('empresaId') e: string,
    @Param('colaboradorId') id: string,
    @Param('asoId') asoId: string,
    @Res() res: Response,
  ) {
    enviarPdf(res, await this.colaboradores.pdfAso(c, e, id, asoId), 'ASO.pdf');
  }

  @Post('epis')
  registrarEpi(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('colaboradorId') id: string, @Body() dto: CreateEntregaEpiDto) {
    return this.colaboradores.registrarEntregaEpi(c, e, id, dto);
  }

  @Post('ficha-epi')
  async fichaEpi(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('colaboradorId') id: string, @Res() res: Response) {
    enviarPdf(res, await this.colaboradores.pdfFichaEpi(c, e, id), 'Ficha-EPI.pdf');
  }

  @Post('ppp')
  async pdfPpp(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('colaboradorId') id: string, @Res() res: Response) {
    enviarPdf(res, await this.colaboradores.pdfPpp(c, e, id), 'PPP.pdf');
  }
}
