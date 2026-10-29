import { Module } from '@nestjs/common';
import { LogosModule } from '../logos/logos.module';
import { ContextoDocumentoService } from './contexto.service';
import { DocumentosController } from './documentos.controller';
import { PcmsoService } from './pcmso.service';
import { PdfService } from './pdf.service';
import { PgrService } from './pgr.service';

@Module({
  imports: [LogosModule],
  controllers: [DocumentosController],
  providers: [ContextoDocumentoService, PdfService, PgrService, PcmsoService],
  exports: [ContextoDocumentoService, PdfService],
})
export class DocumentosModule {}
