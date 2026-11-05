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
  // WEB_ORIGIN aceita mais de um endereço separado por vírgula (o primeiro é o usado nos QR codes).
  const origens = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
  app.enableCors({ origin: origens });
  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
