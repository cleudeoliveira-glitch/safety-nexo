import { Module } from '@nestjs/common';
import { ConectoresController } from './conectores.controller';
import { ConectoresService } from './conectores.service';

@Module({ controllers: [ConectoresController], providers: [ConectoresService] })
export class ConectoresModule {}
