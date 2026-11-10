import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { enviarPdf } from '../documentos/documentos.controller';
import { CriarAprDto, CriarDdsDto, CriarPermissaoDto, MedicaoGasDto } from './dto';
import { OperacaoService } from './operacao.service';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';

@PermiteEmpresa()
@Controller()
export class OperacaoController {
  constructor(private readonly operacao: OperacaoService) {}

  @Get('operacao/conteudo')
  conteudo() {
    return this.operacao.conteudo();
  }

  @Get('empresas/:empresaId/aprs')
  listarAprs(@ConsultoriaId() c: string, @Param('empresaId') e: string) {
    return this.operacao.listarAprs(c, e);
  }

  @Post('empresas/:empresaId/aprs')
  criarApr(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: CriarAprDto) {
    return this.operacao.criarApr(c, e, dto);
  }

  @Post('empresas/:empresaId/aprs/:id/pdf')
  async pdfApr(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Res() res: Response) {
    enviarPdf(res, await this.operacao.pdfApr(c, e, id), 'APR.pdf');
  }

  @Get('empresas/:empresaId/permissoes')
  listarPermissoes(@ConsultoriaId() c: string, @Param('empresaId') e: string) {
    return this.operacao.listarPermissoes(c, e);
  }

  @Post('empresas/:empresaId/permissoes')
  criarPermissao(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: CriarPermissaoDto) {
    return this.operacao.criarPermissao(c, e, dto);
  }

  @Post('empresas/:empresaId/permissoes/:id/medicoes')
  registrarMedicao(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Body() dto: MedicaoGasDto) {
    return this.operacao.registrarMedicao(c, e, id, dto);
  }

  @Post('empresas/:empresaId/permissoes/:id/encerrar')
  encerrar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) {
    return this.operacao.encerrarPermissao(c, e, id);
  }

  @Post('empresas/:empresaId/permissoes/:id/pdf')
  async pdfPermissao(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Res() res: Response) {
    enviarPdf(res, await this.operacao.pdfPermissao(c, e, id), 'Permissao-de-Trabalho.pdf');
  }

  @Get('empresas/:empresaId/dds')
  listarDds(@ConsultoriaId() c: string, @Param('empresaId') e: string) {
    return this.operacao.listarDds(c, e);
  }

  @Post('empresas/:empresaId/dds')
  criarDds(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: CriarDdsDto) {
    return this.operacao.criarDds(c, e, dto);
  }

  @Post('empresas/:empresaId/dds/:id/pdf')
  async pdfDds(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Res() res: Response) {
    enviarPdf(res, await this.operacao.pdfDds(c, e, id), 'DDS.pdf');
  }
}
