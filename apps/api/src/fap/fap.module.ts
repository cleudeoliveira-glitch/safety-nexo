import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { FapController } from './fap.controller';
import { FapService } from './fap.service';

@Module({ imports: [DocumentosModule], controllers: [FapController], providers: [FapService] })
export class FapModule {}
