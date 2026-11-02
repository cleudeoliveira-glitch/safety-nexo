import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { OperacaoController } from './operacao.controller';
import { OperacaoService } from './operacao.service';

@Module({
  imports: [DocumentosModule],
  controllers: [OperacaoController],
  providers: [OperacaoService],
})
export class OperacaoModule {}
