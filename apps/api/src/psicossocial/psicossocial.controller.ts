import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { Publica } from '../auth/publica.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { Sessao, SessaoUsuario } from '../common/sessao.decorator';
import { AcaoDto, AcaoFeitaDto, CriarAvaliacaoDto, LevarPgrDto, ResponderDto } from './dto';
import { PsicossocialService } from './psicossocial.service';

// Só a consultoria: resultado psicossocial é dado sensível e é ela quem interpreta.
@Controller('empresas/:empresaId/psicossocial')
export class PsicossocialController {
  constructor(private readonly ps: PsicossocialService) {}

  @Get('questionarios') questionarios() { return this.ps.questionarios(); }
  @Get() listar(@ConsultoriaId() c: string, @Param('empresaId') e: string) { return this.ps.listar(c, e); }
  @Post() criar(@Sessao() s: SessaoUsuario, @Param('empresaId') e: string, @Body() dto: CriarAvaliacaoDto) { return this.ps.criar(s, e, dto); }
  @Put(':id/encerrar') encerrar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.ps.mudarStatus(c, e, id, false); }
  @Put(':id/reabrir') reabrir(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.ps.mudarStatus(c, e, id, true); }
  @Get(':id/resultado') resultado(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.ps.resultado(c, e, id); }
  @Post(':id/acoes') acao(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Body() dto: AcaoDto) { return this.ps.criarAcao(c, e, id, dto); }
  @Put(':id/acoes/:acaoId') marcar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Param('acaoId') a: string, @Body() dto: AcaoFeitaDto) { return this.ps.marcarAcao(c, e, id, a, dto.feita); }
  @Delete(':id/acoes/:acaoId') remover(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Param('acaoId') a: string) { return this.ps.removerAcao(c, e, id, a); }
  @Post(':id/pgr') pgr(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Body() dto: LevarPgrDto) { return this.ps.levarAoPgr(c, e, id, dto); }
}

@Publica()
@Controller('psicossocial')
export class PsicossocialPublicoController {
  constructor(private readonly ps: PsicossocialService) {}
  @Get(':token') dados(@Param('token') t: string) { return this.ps.publico(t); }
  @Post(':token') responder(@Param('token') t: string, @Body() dto: ResponderDto) { return this.ps.responder(t, dto); }
}
