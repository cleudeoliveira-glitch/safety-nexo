import { Body, Controller, Get, Param, Post, Put, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { enviarPdf } from '../documentos/documentos.controller';
import { ColaboradoresService } from './colaboradores.service';
import { CreateAsoDto, CreateEntregaEpiDto, DesligamentoDto } from './dto';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';

@PermiteEmpresa()
@Controller('empresas/:empresaId/colaboradores/:colaboradorId')
export class ColaboradoresController {
  constructor(private readonly colaboradores: ColaboradoresService) {}

  @Get()
  detalhar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('colaboradorId') id: string) {
    return this.colaboradores.ficha(c, e, id);
  }

  @Put('desligamento')
  desligar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('colaboradorId') id: string, @Body() dto: DesligamentoDto) {
    return this.colaboradores.desligar(c, e, id, dto.data ?? null);
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

  // PDF do ASO feito pela clínica: sobe e baixa.
  @Post('asos/:asoId/arquivo')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 10_000_000 } }))
  anexarAso(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('colaboradorId') id: string, @Param('asoId') asoId: string, @UploadedFile() arquivo: Express.Multer.File | undefined) {
    return this.colaboradores.anexarAso(c, e, id, asoId, arquivo);
  }

  @Get('asos/:asoId/arquivo')
  async baixarAsoClinica(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('colaboradorId') id: string, @Param('asoId') asoId: string, @Res() res: Response) {
    const pdf = await this.colaboradores.arquivoAso(c, e, id, asoId);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="ASO-clinica.pdf"' }).send(pdf);
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
