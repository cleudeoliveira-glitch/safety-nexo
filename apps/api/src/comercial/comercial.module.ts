import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { LogosModule } from '../logos/logos.module';
import { ComercialController } from './comercial.controller';
import { ComercialService } from './comercial.service';

@Module({ imports: [DocumentosModule, LogosModule], controllers: [ComercialController], providers: [ComercialService] })
export class ComercialModule {}
