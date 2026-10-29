import { Injectable } from '@nestjs/common';
import { ContextoDocumentoService } from './contexto.service';
import { PdfService } from './pdf.service';
import { renderPgrHtml } from './pgr.template';

@Injectable()
export class PgrService {
  constructor(
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
  ) {}

  async gerarPdf(consultoriaId: string, empresaId: string): Promise<{ pdf: Buffer; versao: number }> {
    const { empresa, versao, logoEmpresa, consultoria, geradoEm } = await this.contexto.carregar(consultoriaId, empresaId, 'PGR');

    const html = renderPgrHtml(
      {
        titulo: 'Programa de Gerenciamento de Riscos (PGR)',
        logoEmpresa,
        consultoria,
        infos: [
          ['Empresa', empresa.razaoSocial],
          ['CNPJ', empresa.cnpj],
          ['CNAE', empresa.cnae],
          ['Grau de risco', empresa.grauRisco],
          ['Funcionários', empresa.numFuncionarios],
          ['Versão', `${versao} · emitido em ${geradoEm.toLocaleDateString('pt-BR')}`],
        ],
        aviso: 'Documento gerado pelo Safety Nexo. Deve ser revisado e assinado pelo profissional responsável.',
      },
      empresa.ghes.map((ghe) => ({
        nome: ghe.nome,
        descricao: ghe.descricao,
        colaboradores: ghe._count.colaboradores,
        riscos: ghe.riscos,
      })),
    );
    const pdf = await this.pdf.render(html);

    // PGR: avaliação de riscos revista a cada 2 anos (NR-01).
    await this.contexto.registrar(empresaId, 'PGR', versao, geradoEm, 24);
    return { pdf, versao };
  }
}
