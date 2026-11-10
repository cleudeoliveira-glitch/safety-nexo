import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { errosEmPortugues } from './common/validacao';
import { caixaPlano } from './common/plano';
import { cabecalhosSeguranca, limiteDePedidos } from './common/protecao';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Cada pedido ganha uma caixa onde o AuthGuard guarda o plano (usada no PDF: marca d'água e logos).
  // "X-Previa: 1" marca o pedido como pré-visualização do documento (ver emPrevia).
  app.use((req: { headers: Record<string, unknown> }, _res: unknown, next: () => void) => caixaPlano.run({ previa: req.headers['x-previa'] === '1' }, next));
  app.useBodyParser('json', { limit: '1mb' }); // o desenho da assinatura vem como imagem
  app.set('trust proxy', 1); // IP real de quem assina, atrás do servidor de hospedagem
  app.disable('x-powered-by');
  // Proteção contra invasão: cabeçalhos de segurança e limite de tentativas (ver common/protecao.ts).
  app.use(cabecalhosSeguranca);
  app.use(limiteDePedidos);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, exceptionFactory: errosEmPortugues }));
  // WEB_ORIGIN aceita mais de um endereço separado por vírgula (o primeiro é o usado nos QR codes).
  const origens = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
  app.enableCors({ origin: origens });
  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
