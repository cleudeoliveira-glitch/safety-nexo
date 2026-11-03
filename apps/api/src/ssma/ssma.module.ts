import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { SsmaController } from './ssma.controller';
import { SsmaService } from './ssma.service';

@Module({ imports: [DocumentosModule], controllers: [SsmaController], providers: [SsmaService] })
export class SsmaModule {}
