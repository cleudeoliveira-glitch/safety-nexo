import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { CriarItemDto, EditarItemDto, MovimentoDto } from './dto';
import { EstoqueService } from './estoque.service';

@PermiteEmpresa()
@Controller('empresas/:e/estoque')
export class EstoqueController {
  constructor(private readonly estoque: EstoqueService) {}
  @Get() listar(@ConsultoriaId() c: string, @Param('e') e: string) { return this.estoque.listar(c, e); }
  @Post() criar(@ConsultoriaId() c: string, @Param('e') e: string, @Body() dto: CriarItemDto) { return this.estoque.criar(c, e, dto); }
  @Patch(':id') editar(@ConsultoriaId() c: string, @Param('e') e: string, @Param('id') id: string, @Body() dto: EditarItemDto) { return this.estoque.editar(c, e, id, dto); }
  @Post(':id/entrada') entrada(@ConsultoriaId() c: string, @Param('e') e: string, @Param('id') id: string, @Body() dto: MovimentoDto) { return this.estoque.entrada(c, e, id, dto); }
  @Post(':id/ajuste') ajuste(@ConsultoriaId() c: string, @Param('e') e: string, @Param('id') id: string, @Body() dto: MovimentoDto) { return this.estoque.ajuste(c, e, id, dto); }
  @Get(':id/movimentos') movimentos(@ConsultoriaId() c: string, @Param('e') e: string, @Param('id') id: string) { return this.estoque.movimentos(c, e, id); }
}
