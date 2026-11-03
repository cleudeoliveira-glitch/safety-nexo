import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { CulturaController } from './cultura.controller';
import { CulturaService } from './cultura.service';

@Module({ imports: [DocumentosModule], controllers: [CulturaController], providers: [CulturaService] })
export class CulturaModule {}
