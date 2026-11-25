import { capaDe, responsavelTecnico } from './capa';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ContextoDocumentoService } from './contexto.service';
import { PdfService } from './pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { renderPgrHtml } from './pgr.template';
import { lerAmbiente, lerFuncoes, nomeGhe, textoAmbiente } from '../empresas/ghe-ambiente';
import { cidadeDoEndereco } from './secoes';
import { compararRetratos, lerRetrato, resumoParaHistorico, tirarRetrato } from './retrato';

@Injectable()
export class PgrService {
  constructor(
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
    private readonly prisma: PrismaService,
  ) {}

  async gerarPdf(consultoriaId: string, empresaId: string): Promise<{ pdf: Buffer; versao: number }> {
    const { empresa, versao, historico, logoEmpresa, consultoria, geradoEm } = await this.contexto.carregar(consultoriaId, empresaId, 'PGR');
    const [colaboradores, terceiros] = await Promise.all([
      this.prisma.colaborador.findMany({ where: { empresaId, dataDesligamento: null }, select: { cargo: true, ghe: { select: { nome: true } } } }),
      this.prisma.terceiro.findMany({ where: { empresaId, OR: [{ fim: null }, { fim: { gte: geradoEm } }] }, select: { razaoSocial: true, servico: true }, orderBy: { razaoSocial: 'asc' } }),
    ]);
    // Trabalhadores por função e GHE, para a tabela de identificação.
    const porFuncao = new Map<string, { funcao: string; ghe: string; quantidade: number }>();
    for (const c of colaboradores) {
      const ghe = c.ghe?.nome ?? 'Sem GHE';
      const chave = `${c.cargo.trim().toLowerCase()}|${ghe}`;
      const atual = porFuncao.get(chave) ?? { funcao: c.cargo.trim(), ghe, quantidade: 0 };
      atual.quantidade += 1;
      porFuncao.set(chave, atual);
    }
    // Um número só no documento inteiro (capa, identificação e texto): quem está cadastrado e ativo.
    // Sem ninguém cadastrado ainda, vale o número que a empresa informou.
    const trabalhadores = colaboradores.length || empresa.numFuncionarios;
    const proximaRevisao = new Date(geradoEm);
    proximaRevisao.setMonth(proximaRevisao.getMonth() + 24);
    const elaborador = [empresa.responsavelTecnicoNome, empresa.responsavelTecnicoFormacao].filter(Boolean).join(', ') || null;

    // Plano de ação único da empresa: o que está aberto primeiro, por prazo.
    const acoes = await this.prisma.acaoCorretiva.findMany({ where: { empresaId }, orderBy: [{ status: 'asc' }, { prazo: 'asc' }] });
    const emergencia = (empresa.emergencia ?? {}) as { pontoEncontro?: string };

    // Retrato dos GHEs desta emissão e o que mudou desde o último PGR que tinha retrato.
    const retrato = tirarRetrato(empresa.ghes, geradoEm);
    const anterior = await this.prisma.documento.findFirst({ where: { empresaId, tipo: 'PGR', NOT: { retrato: { equals: Prisma.DbNull } } }, orderBy: { versao: 'desc' }, select: { retrato: true } });
    const retratoAnterior = lerRetrato(anterior?.retrato);
    const mudancas = versao === 1 ? null : resumoParaHistorico(retratoAnterior ? compararRetratos(retratoAnterior, retrato) : null);

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
          ['Funcionários', trabalhadores],
          ['Versão', `${versao} · emitido em ${geradoEm.toLocaleDateString('pt-BR')}`],
          ['Responsável', [empresa.responsavelTecnicoNome, empresa.responsavelTecnicoRegistro].filter(Boolean).join(' · ') || null],
        ],
        aviso: 'Feito com o Safety Nexo.',
        capa: capaDe('PGR', { ...empresa, numFuncionarios: trabalhadores }, versao, geradoEm, [responsavelTecnico(empresa)], 'revisão a cada 2 anos ou quando algo mudar'),
      },
      empresa.ghes.map((ghe) => ({
        nome: nomeGhe(ghe),
        descricao: ghe.descricao,
        setor: ghe.setor,
        funcoes: lerFuncoes(ghe.funcoes),
        ambiente: ((t) => (t && ghe.unidade ? `Unidade ${ghe.unidade}. ${t}` : t))(textoAmbiente(lerAmbiente(ghe.ambiente))),
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
        controle: { sigla: 'PGR', titulo: 'Programa de Gerenciamento de Riscos (PGR)', versao, emitidoEm: geradoEm, proximaRevisao, responsavel: elaborador, historico, mudancas, baseDados: geradoEm },
        empresa: { razaoSocial: empresa.razaoSocial, cnae: empresa.cnae, endereco: empresa.endereco, numFuncionarios: trabalhadores },
        funcoes: [...porFuncao.values()].sort((a, b) => a.ghe.localeCompare(b.ghe) || a.funcao.localeCompare(b.funcao)),
        terceiros,
        medicoPcmso: empresa.medicoPcmsoNome ? `${empresa.medicoPcmsoNome}${empresa.medicoPcmsoCrm ? ` · CRM ${empresa.medicoPcmsoCrm}` : ''}` : null,
        local: cidadeDoEndereco(empresa.endereco) ?? empresa.consultoria.cidade ?? null,
      },
    );
    const pdf = await this.pdf.render(html);

    // PGR: avaliação de riscos revista a cada 2 anos (NR-01).
    await this.contexto.registrar(empresaId, 'PGR', versao, geradoEm, 24, { retrato, mudancas: mudancas ?? undefined });
    return { pdf, versao };
  }
}
