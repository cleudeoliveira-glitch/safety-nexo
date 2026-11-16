import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { CipaController } from './cipa.controller';
import { CipaService } from './cipa.service';
import { EleicaoCipaController } from './eleicao.controller';
import { EleicaoCipaService } from './eleicao.service';
import { ReunioesCipaController, ReunioesCipaService } from './reunioes';
import { VotacaoCipaController, VotacaoCipaService, VotoPublicoController } from './votacao';

@Module({
  imports: [DocumentosModule],
  controllers: [CipaController, EleicaoCipaController, VotacaoCipaController, VotoPublicoController, ReunioesCipaController],
  providers: [CipaService, EleicaoCipaService, VotacaoCipaService, ReunioesCipaService],
})
export class CipaModule {}
