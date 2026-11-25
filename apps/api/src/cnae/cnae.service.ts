import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { classeDoCnae, LinhaNr04 } from './cnae';
import { NR04_ANEXO1 } from './nr04-anexo1';

// O Quadro I da NR-04 vem junto com o código: a busca não depende de alguém ter importado a tabela no banco.
const QUADRO = new Map<string, LinhaNr04>(NR04_ANEXO1.map(([classe, grauRisco, denominacao]) => [classe, { classe, grauRisco, denominacao }]));

@Injectable()
export class CnaeService implements OnModuleInit {
  private readonly log = new Logger('CnaeService');
  constructor(private readonly prisma: PrismaService) {}

  // Deixa a tabela do banco igual ao quadro do código (ela estava vazia no site oficial).
  async onModuleInit() {
    try {
      const noBanco = await this.prisma.cnaeGrauRisco.count();
      if (noBanco >= QUADRO.size) return;
      const r = await this.prisma.cnaeGrauRisco.createMany({ data: [...QUADRO.values()], skipDuplicates: true });
      this.log.log(`Tabela da NR-04: ${r.count} classes CNAE incluídas.`);
    } catch (e) {
      this.log.warn(`Não consegui preencher a tabela da NR-04 no banco: ${(e as Error).message}`);
    }
  }

  private async linha(cnae: string): Promise<LinhaNr04 | null> {
    const classe = classeDoCnae(cnae);
    if (!classe) return null;
    return QUADRO.get(classe) ?? (await this.prisma.cnaeGrauRisco.findUnique({ where: { classe } }));
  }

  async buscar(cnae: string) {
    const linha = await this.linha(cnae);
    if (!linha) {
      throw new NotFoundException(
        `CNAE ${cnae} não encontrado na tabela da NR-04. Confira o código no cartão do CNPJ ou informe o grau de risco manualmente.`,
      );
    }
    return linha;
  }

  // Usado no cadastro: devolve o grau de risco ou null, sem erro, para não bloquear o cadastro.
  async grauDeRisco(cnae: string): Promise<number | null> {
    return (await this.linha(cnae))?.grauRisco ?? null;
  }
}
