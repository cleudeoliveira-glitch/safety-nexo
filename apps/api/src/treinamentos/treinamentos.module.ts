import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { EsocialModule } from '../esocial/esocial.module';
import { TreinamentosController } from './treinamentos.controller';
import { TreinamentosService } from './treinamentos.service';
import { SugestoesTreinamentoController, SugestoesTreinamentoService } from './sugestoes';

@Module({
  imports: [DocumentosModule, EsocialModule],
  controllers: [TreinamentosController, SugestoesTreinamentoController],
  providers: [TreinamentosService, SugestoesTreinamentoService],
})
export class TreinamentosModule {}
