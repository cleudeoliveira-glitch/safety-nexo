import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { CipaController } from './cipa.controller';
import { CipaService } from './cipa.service';
import { EleicaoCipaController } from './eleicao.controller';
import { EleicaoCipaService } from './eleicao.service';
import { VotacaoCipaController, VotacaoCipaService, VotoPublicoController } from './votacao';

@Module({
  imports: [DocumentosModule],
  controllers: [CipaController, EleicaoCipaController, VotacaoCipaController, VotoPublicoController],
  providers: [CipaService, EleicaoCipaService, VotacaoCipaService],
})
export class CipaModule {}
