import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { errosEmPortugues } from './common/validacao';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: '1mb' }); // o desenho da assinatura vem como imagem
  app.set('trust proxy', 1); // IP real de quem assina, atrás do servidor de hospedagem
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, exceptionFactory: errosEmPortugues }));
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' });
  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
