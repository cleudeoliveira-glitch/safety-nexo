import { Body, Controller, Delete, Get, Param, Post, Put, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { EsocialService } from './esocial.service';
import { tabelasParaTela } from './codigos';

// eSocial: só a consultoria (dona do certificado) transmite.
@Controller()
export class EsocialController {
  constructor(private readonly esocial: EsocialService) {}

  // Tabelas oficiais do eSocial (13, 14, 15, 17, 24 e 27) para as listas da tela.
  @Get('esocial/tabelas')
  tabelas() {
    return tabelasParaTela();
  }

  @Get('esocial/certificado')
  certificado(@ConsultoriaId() c: string) {
    return this.esocial.certificado(c);
  }

  @Put('esocial/certificado')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 50_000 } }))
  salvar(@ConsultoriaId() c: string, @UploadedFile() arquivo: Express.Multer.File | undefined, @Body('senha') senha?: string) {
    return this.esocial.salvarCertificado(c, arquivo, senha);
  }

  @Delete('esocial/certificado')
  remover(@ConsultoriaId() c: string) {
    return this.esocial.removerCertificado(c);
  }

  @Get('empresas/:empresaId/esocial/eventos')
  listar(@ConsultoriaId() c: string, @Param('empresaId') e: string) {
    return this.esocial.listar(c, e);
  }

  @Get('empresas/:empresaId/esocial/eventos/:id/xml')
  async xml(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Res() res: Response) {
    const ev = await this.esocial.xml(c, e, id);
    res.set({ 'Content-Type': 'application/xml', 'Content-Disposition': `attachment; filename="${ev.tipo}-${ev.idEvento}.xml"` });
    res.end(ev.xml);
  }

  @Get('empresas/:empresaId/esocial/origens')
  origens(@ConsultoriaId() c: string, @Param('empresaId') e: string) {
    return this.esocial.origens(c, e);
  }

  @Post('empresas/:empresaId/esocial/s2220/:asoId')
  s2220(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('asoId') id: string, @Body('retificar') r?: boolean) {
    return this.esocial.gerarS2220(c, e, id, r === true);
  }

  @Post('empresas/:empresaId/esocial/s2240/:colaboradorId')
  s2240(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('colaboradorId') id: string, @Body('inicio') inicio?: string, @Body('retificar') r?: boolean) {
    return this.esocial.gerarS2240(c, e, id, inicio, r === true);
  }

  @Post('empresas/:empresaId/esocial/s2230/:afastamentoId')
  s2230(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('afastamentoId') id: string, @Body('retificar') r?: boolean) {
    return this.esocial.gerarS2230(c, e, id, r === true);
  }

  @Post('empresas/:empresaId/esocial/s2210/:catId')
  s2210(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('catId') id: string, @Body('retificar') r?: boolean) {
    return this.esocial.gerarS2210(c, e, id, r === true);
  }

  @Post('empresas/:empresaId/esocial/enviar')
  enviar(@ConsultoriaId() c: string, @Param('empresaId') e: string) {
    return this.esocial.enviarPendentes(c, e);
  }

  @Post('empresas/:empresaId/esocial/consultar')
  consultar(@ConsultoriaId() c: string, @Param('empresaId') e: string) {
    return this.esocial.consultarEnviados(c, e);
  }
}
