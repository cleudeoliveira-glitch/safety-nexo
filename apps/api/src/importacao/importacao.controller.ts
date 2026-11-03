import { Body, Controller, Delete, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { Sessao, SessaoUsuario } from '../common/sessao.decorator';
import { ImportarDto } from './dto';
import { ImportacaoService } from './importacao.service';

// Só a consultoria importa documentos antigos.
@Controller('empresas/:empresaId/importar-pdf')
export class ImportacaoController {
  constructor(private readonly imp: ImportacaoService) {}

  @Get('situacao') situacao() { return this.imp.situacao(); }
  @Get() listar(@ConsultoriaId() c: string, @Param('empresaId') e: string) { return this.imp.listar(c, e); }
  @Post()
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 20_000_000 } }))
  enviar(@Sessao() s: SessaoUsuario, @Param('empresaId') e: string, @UploadedFile() arquivo: Express.Multer.File | undefined) { return this.imp.enviar(s, e, arquivo); }
  @Get(':id') obter(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.imp.obter(c, e, id); }
  @Post(':id/importar') importar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Body() dto: ImportarDto) { return this.imp.importar(c, e, id, dto); }
  @Delete(':id') remover(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.imp.remover(c, e, id); }
}
