import { Controller, Get, Param } from '@nestjs/common';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { PainelService } from './painel.service';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';

@PermiteEmpresa()
@Controller('empresas/:empresaId/painel')
export class PainelController {
  constructor(private readonly painel: PainelService) {}

  @Get()
  montar(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string) {
    return this.painel.montar(consultoriaId, empresaId);
  }
}
