import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { MeuPlanoController } from './meu-plano.controller';

@Module({ imports: [AuthModule], controllers: [AdminController, MeuPlanoController] })
export class AdminModule {}
