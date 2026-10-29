import { Injectable, NotFoundException } from '@nestjs/common';
import { LogosService } from '../logos/logos.service';
import { PrismaService } from '../prisma/prisma.service';

// Junta o que todo documento precisa: empresa, GHEs, logos e a próxima versão.
@Injectable()
export class ContextoDocumentoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logos: LogosService,
  ) {}

  async carregar(consultoriaId: string, empresaId: string, tipo: string) {
    const empresa = await this.prisma.empresa.findFirst({
      where: { id: empresaId, consultoriaId },
      include: {
        consultoria: true,
        ghes: {
          orderBy: { nome: 'asc' },
          include: { riscos: true, exames: true, _count: { select: { colaboradores: true } } },
        },
      },
    });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');

    const versao = (await this.prisma.documento.count({ where: { empresaId, tipo } })) + 1;
    const logoEmpresa = await this.logos.comoDataUri(empresa.logoPath);
    const consultoria = { nome: empresa.consultoria.nome, logo: await this.logos.comoDataUri(empresa.consultoria.logoPath) };

    return { empresa, versao, logoEmpresa, consultoria, geradoEm: new Date() };
  }

  async registrar(empresaId: string, tipo: string, versao: number, geradoEm: Date, validadeMeses: number) {
    const vencimento = new Date(geradoEm);
    vencimento.setMonth(vencimento.getMonth() + validadeMeses);
    await this.prisma.documento.create({ data: { empresaId, tipo, versao, geradoEm, vencimento } });
  }
}
