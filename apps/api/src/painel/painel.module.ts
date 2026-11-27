import { Module } from '@nestjs/common';
import { AgendaController, AgendaService } from './agenda';
import { BuscaController } from './busca';
import { PainelGeralController } from './painel-geral.controller';
import { PainelController } from './painel.controller';
import { PainelService } from './painel.service';

@Module({
  controllers: [PainelController, PainelGeralController, AgendaController, BuscaController],
  providers: [PainelService, AgendaService],
  exports: [PainelService],
})
export class PainelModule {}
