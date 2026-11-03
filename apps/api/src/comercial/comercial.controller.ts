import { Body, Controller, Get, Param, Post, Put, Res } from '@nestjs/common';
import { Response } from 'express';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { enviarPdf } from '../documentos/documentos.controller';
import { ComercialService } from './comercial.service';
import { ConfiguracaoComercialDto, CriarCobrancaDto, CriarContratoDto, CriarPropostaDto, CriarServicoDto, DataDto, MensalidadesDto, StatusPropostaDto } from './dto';

// Comercial: só a consultoria (a empresa cliente não vê).
@Controller('comercial')
export class ComercialController {
  constructor(private readonly comercial: ComercialService) {}

  @Get('configuracao') configuracao(@ConsultoriaId() c: string) { return this.comercial.configuracao(c); }
  @Put('configuracao') salvarConfiguracao(@ConsultoriaId() c: string, @Body() dto: ConfiguracaoComercialDto) { return this.comercial.salvarConfiguracao(c, dto); }
  @Get('resumo') resumo(@ConsultoriaId() c: string) { return this.comercial.resumo(c); }

  @Get('propostas') propostas(@ConsultoriaId() c: string) { return this.comercial.listarPropostas(c); }
  @Post('propostas') criarProposta(@ConsultoriaId() c: string, @Body() dto: CriarPropostaDto) { return this.comercial.criarProposta(c, dto); }
  @Put('propostas/:id/status') statusProposta(@ConsultoriaId() c: string, @Param('id') id: string, @Body() dto: StatusPropostaDto) { return this.comercial.statusProposta(c, id, dto.status); }
  @Post('propostas/:id/pdf') async pdfProposta(@ConsultoriaId() c: string, @Param('id') id: string, @Res() res: Response) { enviarPdf(res, await this.comercial.pdfProposta(c, id), 'Proposta.pdf'); }

  @Get('contratos') contratos(@ConsultoriaId() c: string) { return this.comercial.listarContratos(c); }
  @Post('contratos') criarContrato(@ConsultoriaId() c: string, @Body() dto: CriarContratoDto) { return this.comercial.criarContrato(c, dto); }
  @Put('contratos/:id/encerrar') encerrarContrato(@ConsultoriaId() c: string, @Param('id') id: string, @Body() dto: DataDto) { return this.comercial.encerrarContrato(c, id, dto.data); }
  @Post('contratos/:id/pdf') async pdfContrato(@ConsultoriaId() c: string, @Param('id') id: string, @Res() res: Response) { enviarPdf(res, await this.comercial.pdfContrato(c, id), 'Contrato.pdf'); }
  @Post('mensalidades') mensalidades(@ConsultoriaId() c: string, @Body() dto: MensalidadesDto) { return this.comercial.gerarMensalidades(c, dto.mes); }

  @Get('servicos') servicos(@ConsultoriaId() c: string) { return this.comercial.listarServicos(c); }
  @Post('servicos') criarServico(@ConsultoriaId() c: string, @Body() dto: CriarServicoDto) { return this.comercial.criarServico(c, dto); }
  @Put('servicos/:id/concluir') concluirServico(@ConsultoriaId() c: string, @Param('id') id: string, @Body() dto: DataDto) { return this.comercial.concluirServico(c, id, dto.data); }

  @Get('cobrancas') cobrancas(@ConsultoriaId() c: string) { return this.comercial.listarCobrancas(c); }
  @Post('cobrancas') criarCobranca(@ConsultoriaId() c: string, @Body() dto: CriarCobrancaDto) { return this.comercial.criarCobranca(c, dto); }
  @Put('cobrancas/:id/paga') paga(@ConsultoriaId() c: string, @Param('id') id: string, @Body() dto: DataDto) { return this.comercial.marcarPaga(c, id, dto.data); }
  @Put('cobrancas/:id/cancelar') cancelar(@ConsultoriaId() c: string, @Param('id') id: string) { return this.comercial.cancelarCobranca(c, id); }
  @Get('cobrancas/:id/pix') pix(@ConsultoriaId() c: string, @Param('id') id: string) { return this.comercial.pix(c, id); }
  @Post('cobrancas/:id/pdf') async pdfCobranca(@ConsultoriaId() c: string, @Param('id') id: string, @Res() res: Response) { enviarPdf(res, await this.comercial.pdfCobranca(c, id), 'Cobranca.pdf'); }
}
