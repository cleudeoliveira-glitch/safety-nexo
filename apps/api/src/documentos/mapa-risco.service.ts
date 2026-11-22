import { Injectable } from '@nestjs/common';
import { ContextoDocumentoService } from './contexto.service';
import { montarSetores, renderMapaRiscoHtml } from './mapa-risco';
import { PdfService } from './pdf.service';

// Mapa de risco da empresa, montado com os riscos que já estão nos GHEs. Nada é digitado de novo.
@Injectable()
export class MapaRiscoService {
  constructor(
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
  ) {}

  async gerarPdf(consultoriaId: string, empresaId: string) {
    const { empresa, versao, logoEmpresa, consultoria, geradoEm } = await this.contexto.carregar(consultoriaId, empresaId, 'Mapa de risco');
    const setores = montarSetores(empresa.ghes);
    const responsavel = [empresa.responsavelTecnicoNome?.trim(), empresa.responsavelTecnicoRegistro?.trim()].filter(Boolean).join(' · ') || null;
    const html = renderMapaRiscoHtml(
      {
        titulo: 'Mapa de risco',
        logoEmpresa,
        consultoria,
        infos: [
          ['Empresa', empresa.razaoSocial],
          ['CNPJ', empresa.cnpj],
          ['Versão', `${versao} · emitido em ${geradoEm.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`],
          ['Base', 'Inventário de riscos do PGR (NR-01) e CIPA (NR-05)'],
        ],
        aviso: 'Feito com o Safety Nexo.',
      },
      setores,
      { consultoria: consultoria.nome, responsavel },
    );
    const pdf = await this.pdf.render(html, { paisagem: true });
    // Revisar junto com o PGR ou quando mudar o setor; o painel lembra em 12 meses.
    await this.contexto.registrar(empresaId, 'Mapa de risco', versao, geradoEm, 12);
    return { pdf, versao };
  }
}
