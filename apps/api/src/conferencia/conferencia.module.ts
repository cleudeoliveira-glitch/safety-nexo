import { Controller, Get, Module, Param } from '@nestjs/common';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { TreinamentosModule } from '../treinamentos/treinamentos.module';
import { ConferenciaService } from './conferencia.service';

// Só a consultoria: é o olhar técnico sobre os documentos que ela mesma emite.
@Controller('empresas/:empresaId/conferencia')
export class ConferenciaController {
  constructor(private readonly c: ConferenciaService) {}
  @Get() conferir(@ConsultoriaId() c: string, @Param('empresaId') e: string) { return this.c.conferir(c, e); }
}

@Module({
  imports: [TreinamentosModule],
  controllers: [ConferenciaController],
  providers: [ConferenciaService],
  exports: [ConferenciaService],
})
export class ConferenciaModule {}
