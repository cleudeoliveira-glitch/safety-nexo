import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContextoDocumentoService } from './contexto.service';
import { ehAgenteLtcat, renderLtcatHtml } from './ltcat.template';
import { PdfService } from './pdf.service';

@Injectable()
export class LtcatService {
  constructor(
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
    private readonly prisma: PrismaService,
  ) {}

  async gerarPdf(consultoriaId: string, empresaId: string) {
    const { empresa, versao, logoEmpresa, consultoria, geradoEm } = await this.contexto.carregar(consultoriaId, empresaId, 'LTCAT');
    const colaboradores = await this.prisma.colaborador.findMany({ where: { empresaId }, select: { gheId: true, cargo: true } });
    const html = renderLtcatHtml(
      {
        titulo: 'Laudo Técnico das Condições Ambientais do Trabalho (LTCAT)',
        logoEmpresa,
        consultoria,
        infos: [
          ['Empresa', empresa.razaoSocial],
          ['CNPJ', empresa.cnpj],
          ['CNAE', empresa.cnae],
          ['Grau de risco', empresa.grauRisco],
          ['Versão', `${versao} · emitido em ${geradoEm.toLocaleDateString('pt-BR')}`],
        ],
        aviso: 'Documento gerado pelo Safety Nexo. Deve ser revisado e assinado por engenheiro de segurança do trabalho ou médico do trabalho.',
      },
      empresa.ghes.map((g) => ({
        nome: g.nome,
        descricao: g.descricao,
        colaboradores: g._count.colaboradores,
        cargos: [...new Set(colaboradores.filter((c) => c.gheId === g.id).map((c) => c.cargo))].sort(),
        agentes: g.riscos.filter((r) => ehAgenteLtcat(r.tipo)),
      })),
      { nome: empresa.responsavelTecnicoNome, registro: empresa.responsavelTecnicoRegistro },
    );
    const pdf = await this.pdf.render(html);
    // Sem prazo fixo na lei: o painel lembra de revisar em 12 meses.
    await this.contexto.registrar(empresaId, 'LTCAT', versao, geradoEm, 12);
    return { pdf, versao };
  }
}
