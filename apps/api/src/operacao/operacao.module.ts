import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { EsocialModule } from '../esocial/esocial.module';
import { OperacaoController } from './operacao.controller';
import { OperacaoService } from './operacao.service';

@Module({
  imports: [DocumentosModule, EsocialModule],
  controllers: [OperacaoController],
  providers: [OperacaoService],
})
export class OperacaoModule {}
