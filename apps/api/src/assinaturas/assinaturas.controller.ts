import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { Recurso } from '../common/plano';
import { Request, Response } from 'express';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { Publica } from '../auth/publica.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { Sessao, SessaoUsuario } from '../common/sessao.decorator';
import { AssinaturasService } from './assinaturas.service';
import { AssinarDto, CriarPedidoDto } from './dto';

const ipDe = (req: Request) => (String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.ip || null);

@PermiteEmpresa()
@Recurso('assinatura', 'A assinatura de documentos')
@Controller('empresas/:empresaId/assinaturas')
export class AssinaturasController {
  constructor(private readonly assinaturas: AssinaturasService) {}

  @Get()
  listar(@ConsultoriaId() c: string, @Param('empresaId') e: string) { return this.assinaturas.listar(c, e); }

  @Post()
  criar(@Sessao() s: SessaoUsuario, @Param('empresaId') e: string, @Body() dto: CriarPedidoDto) { return this.assinaturas.criar(s, e, dto); }

  @Post(':id/signatarios/:sid/assinar')
  assinar(@Sessao() s: SessaoUsuario, @Param('empresaId') e: string, @Param('id') id: string, @Param('sid') sid: string, @Body() dto: AssinarDto, @Req() req: Request) {
    return this.assinaturas.assinarPresencial(s, e, id, sid, dto, ipDe(req), String(req.headers['user-agent'] ?? '') || null);
  }

  @Post(':id/concluir')
  concluir(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.assinaturas.concluirManual(c, e, id); }

  @Post(':id/cancelar')
  cancelar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.assinaturas.cancelar(c, e, id); }
}

// Rotas sem login: quem recebeu o link assina, e qualquer pessoa confere pelo código.
@Publica()
@Controller()
export class AssinaturaPublicaController {
  constructor(private readonly assinaturas: AssinaturasService) {}

  @Get('assinar/:token')
  dados(@Param('token') t: string) { return this.assinaturas.dadosDoLink(t); }

  @Get('assinar/:token/documento')
  async documento(@Param('token') t: string, @Res() res: Response) {
    const pdf = await this.assinaturas.documentoDoLink(t);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="documento.pdf"' });
    res.end(pdf);
  }

  @Post('assinar/:token')
  assinar(@Param('token') t: string, @Body() dto: AssinarDto, @Req() req: Request) {
    return this.assinaturas.assinarPeloLink(t, dto, ipDe(req), String(req.headers['user-agent'] ?? '') || null);
  }

  @Get('assinatura/:codigo')
  conferir(@Param('codigo') c: string) { return this.assinaturas.conferir(c); }
}
