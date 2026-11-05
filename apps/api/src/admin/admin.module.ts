import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { MeuPlanoController } from './meu-plano.controller';

@Module({ controllers: [AdminController, MeuPlanoController] })
export class AdminModule {}
