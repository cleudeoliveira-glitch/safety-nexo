import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { ProntuarioController } from './prontuario.controller';
import { ProntuarioService } from './prontuario.service';

@Module({ imports: [DocumentosModule], controllers: [ProntuarioController], providers: [ProntuarioService], exports: [ProntuarioService] })
export class ProntuarioModule {}
