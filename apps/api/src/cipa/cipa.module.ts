import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { CipaController } from './cipa.controller';
import { CipaService } from './cipa.service';
import { EleicaoCipaController } from './eleicao.controller';
import { EleicaoCipaService } from './eleicao.service';

@Module({
  imports: [DocumentosModule],
  controllers: [CipaController, EleicaoCipaController],
  providers: [CipaService, EleicaoCipaService],
})
export class CipaModule {}
