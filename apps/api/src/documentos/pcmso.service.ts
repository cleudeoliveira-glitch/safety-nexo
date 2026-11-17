import { capaDe, responsavelTecnico } from './capa';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DadosAno, relatorioPcmsoHtml, resumoAno } from './relatorio-pcmso';
import { ContextoDocumentoService } from './contexto.service';
import { renderPcmsoHtml } from './pcmso.template';
import { PdfService } from './pdf.service';
import { cidadeDoEndereco } from './secoes';

@Injectable()
export class PcmsoService {
  constructor(
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
    private readonly prisma: PrismaService,
  ) {}

  // Relatório analítico do ano (NR-07). Compara com o ano anterior.
  async relatorioAnalitico(consultoriaId: string, empresaId: string, ano: number): Promise<Buffer> {
    const { empresa, logoEmpresa, consultoria, geradoEm } = await this.contexto.carregar(consultoriaId, empresaId, 'RELATORIO_PCMSO');
    const [atual, anterior] = await Promise.all([this.dadosDoAno(empresaId, ano), this.dadosDoAno(empresaId, ano - 1)]);
    const html = relatorioPcmsoHtml(
      {
        titulo: `Relatório analítico do PCMSO · ${ano}`,
        logoEmpresa,
        consultoria,
        infos: [
          ['Empresa', empresa.razaoSocial],
          ['CNPJ', empresa.cnpj],
          ['Período', `01/01/${ano} a 31/12/${ano}`],
          ['Emitido em', geradoEm.toLocaleDateString('pt-BR')],
        ],
        aviso: 'Feito com o Safety Nexo.',
      },
      { nome: empresa.medicoPcmsoNome, crm: empresa.medicoPcmsoCrm },
      ano,
      resumoAno(atual),
      resumoAno(anterior),
    );
    return this.pdf.render(html);
  }

  private async dadosDoAno(empresaId: string, ano: number): Promise<DadosAno> {
    const de = new Date(Date.UTC(ano, 0, 1));
    const ate = new Date(Date.UTC(ano + 1, 0, 1));
    const setor = (c: { ghe: { nome: string } | null }) => c.ghe?.nome ?? 'Sem GHE';
    const doColaborador = { select: { ghe: { select: { nome: true } } } };
    const [asos, registros, cats, trabalhadores] = await Promise.all([
      this.prisma.aso.findMany({ where: { colaborador: { empresaId }, dataExame: { gte: de, lt: ate } }, select: { colaboradorId: true, dataExame: true, tipo: true, resultado: true, exames: true, colaborador: doColaborador } }),
      this.prisma.registroSaude.findMany({ where: { empresaId, tipo: { not: 'VACINA' }, data: { gte: de, lt: ate } }, select: { colaboradorId: true, data: true, tipo: true, titulo: true, alterado: true, colaborador: doColaborador } }),
      this.prisma.cat.findMany({ where: { empresaId, dataHora: { gte: de, lt: ate } }, select: { tipoCat: true, tipoAcidente: true, colaborador: doColaborador } }),
      this.prisma.colaborador.count({
        where: { empresaId, OR: [{ dataAdmissao: null }, { dataAdmissao: { lt: ate } }], AND: [{ OR: [{ dataDesligamento: null }, { dataDesligamento: { gte: de } }] }] },
      }),
    ]);
    return {
      asos: asos.map((a) => ({ colaboradorId: a.colaboradorId, data: a.dataExame, tipo: a.tipo, resultado: a.resultado, exames: a.exames, setor: setor(a.colaborador) })),
      complementares: registros.map((r) => ({ colaboradorId: r.colaboradorId, data: r.data, tipo: r.tipo, titulo: r.titulo, alterado: r.alterado, setor: setor(r.colaborador) })),
      cats: cats.map((c) => ({ tipoCat: c.tipoCat, tipoAcidente: c.tipoAcidente, setor: setor(c.colaborador) })),
      trabalhadores,
    };
  }

  async gerarPdf(consultoriaId: string, empresaId: string): Promise<{ pdf: Buffer; versao: number }> {
    const { empresa, versao, historico, logoEmpresa, consultoria, geradoEm } = await this.contexto.carregar(consultoriaId, empresaId, 'PCMSO');
    const colaboradores = await this.prisma.colaborador.findMany({ where: { empresaId, dataDesligamento: null }, select: { gheId: true, cargo: true } });
    const proximaRevisao = new Date(geradoEm);
    proximaRevisao.setMonth(proximaRevisao.getMonth() + 12);
    const divisao = Number((empresa.cnae ?? '').replace(/\D/g, '').slice(0, 2));

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
        capa: capaDe('PCMSO', empresa, versao, geradoEm, [{ papel: 'Médico responsável', nome: empresa.medicoPcmsoNome, registro: empresa.medicoPcmsoCrm }]),
      },
      { nome: empresa.medicoPcmsoNome, crm: empresa.medicoPcmsoCrm },
      empresa.ghes.map((ghe) => ({
        nome: ghe.nome,
        colaboradores: ghe._count.colaboradores,
        riscos: ghe.riscos.map((r) => r.agente),
        funcoes: [...new Set(colaboradores.filter((c) => c.gheId === ghe.id).map((c) => c.cargo.trim()))].sort(),
        exames: ghe.exames,
      })),
      {
        controle: {
          sigla: 'PCMSO', titulo: 'Programa de Controle Médico de Saúde Ocupacional (PCMSO)', versao, emitidoEm: geradoEm, proximaRevisao, historico,
          responsavel: empresa.medicoPcmsoNome ? `${empresa.medicoPcmsoNome}${empresa.medicoPcmsoCrm ? `, CRM ${empresa.medicoPcmsoCrm}` : ''}` : null,
        },
        empresa: { razaoSocial: empresa.razaoSocial, cnae: empresa.cnae, grauRisco: empresa.grauRisco, endereco: empresa.endereco, numFuncionarios: empresa.numFuncionarios },
        responsavelPgr: empresa.responsavelTecnicoNome,
        representanteLegal: empresa.representanteLegalNome,
        servicoSaude: divisao === 86 || divisao === 75,
        local: cidadeDoEndereco(empresa.endereco) ?? empresa.consultoria.cidade ?? null,
      },
    );
    const pdf = await this.pdf.render(html);

    // PCMSO: revisão anual, junto com o relatório analítico (NR-07).
    await this.contexto.registrar(empresaId, 'PCMSO', versao, geradoEm, 12);
    return { pdf, versao };
  }
}
