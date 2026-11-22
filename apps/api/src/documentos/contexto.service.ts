import { Injectable, NotFoundException } from '@nestjs/common';
import { emPrevia, planoAtual, temRecurso } from '../common/plano';
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
          include: { riscos: true, exames: true, _count: { select: { colaboradores: { where: { dataDesligamento: null } } } } },
        },
      },
    });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');

    // Emissões anteriores: viram o histórico de revisões no próprio documento.
    const historico = await this.prisma.documento.findMany({ where: { empresaId, tipo }, orderBy: { versao: 'asc' }, select: { versao: true, geradoEm: true } });
    const versao = historico.length + 1;
    // Logos conforme o plano: Grátis sem logos; Start só a da empresa; do Essencial para cima as duas.
    const plano = planoAtual();
    const logoEmpresa = temRecurso(plano, 'logoEmpresa') ? await this.logos.comoDataUri(empresa.logoPath) : null;
    // Responsável técnico da empresa (nome e CREA): sai no rodapé de todos os documentos.
    const responsavel = empresa.responsavelTecnicoNome?.trim()
      ? [empresa.responsavelTecnicoNome.trim(), empresa.responsavelTecnicoRegistro?.trim()].filter(Boolean).join(' · ')
      : null;
    const consultoria = { nome: empresa.consultoria.nome, logo: temRecurso(plano, 'logoConsultoria') ? await this.logos.comoDataUri(empresa.consultoria.logoPath) : null, responsavel };

    return { empresa, versao, historico, logoEmpresa, consultoria, geradoEm: new Date() };
  }

  async registrar(empresaId: string, tipo: string, versao: number, geradoEm: Date, validadeMeses: number) {
    if (emPrevia()) return; // só conta versão quando a pessoa autoriza o PDF
    const vencimento = new Date(geradoEm);
    vencimento.setMonth(vencimento.getMonth() + validadeMeses);
    await this.prisma.documento.create({ data: { empresaId, tipo, versao, geradoEm, vencimento } });
  }
}
