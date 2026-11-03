import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ArquivoController } from './arquivo.controller';
import { ArquivoInterceptor } from './arquivo.interceptor';
import { ArquivoService } from './arquivo.service';

@Module({ controllers: [ArquivoController], providers: [ArquivoService, { provide: APP_INTERCEPTOR, useClass: ArquivoInterceptor }] })
export class ArquivoModule {}
