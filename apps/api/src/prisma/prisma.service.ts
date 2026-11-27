import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ligarAntesDepois } from '../historico/antes-depois';
import { ligarLixeira } from '../lixeira/middleware';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    ligarLixeira(this); // exclusões feitas pelo usuário vão antes para a Lixeira (30 dias)
    ligarAntesDepois(this); // histórico guarda o antes e o depois do que foi mudado
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
