import { Module } from '@nestjs/common';
import { LogosModule } from '../logos/logos.module';
import { AntesDeGerarService } from './antes-de-gerar';
import { ContextoDocumentoService } from './contexto.service';
import { DocumentosController } from './documentos.controller';
import { PcmsoService } from './pcmso.service';
import { PdfService } from './pdf.service';
import { LtcatService } from './ltcat.service';
import { MapaRiscoService } from './mapa-risco.service';
import { PgrService } from './pgr.service';
import { ValidacaoDocumentoController } from './validacao.controller';

@Module({
  imports: [LogosModule],
  controllers: [DocumentosController, ValidacaoDocumentoController],
  providers: [AntesDeGerarService, ContextoDocumentoService, PdfService, PgrService, PcmsoService, LtcatService, MapaRiscoService],
  exports: [ContextoDocumentoService, PdfService],
})
export class DocumentosModule {}
