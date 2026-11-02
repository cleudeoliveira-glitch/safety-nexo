import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { LaudosController } from './laudos.controller';
import { LaudosService } from './laudos.service';

@Module({ imports: [DocumentosModule], controllers: [LaudosController], providers: [LaudosService] })
export class LaudosModule {}
