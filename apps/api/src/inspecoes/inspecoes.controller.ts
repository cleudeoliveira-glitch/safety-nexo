import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Res, SetMetadata, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { PERMITE_EMPRESA, PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { enviarPdf } from '../documentos/documentos.controller';
import { CriarInspecaoDto, FotosInspecaoDto, ProximaInspecaoDto } from './dto';
import { InspecoesService, MAX_FOTOS } from './inspecoes.service';
import { MODELOS_CHECKLIST } from './modelos';

// Checklists: a empresa cliente também faz as inspeções do dia a dia (com fotos).
// A análise da IA tem custo: só a consultoria pede.
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

  @Put('empresas/:empresaId/inspecoes/:id/proxima')
  proxima(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Body() dto: ProximaInspecaoDto) {
    return this.inspecoes.definirProxima(c, e, id, dto.data);
  }

  @Post('empresas/:empresaId/inspecoes/:id/fotos')
  @UseInterceptors(FilesInterceptor('fotos', MAX_FOTOS, { limits: { fileSize: 5_000_000 } }))
  fotos(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @UploadedFiles() arquivos: Express.Multer.File[], @Body() dto: FotosInspecaoDto) {
    return this.inspecoes.enviarFotos(c, e, id, arquivos, dto.legendas);
  }

  @Get('empresas/:empresaId/inspecoes/:id/fotos/:n')
  async foto(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Param('n', ParseIntPipe) n: number, @Res() res: Response) {
    const f = await this.inspecoes.foto(c, e, id, n);
    res.setHeader('Content-Type', f.tipo);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(f.dados);
  }

  @Delete('empresas/:empresaId/inspecoes/:id/fotos/:n')
  removerFoto(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Param('n', ParseIntPipe) n: number) {
    return this.inspecoes.removerFoto(c, e, id, n);
  }

  @Post('empresas/:empresaId/inspecoes/:id/ia')
  @SetMetadata(PERMITE_EMPRESA, false)
  ia(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) {
    return this.inspecoes.analisarComIa(c, e, id);
  }

  @Post('empresas/:empresaId/inspecoes/:id/pdf')
  async pdf(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Res() res: Response) {
    enviarPdf(res, await this.inspecoes.gerarPdf(c, e, id), 'Inspecao.pdf');
  }
}
