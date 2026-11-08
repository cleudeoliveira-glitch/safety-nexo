import { Body, Controller, Get, Param, Post, Put, Res } from '@nestjs/common';
import { Recurso } from '../common/plano';
import { Response } from 'express';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { enviarPdf } from '../documentos/documentos.controller';
import { ComercialService } from './comercial.service';
import { PropostaOnlineService, ReguaCobrancaService } from './online';
import { EmailCobrancaDto, LigarReguaDto, ConfiguracaoComercialDto, CriarCobrancaDto, CriarContratoDto, CriarPropostaDto, CriarServicoDto, DataDto, MensalidadesDto, StatusPropostaDto } from './dto';

// Comercial: só a consultoria (a empresa cliente não vê).
@Controller('comercial')
export class ComercialController {
  constructor(private readonly comercial: ComercialService, private readonly online: PropostaOnlineService, private readonly regua: ReguaCobrancaService) {}

  @Get('configuracao') configuracao(@ConsultoriaId() c: string) { return this.comercial.configuracao(c); }
  @Put('configuracao') salvarConfiguracao(@ConsultoriaId() c: string, @Body() dto: ConfiguracaoComercialDto) { return this.comercial.salvarConfiguracao(c, dto); }
  @Get('resumo') resumo(@ConsultoriaId() c: string) { return this.comercial.resumo(c); }

  @Recurso('proposta', 'A proposta comercial')
  @Get('propostas') propostas(@ConsultoriaId() c: string) { return this.comercial.listarPropostas(c); }
  @Recurso('proposta', 'A proposta comercial')
  @Post('propostas') criarProposta(@ConsultoriaId() c: string, @Body() dto: CriarPropostaDto) { return this.comercial.criarProposta(c, dto); }
  @Recurso('proposta', 'A proposta comercial')
  @Put('propostas/:id/status') statusProposta(@ConsultoriaId() c: string, @Param('id') id: string, @Body() dto: StatusPropostaDto) { return this.comercial.statusProposta(c, id, dto.status); }
  @Recurso('proposta', 'A proposta comercial')
  @Post('propostas/:id/link') linkProposta(@ConsultoriaId() c: string, @Param('id') id: string) { return this.online.link(c, id); }
  @Recurso('proposta', 'A proposta comercial')
  @Post('propostas/:id/pdf') async pdfProposta(@ConsultoriaId() c: string, @Param('id') id: string, @Res() res: Response) { enviarPdf(res, await this.comercial.pdfProposta(c, id), 'Proposta.pdf'); }

  @Recurso('cobranca', 'Contratos e cobranças')
  @Get('contratos') contratos(@ConsultoriaId() c: string) { return this.comercial.listarContratos(c); }
  @Recurso('cobranca', 'Contratos e cobranças')
  @Post('contratos') criarContrato(@ConsultoriaId() c: string, @Body() dto: CriarContratoDto) { return this.comercial.criarContrato(c, dto); }
  @Recurso('cobranca', 'Contratos e cobranças')
  @Put('contratos/:id/encerrar') encerrarContrato(@ConsultoriaId() c: string, @Param('id') id: string, @Body() dto: DataDto) { return this.comercial.encerrarContrato(c, id, dto.data); }
  @Recurso('cobranca', 'Contratos e cobranças')
  @Post('contratos/:id/pdf') async pdfContrato(@ConsultoriaId() c: string, @Param('id') id: string, @Res() res: Response) { enviarPdf(res, await this.comercial.pdfContrato(c, id), 'Contrato.pdf'); }
  @Recurso('cobranca', 'Contratos e cobranças')
  @Post('mensalidades') mensalidades(@ConsultoriaId() c: string, @Body() dto: MensalidadesDto) { return this.comercial.gerarMensalidades(c, dto.mes); }

  @Recurso('cobranca', 'Contratos e cobranças')
  @Get('servicos') servicos(@ConsultoriaId() c: string) { return this.comercial.listarServicos(c); }
  @Recurso('cobranca', 'Contratos e cobranças')
  @Post('servicos') criarServico(@ConsultoriaId() c: string, @Body() dto: CriarServicoDto) { return this.comercial.criarServico(c, dto); }
  @Recurso('cobranca', 'Contratos e cobranças')
  @Put('servicos/:id/concluir') concluirServico(@ConsultoriaId() c: string, @Param('id') id: string, @Body() dto: DataDto) { return this.comercial.concluirServico(c, id, dto.data); }

  @Recurso('cobranca', 'Contratos e cobranças')
  @Get('regua') reguaPrevia(@ConsultoriaId() c: string) { return this.regua.previa(c); }
  @Recurso('cobranca', 'Contratos e cobranças')
  @Put('regua') ligarRegua(@ConsultoriaId() c: string, @Body() dto: LigarReguaDto) { return this.regua.ligar(c, dto.ligada); }
  @Put('empresas/:empresaId/email-cobranca') emailCobranca(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: EmailCobrancaDto) { return this.comercial.emailCobranca(c, e, dto.email); }

  @Recurso('cobranca', 'Contratos e cobranças')
  @Get('cobrancas') cobrancas(@ConsultoriaId() c: string) { return this.comercial.listarCobrancas(c); }
  @Recurso('cobranca', 'Contratos e cobranças')
  @Post('cobrancas') criarCobranca(@ConsultoriaId() c: string, @Body() dto: CriarCobrancaDto) { return this.comercial.criarCobranca(c, dto); }
  @Recurso('cobranca', 'Contratos e cobranças')
  @Put('cobrancas/:id/paga') paga(@ConsultoriaId() c: string, @Param('id') id: string, @Body() dto: DataDto) { return this.comercial.marcarPaga(c, id, dto.data); }
  @Recurso('cobranca', 'Contratos e cobranças')
  @Put('cobrancas/:id/cancelar') cancelar(@ConsultoriaId() c: string, @Param('id') id: string) { return this.comercial.cancelarCobranca(c, id); }
  @Recurso('cobranca', 'Contratos e cobranças')
  @Get('cobrancas/:id/pix') pix(@ConsultoriaId() c: string, @Param('id') id: string) { return this.comercial.pix(c, id); }
  @Recurso('cobranca', 'Contratos e cobranças')
  @Post('cobrancas/:id/pdf') async pdfCobranca(@ConsultoriaId() c: string, @Param('id') id: string, @Res() res: Response) { enviarPdf(res, await this.comercial.pdfCobranca(c, id), 'Cobranca.pdf'); }
}
