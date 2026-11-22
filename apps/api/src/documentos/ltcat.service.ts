import { capaDe, responsavelTecnico } from './capa';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContextoDocumentoService } from './contexto.service';
import { ehAgenteLtcat, renderLtcatHtml } from './ltcat.template';
import { PdfService } from './pdf.service';
import { cidadeDoEndereco } from './secoes';
import { descricaoGhe, nomeGhe } from '../empresas/ghe-ambiente';

@Injectable()
export class LtcatService {
  constructor(
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
    private readonly prisma: PrismaService,
  ) {}

  async gerarPdf(consultoriaId: string, empresaId: string) {
    const { empresa, versao, historico, logoEmpresa, consultoria, geradoEm } = await this.contexto.carregar(consultoriaId, empresaId, 'LTCAT');
    const proximaRevisao = new Date(geradoEm);
    proximaRevisao.setMonth(proximaRevisao.getMonth() + 12);
    const colaboradores = await this.prisma.colaborador.findMany({ where: { empresaId, dataDesligamento: null }, select: { gheId: true, cargo: true } });
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
        aviso: 'Feito com o Safety Nexo.',
        capa: capaDe('LTCAT', empresa, versao, geradoEm, [responsavelTecnico(empresa)]),
      },
      empresa.ghes.map((g) => ({
        nome: nomeGhe(g),
        descricao: descricaoGhe(g),
        colaboradores: g._count.colaboradores,
        cargos: [...new Set(colaboradores.filter((c) => c.gheId === g.id).map((c) => c.cargo))].sort(),
        agentes: g.riscos.filter((r) => ehAgenteLtcat(r.tipo)),
      })),
      { nome: empresa.responsavelTecnicoNome, registro: empresa.responsavelTecnicoRegistro },
      {
        controle: {
          sigla: 'LTCAT', titulo: 'Laudo Técnico das Condições Ambientais do Trabalho (LTCAT)', versao, emitidoEm: geradoEm, proximaRevisao, historico,
          responsavel: [empresa.responsavelTecnicoNome, empresa.responsavelTecnicoFormacao].filter(Boolean).join(', ') || null,
        },
        empresa: { razaoSocial: empresa.razaoSocial, cnae: empresa.cnae, endereco: empresa.endereco, numFuncionarios: empresa.numFuncionarios },
        formacao: empresa.responsavelTecnicoFormacao,
        representanteLegal: empresa.representanteLegalNome,
        local: cidadeDoEndereco(empresa.endereco) ?? empresa.consultoria.cidade ?? null,
      },
    );
    const pdf = await this.pdf.render(html);
    // Sem prazo fixo na lei: o painel lembra de revisar em 12 meses.
    await this.contexto.registrar(empresaId, 'LTCAT', versao, geradoEm, 12);
    return { pdf, versao };
  }
}
