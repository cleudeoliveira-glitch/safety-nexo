import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { Recurso } from '../common/plano';
import { Request } from 'express';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { AssinarPresencaDto, FotoColaboradorDto } from './dto';
import { PresencaService, TipoLista } from './presenca.service';

const TIPOS: Record<string, TipoLista> = { dds: 'DDS', turmas: 'TREINAMENTO' };
const tipo = (t: string) => { const x = TIPOS[t]; if (!x) throw new BadRequestException('Lista desconhecida.'); return x; };
const origem = (req: Request) => ({ ip: String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.ip || null, aparelho: String(req.headers['user-agent'] ?? '') || null });

@PermiteEmpresa()
@Controller('empresas/:e')
export class PresencaController {
  constructor(private readonly presenca: PresencaService) {}

  @Get('lista-toque/:tipo/:refId')
  lista(@ConsultoriaId() c: string, @Param('e') e: string, @Param('tipo') t: string, @Param('refId') r: string) { return this.presenca.lista(c, e, tipo(t), r); }

  @Recurso('assinatura', 'A lista de presença com assinatura')
  @Post('lista-toque/:tipo/:refId/marcar-todos')
  marcarTodos(@ConsultoriaId() c: string, @Param('e') e: string, @Param('tipo') t: string, @Param('refId') r: string) { return this.presenca.marcarTodos(c, e, tipo(t), r); }

  @Recurso('assinatura', 'A lista de presença com assinatura')
  @Post('lista-toque/:tipo/:refId/:colaboradorId')
  assinar(@ConsultoriaId() c: string, @Param('e') e: string, @Param('tipo') t: string, @Param('refId') r: string, @Param('colaboradorId') id: string, @Body() dto: AssinarPresencaDto, @Req() req: Request) {
    return this.presenca.assinar(c, e, tipo(t), r, id, dto, origem(req));
  }

  @Get('colaboradores/:id/foto')
  foto(@ConsultoriaId() c: string, @Param('e') e: string, @Param('id') id: string) { return this.presenca.foto(c, e, id); }

  @Put('colaboradores/:id/foto')
  salvarFoto(@ConsultoriaId() c: string, @Param('e') e: string, @Param('id') id: string, @Body() dto: FotoColaboradorDto) { return this.presenca.salvarFoto(c, e, id, dto.imagem); }

  @Delete('colaboradores/:id/foto')
  apagarFoto(@ConsultoriaId() c: string, @Param('e') e: string, @Param('id') id: string) { return this.presenca.apagarFoto(c, e, id); }
}
