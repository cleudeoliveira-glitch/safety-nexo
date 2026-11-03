import { Controller, Get, Param, Query } from '@nestjs/common';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { PrismaService } from '../prisma/prisma.service';

// Histórico só para a consultoria.
@Controller()
export class HistoricoController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('empresas/:empresaId/historico')
  daEmpresa(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string, @Query('antes') antes?: string) {
    return this.prisma.historico.findMany({
      where: { consultoriaId, empresaId, ...(antes ? { createdAt: { lt: new Date(antes) } } : {}) },
      orderBy: { createdAt: 'desc' }, take: 100,
      select: { id: true, usuarioNome: true, papel: true, acao: true, createdAt: true },
    });
  }
}
