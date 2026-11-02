import { Controller, Get, Param } from '@nestjs/common';
import { CnaeService } from './cnae.service';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';

@PermiteEmpresa()
@Controller('cnae')
export class CnaeController {
  constructor(private readonly cnae: CnaeService) {}

  @Get(':codigo')
  buscar(@Param('codigo') codigo: string) {
    return this.cnae.buscar(codigo);
  }
}
