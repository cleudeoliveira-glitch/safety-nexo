import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { RostoController } from './rosto.controller';
import { RostoService } from './rosto.service';

@Module({ imports: [DocumentosModule], controllers: [RostoController], providers: [RostoService], exports: [RostoService] })
export class RostoModule {}
