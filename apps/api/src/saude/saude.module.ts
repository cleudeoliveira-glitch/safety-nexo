import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { SaudeController } from './saude.controller';
import { SaudeService } from './saude.service';

@Module({ imports: [DocumentosModule], controllers: [SaudeController], providers: [SaudeService] })
export class SaudeModule {}
