import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { TreinamentosController } from './treinamentos.controller';
import { TreinamentosService } from './treinamentos.service';

@Module({
  imports: [DocumentosModule],
  controllers: [TreinamentosController],
  providers: [TreinamentosService],
})
export class TreinamentosModule {}
