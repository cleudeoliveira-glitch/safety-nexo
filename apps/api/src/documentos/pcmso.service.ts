import { Injectable } from '@nestjs/common';
import { ContextoDocumentoService } from './contexto.service';
import { renderPcmsoHtml } from './pcmso.template';
import { PdfService } from './pdf.service';

@Injectable()
export class PcmsoService {
  constructor(
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
  ) {}

  async gerarPdf(consultoriaId: string, empresaId: string): Promise<{ pdf: Buffer; versao: number }> {
    const { empresa, versao, logoEmpresa, consultoria, geradoEm } = await this.contexto.carregar(consultoriaId, empresaId, 'PCMSO');

    const html = renderPcmsoHtml(
      {
        titulo: 'Programa de Controle Médico de Saúde Ocupacional (PCMSO)',
        logoEmpresa,
        consultoria,
        infos: [
          ['Empresa', empresa.razaoSocial],
          ['CNPJ', empresa.cnpj],
          ['Grau de risco', empresa.grauRisco],
          ['Funcionários', empresa.numFuncionarios],
          ['Versão', `${versao} · emitido em ${geradoEm.toLocaleDateString('pt-BR')}`],
        ],
        aviso: 'Feito com o Safety Nexo.',
      },
      { nome: empresa.medicoPcmsoNome, crm: empresa.medicoPcmsoCrm },
      empresa.ghes.map((ghe) => ({
        nome: ghe.nome,
        colaboradores: ghe._count.colaboradores,
        riscos: ghe.riscos.map((r) => r.agente),
        exames: ghe.exames,
      })),
    );
    const pdf = await this.pdf.render(html);

    // PCMSO: revisão anual, junto com o relatório analítico (NR-07).
    await this.contexto.registrar(empresaId, 'PCMSO', versao, geradoEm, 12);
    return { pdf, versao };
  }
}
