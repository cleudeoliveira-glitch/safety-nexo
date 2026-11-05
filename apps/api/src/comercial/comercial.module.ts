import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { LogosModule } from '../logos/logos.module';
import { ComercialController } from './comercial.controller';
import { ComercialService } from './comercial.service';
import { PropostaOnlineController, PropostaOnlineService, ReguaCobrancaService, TarefaReguaController } from './online';

@Module({ imports: [DocumentosModule, LogosModule], controllers: [ComercialController, PropostaOnlineController, TarefaReguaController], providers: [ComercialService, PropostaOnlineService, ReguaCobrancaService] })
export class ComercialModule {}
