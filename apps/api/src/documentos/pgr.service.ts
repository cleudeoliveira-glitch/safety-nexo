import { Injectable } from '@nestjs/common';
import { ContextoDocumentoService } from './contexto.service';
import { PdfService } from './pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { renderPgrHtml } from './pgr.template';

@Injectable()
export class PgrService {
  constructor(
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
    private readonly prisma: PrismaService,
  ) {}

  async gerarPdf(consultoriaId: string, empresaId: string): Promise<{ pdf: Buffer; versao: number }> {
    const { empresa, versao, logoEmpresa, consultoria, geradoEm } = await this.contexto.carregar(consultoriaId, empresaId, 'PGR');

    // Plano de ação único da empresa: o que está aberto primeiro, por prazo.
    const acoes = await this.prisma.acaoCorretiva.findMany({ where: { empresaId }, orderBy: [{ status: 'asc' }, { prazo: 'asc' }] });
    const emergencia = (empresa.emergencia ?? {}) as { pontoEncontro?: string };

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
          ['Responsável', [empresa.responsavelTecnicoNome, empresa.responsavelTecnicoRegistro].filter(Boolean).join(' · ') || null],
        ],
        aviso: 'Documento gerado pelo Safety Nexo. Deve ser revisado e assinado pelo profissional responsável (NR-01, 1.5.7.2).',
      },
      empresa.ghes.map((ghe) => ({
        nome: ghe.nome,
        descricao: ghe.descricao,
        colaboradores: ghe._count.colaboradores,
        riscos: ghe.riscos,
      })),
      {
        processos: empresa.descricaoProcessos,
        // As feitas há mais de um ano saem do PDF para não alongar; o histórico fica no sistema.
        acoes: acoes.filter((a) => a.status !== 'FEITA' || !a.feitaEm || a.feitaEm > new Date(geradoEm.getTime() - 365 * 24 * 3600 * 1000)),
        pontoEncontro: emergencia.pontoEncontro?.trim() || null,
        responsavel: { nome: empresa.responsavelTecnicoNome, registro: empresa.responsavelTecnicoRegistro },
        representanteLegal: empresa.representanteLegalNome,
        emitidoEm: geradoEm,
      },
    );
    const pdf = await this.pdf.render(html);

    // PGR: avaliação de riscos revista a cada 2 anos (NR-01).
    await this.contexto.registrar(empresaId, 'PGR', versao, geradoEm, 24);
    return { pdf, versao };
  }
}
