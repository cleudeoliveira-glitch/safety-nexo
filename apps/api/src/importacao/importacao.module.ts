import { Module } from '@nestjs/common';
import { ArquivoModule } from '../arquivo/arquivo.module';
import { ImportacaoController } from './importacao.controller';
import { ImportacaoService } from './importacao.service';

@Module({ imports: [ArquivoModule], controllers: [ImportacaoController], providers: [ImportacaoService] })
export class ImportacaoModule {}
