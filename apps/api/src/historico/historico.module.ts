import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HistoricoController } from './historico.controller';
import { HistoricoInterceptor } from './historico.interceptor';

@Module({
  controllers: [HistoricoController],
  providers: [{ provide: APP_INTERCEPTOR, useClass: HistoricoInterceptor }],
})
export class HistoricoModule {}
