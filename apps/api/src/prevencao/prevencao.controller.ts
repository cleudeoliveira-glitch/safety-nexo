import { Body, Controller, Delete, Get, Ip, Module, Param, Post, Put, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { Publica } from '../auth/publica.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { Sessao, SessaoUsuario } from '../common/sessao.decorator';
import { DocumentosModule } from '../documentos/documentos.module';
import { enviarPdf } from '../documentos/documentos.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AcaoDto, AtualizarAcaoDto, InvestigacaoDto, RelatoPublicoDto, TratarRelatoDto } from './dto';
import { PrevencaoService } from './prevencao.service';

const FOTO = FileInterceptor('foto', { limits: { fileSize: 10_000_000 } });
const enviarImagem = (res: Response, img: { dados: Buffer; tipo: string }) => { res.setHeader('Content-Type', img.tipo); res.setHeader('Cache-Control', 'private, max-age=300'); res.end(img.dados); };

// Página pública do QR code: qualquer pessoa relata, sem login.
@Publica()
@Controller('relato')
export class RelatoPublicoController {
  constructor(private readonly p: PrevencaoService) {}
  @Get(':token') dados(@Param('token') t: string) { return this.p.publico(t); }
  @Post(':token') @UseInterceptors(FOTO)
  relatar(@Param('token') t: string, @Ip() ip: string, @Body() d: RelatoPublicoDto, @UploadedFile() f?: Express.Multer.File) { return this.p.relatar(t, ip, d, f); }
}

// Relatos e plano de ação: a empresa cliente também acompanha e resolve.
@PermiteEmpresa()
@Controller('empresas/:empresaId')
export class PrevencaoEmpresaController {
  constructor(private readonly p: PrevencaoService, private readonly prisma: PrismaService) {}

  @Get('relatos/qr') qr(@ConsultoriaId() c: string, @Param('empresaId') e: string) { return this.p.qr(c, e); }
  @Post('relatos/cartaz') async cartaz(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Res() res: Response) { enviarPdf(res, await this.p.cartaz(c, e), 'Cartaz-QR-relato.pdf'); }
  @Get('relatos') relatos(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Sessao() s: SessaoUsuario) { return this.p.relatos(c, e, s.papel === 'EMPRESA'); }
  @Get('relatos/:id/foto') async fotoRelato(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Sessao() s: SessaoUsuario, @Res() res: Response) { enviarImagem(res, await this.p.fotoRelato(c, e, id, s.papel === 'EMPRESA')); }
  @Put('relatos/:id') tratar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Body() d: TratarRelatoDto, @Sessao() s: SessaoUsuario) { return this.p.tratar(c, e, id, d, s.papel === 'EMPRESA'); }

  @Get('acoes') acoes(@ConsultoriaId() c: string, @Param('empresaId') e: string) { return this.p.acoes(c, e); }
  @Post('acoes') criar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() d: AcaoDto) { return this.p.criarAcao(c, e, d); }
  @Put('acoes/:id') async atualizar(@Sessao() s: SessaoUsuario, @Param('empresaId') e: string, @Param('id') id: string, @Body() d: AtualizarAcaoDto) {
    const u = await this.prisma.usuario.findUnique({ where: { id: s.sub }, select: { nome: true } });
    return this.p.atualizarAcao(s.consultoriaId, e, id, u?.nome ?? '—', d);
  }
  @Post('acoes/:id/evidencia') @UseInterceptors(FOTO)
  evidencia(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @UploadedFile() f?: Express.Multer.File) { return this.p.evidencia(c, e, id, f); }
  @Get('acoes/:id/evidencia') async verEvidencia(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Res() res: Response) { enviarImagem(res, await this.p.fotoEvidencia(c, e, id)); }
  @Post('acoes/da-inspecao/:inspecaoId') daInspecao(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('inspecaoId') i: string) { return this.p.acoesDaInspecao(c, e, i); }
  @Post('acoes/pdf') async pdf(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Res() res: Response) { enviarPdf(res, await this.p.pdfPlano(c, e), 'Plano-de-acao.pdf'); }
}

// Só a consultoria: novo QR, análise da IA, apagar ação e investigação de acidente.
@Controller('empresas/:empresaId')
export class PrevencaoConsultoriaController {
  constructor(private readonly p: PrevencaoService) {}
  @Post('relatos/qr/novo') novoQr(@ConsultoriaId() c: string, @Param('empresaId') e: string) { return this.p.qr(c, e, true); }
  @Post('relatos/:id/ia') ia(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.p.analisarRelato(c, e, id); }
  @Delete('acoes/:id') remover(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.p.removerAcao(c, e, id); }
  @Get('investigacoes') investigacoes(@ConsultoriaId() c: string, @Param('empresaId') e: string) { return this.p.investigacoes(c, e); }
  @Post('investigacoes') criarInv(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() d: InvestigacaoDto) { return this.p.criarInvestigacao(c, e, d); }
  @Delete('investigacoes/:id') removerInv(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.p.removerInvestigacao(c, e, id); }
  @Post('investigacoes/:id/pdf') async pdfInv(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Res() res: Response) { enviarPdf(res, await this.p.pdfInvestigacao(c, e, id), 'Investigacao.pdf'); }
}

@Module({
  imports: [DocumentosModule],
  controllers: [RelatoPublicoController, PrevencaoEmpresaController, PrevencaoConsultoriaController],
  providers: [PrevencaoService],
})
export class PrevencaoModule {}
