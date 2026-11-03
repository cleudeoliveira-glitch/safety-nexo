import { Module } from '@nestjs/common';
import { ArquivoModule } from '../arquivo/arquivo.module';
import { DocumentosModule } from '../documentos/documentos.module';
import { EsocialModule } from '../esocial/esocial.module';
import { AssinaturaPublicaController, AssinaturasController } from './assinaturas.controller';
import { AssinaturasService } from './assinaturas.service';

@Module({ imports: [ArquivoModule, DocumentosModule, EsocialModule], controllers: [AssinaturasController, AssinaturaPublicaController], providers: [AssinaturasService] })
export class AssinaturasModule {}
