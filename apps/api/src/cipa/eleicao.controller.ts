import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { enviarPdf } from '../documentos/documentos.controller';
import { AtualizarEleicaoDto, AtualizarMembroDto, CriarEleicaoDto, CriarMembroDto } from './dto';
import { ehDocumentoEleicao, EleicaoCipaService } from './eleicao.service';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';

@Controller('empresas/:empresaId/cipa/eleicoes')
export class EleicaoCipaController {
  constructor(private readonly eleicoes: EleicaoCipaService) {}

  @PermiteEmpresa()
  @Get()
  listar(@ConsultoriaId() c: string, @Param('empresaId') e: string) {
    return this.eleicoes.listar(c, e);
  }

  @Post()
  criar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: CriarEleicaoDto) {
    return this.eleicoes.criar(c, e, dto);
  }

  @Patch(':eleicaoId')
  atualizar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('eleicaoId') id: string, @Body() dto: AtualizarEleicaoDto) {
    return this.eleicoes.atualizar(c, e, id, dto);
  }

  @Post(':eleicaoId/membros')
  adicionarMembro(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('eleicaoId') id: string, @Body() dto: CriarMembroDto) {
    return this.eleicoes.adicionarMembro(c, e, id, dto);
  }

  @Patch(':eleicaoId/membros/:membroId')
  atualizarMembro(
    @ConsultoriaId() c: string,
    @Param('empresaId') e: string,
    @Param('eleicaoId') id: string,
    @Param('membroId') membroId: string,
    @Body() dto: AtualizarMembroDto,
  ) {
    return this.eleicoes.atualizarMembro(c, e, id, membroId, dto);
  }

  @Delete(':eleicaoId/membros/:membroId')
  removerMembro(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('eleicaoId') id: string, @Param('membroId') membroId: string) {
    return this.eleicoes.removerMembro(c, e, id, membroId);
  }

  @PermiteEmpresa()
  @Post(':eleicaoId/pdf/:documento')
  async pdf(
    @ConsultoriaId() c: string,
    @Param('empresaId') e: string,
    @Param('eleicaoId') id: string,
    @Param('documento') documento: string,
    @Res() res: Response,
  ) {
    if (!ehDocumentoEleicao(documento)) throw new NotFoundException('Documento não encontrado');
    const { pdf, arquivo } = await this.eleicoes.gerarPdf(c, e, id, documento);
    enviarPdf(res, pdf, arquivo);
  }
}
