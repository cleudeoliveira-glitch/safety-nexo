import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { EmergenciaController } from './emergencia.controller';
import { EmergenciaService } from './emergencia.service';

@Module({ imports: [DocumentosModule], controllers: [EmergenciaController], providers: [EmergenciaService], exports: [EmergenciaService] })
export class EmergenciaModule {}
