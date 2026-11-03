import { Body, Controller, Delete, Get, Param, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { Sessao, SessaoUsuario } from '../common/sessao.decorator';
import { ArquivoService } from './arquivo.service';

@PermiteEmpresa()
@Controller('empresas/:empresaId/arquivo')
export class ArquivoController {
  constructor(private readonly arquivo: ArquivoService) {}

  @Get()
  listar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Query('busca') busca?: string) {
    return this.arquivo.listar(c, e, busca);
  }

  @Post()
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 20_000_000 } }))
  enviar(@Sessao() s: SessaoUsuario, @Param('empresaId') e: string, @UploadedFile() arquivo: Express.Multer.File | undefined,
    @Body() corpo: { titulo?: string; categoria?: string; descricao?: string; versaoDe?: string }) {
    return this.arquivo.enviar(s, e, arquivo, corpo);
  }

  @Get(':id/baixar')
  async baixar(@Sessao() s: SessaoUsuario, @Param('empresaId') e: string, @Param('id') id: string, @Res() res: Response) {
    const { arquivo, conteudo } = await this.arquivo.baixar(s, e, id);
    res.set({ 'Content-Type': arquivo.mime, 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(arquivo.nomeArquivo)}` });
    res.end(conteudo);
  }

  @Get(':id/acessos')
  acessos(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) {
    return this.arquivo.acessos(c, e, id);
  }

  @Delete(':id')
  remover(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) {
    return this.arquivo.remover(c, e, id);
  }
}
