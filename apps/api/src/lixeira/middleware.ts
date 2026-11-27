import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { caixaPlano } from '../common/plano';
import { Arvore, capturar, NAO_GUARDA } from './arvore';

const log = new Logger('Lixeira');

// Ligado no PrismaService: num pedido de exclusão, lê o que vai sair antes de apagar.
export function ligarLixeira(prisma: PrismaClient) {
  prisma.$use(async (params, next) => {
    const caixa = caixaPlano.getStore()?.lixeira;
    if (!caixa || (params.action !== 'delete' && params.action !== 'deleteMany') || !params.model || NAO_GUARDA.has(params.model)) return next(params);
    let arvores: Arvore[] = [];
    try {
      arvores = await capturar(prisma, params.model, params.args?.where ?? {});
    } catch (e) {
      log.warn(`não guardou na Lixeira (${params.model}): ${(e as Error).message}`);
    }
    const resultado = await next(params);
    caixa.arvores.push(...arvores);
    return resultado;
  });
}

