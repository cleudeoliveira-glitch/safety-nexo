import { Module } from '@nestjs/common';
import { PainelGeralController } from './painel-geral.controller';
import { PainelController } from './painel.controller';
import { PainelService } from './painel.service';

@Module({
  controllers: [PainelController, PainelGeralController],
  providers: [PainelService],
  exports: [PainelService],
})
export class PainelModule {}
