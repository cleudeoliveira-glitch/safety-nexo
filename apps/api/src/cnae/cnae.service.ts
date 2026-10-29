import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { classeDoCnae } from './cnae';

@Injectable()
export class CnaeService {
  constructor(private readonly prisma: PrismaService) {}

  async buscar(cnae: string) {
    const classe = classeDoCnae(cnae);
    const linha = classe ? await this.prisma.cnaeGrauRisco.findUnique({ where: { classe } }) : null;
    if (!linha) {
      throw new NotFoundException(
        `CNAE ${cnae} não encontrado na tabela da NR-04. Confira o código no cartão do CNPJ ou informe o grau de risco manualmente.`,
      );
    }
    return linha;
  }

  // Usado no cadastro: devolve o grau de risco ou null, sem erro, para não bloquear o cadastro.
  async grauDeRisco(cnae: string): Promise<number | null> {
    const classe = classeDoCnae(cnae);
    if (!classe) return null;
    const linha = await this.prisma.cnaeGrauRisco.findUnique({ where: { classe } });
    return linha?.grauRisco ?? null;
  }
}
