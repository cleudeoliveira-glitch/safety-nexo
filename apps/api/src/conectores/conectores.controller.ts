import { Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { Sessao, SessaoUsuario } from '../common/sessao.decorator';

// LGPD (dado de saúde) e sigilo médico: o login da empresa cliente lança o atestado, mas não vê o CID.
// A consultoria continua vendo, para o aviso do INSS e o ranking de doenças.
const semCid = <T extends { cid: string | null }>(x: T): T => ({ ...x, cid: null });
import { ConsultoriaId } from '../common/consultoria.decorator';
import { TIPOS_ATESTADO } from './absenteismo';
import { DOCUMENTOS_TERCEIRO, ConectoresService } from './conectores.service';
import { AtestadoDto, JornadaDto, TerceiroDocumentoDto, TerceiroDto, TerceiroTrabalhadorDto } from './dto';

const PLANILHA = FileInterceptor('arquivo', { limits: { fileSize: 5_000_000 } });
const anoDe = (a?: string) => (a && /^\d{4}$/.test(a) ? Number(a) : new Date().getUTCFullYear());

// O RH da empresa cliente também usa: importa funcionários, lança atestados e controla os terceiros.
@PermiteEmpresa()
@Controller('empresas/:empresaId')
export class ConectoresController {
  constructor(private readonly conectores: ConectoresService) {}

  @Post('colaboradores/importar/previa')
  @UseInterceptors(PLANILHA)
  previa(@ConsultoriaId() c: string, @Param('empresaId') e: string, @UploadedFile() arquivo?: Express.Multer.File) {
    return this.conectores.previaImportacao(c, e, arquivo);
  }

  @Post('colaboradores/importar')
  @UseInterceptors(PLANILHA)
  importar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @UploadedFile() arquivo?: Express.Multer.File) {
    return this.conectores.importar(c, e, arquivo);
  }

  @Get('terceiros/documentos-sugeridos')
  documentosSugeridos() { return DOCUMENTOS_TERCEIRO; }

  @Get('terceiros')
  terceiros(@ConsultoriaId() c: string, @Param('empresaId') e: string) { return this.conectores.listarTerceiros(c, e); }

  @Post('terceiros')
  criarTerceiro(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: TerceiroDto) { return this.conectores.salvarTerceiro(c, e, dto); }

  @Put('terceiros/:id')
  alterarTerceiro(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Body() dto: TerceiroDto) { return this.conectores.salvarTerceiro(c, e, dto, id); }

  @Delete('terceiros/:id')
  removerTerceiro(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.conectores.removerTerceiro(c, e, id); }

  @Post('terceiros/:id/documentos')
  documento(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Body() dto: TerceiroDocumentoDto) { return this.conectores.adicionarDocumento(c, e, id, dto); }

  @Delete('terceiros/:id/documentos/:docId')
  removerDocumento(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Param('docId') d: string) { return this.conectores.removerDocumento(c, e, id, d); }

  @Post('terceiros/:id/trabalhadores')
  trabalhador(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Body() dto: TerceiroTrabalhadorDto) { return this.conectores.salvarTrabalhador(c, e, id, dto); }

  @Put('terceiros/:id/trabalhadores/:trabId')
  alterarTrabalhador(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Param('trabId') t: string, @Body() dto: TerceiroTrabalhadorDto) { return this.conectores.salvarTrabalhador(c, e, id, dto, t); }

  @Delete('terceiros/:id/trabalhadores/:trabId')
  removerTrabalhador(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Param('trabId') t: string) { return this.conectores.removerTrabalhador(c, e, id, t); }

  @Get('atestados/tipos')
  tipos() { return TIPOS_ATESTADO; }

  @Get('atestados')
  atestados(@ConsultoriaId() c: string, @Sessao() s: SessaoUsuario, @Param('empresaId') e: string, @Query('ano') ano?: string) {
    return this.conectores.listarAtestados(c, e, anoDe(ano)).then((l) => (s.papel === 'EMPRESA' ? l.map(semCid) : l));
  }

  @Post('atestados')
  criarAtestado(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: AtestadoDto) { return this.conectores.criarAtestado(c, e, dto); }

  @Delete('atestados/:id')
  removerAtestado(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.conectores.removerAtestado(c, e, id); }

  @Get('absenteismo')
  absenteismo(@ConsultoriaId() c: string, @Sessao() s: SessaoUsuario, @Param('empresaId') e: string, @Query('ano') ano?: string) {
    return this.conectores.absenteismo(c, e, anoDe(ano)).then((r) =>
      s.papel === 'EMPRESA' ? { ...r, porCid: [], alertasInss: r.alertasInss.map(semCid) } : r,
    );
  }

  @Put('absenteismo/jornada')
  jornada(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: JornadaDto) { return this.conectores.salvarJornada(c, e, dto.jornadaDiariaHoras); }
}
