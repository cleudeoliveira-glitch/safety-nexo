import { Module } from '@nestjs/common';
import { PsicossocialController, PsicossocialPublicoController } from './psicossocial.controller';
import { PsicossocialService } from './psicossocial.service';

@Module({ controllers: [PsicossocialController, PsicossocialPublicoController], providers: [PsicossocialService] })
export class PsicossocialModule {}
