import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { InspecoesController } from './inspecoes.controller';
import { InspecoesService } from './inspecoes.service';

@Module({ imports: [DocumentosModule], controllers: [InspecoesController], providers: [InspecoesService] })
export class InspecoesModule {}
