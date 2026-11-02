import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module';
import { CipaController } from './cipa.controller';
import { CipaService } from './cipa.service';

@Module({
  imports: [DocumentosModule],
  controllers: [CipaController],
  providers: [CipaService],
})
export class CipaModule {}
