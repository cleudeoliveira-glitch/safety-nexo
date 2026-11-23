import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { Publica } from '../auth/publica.decorator';
import { PrismaService } from '../prisma/prisma.service';

// Página pública aberta pelo QR Code do rodapé dos documentos. Não precisa de login e mostra só o necessário
// para conferir se o PDF saiu do sistema: título, empresa, consultoria, responsável, data e número de páginas.
@Controller()
export class ValidacaoDocumentoController {
  constructor(private readonly prisma: PrismaService) {}

  @Publica()
  @Get('validar-documento/:codigo')
  async validar(@Param('codigo') codigo: string) {
    const doc = await this.prisma.documentoEmitido.findUnique({ where: { codigo: codigo.trim().toUpperCase() } });
    if (!doc) throw new NotFoundException('Documento não encontrado. Confira o código.');
    return doc;
  }
}
