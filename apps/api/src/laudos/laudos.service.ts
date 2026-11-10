import { Injectable, NotFoundException } from '@nestjs/common';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { DadosOs, laudoHtml, osHtml, pgrtrHtml } from './templates';

const AVISO_LAUDO = 'Feito com o Safety Nexo.';
const AVISO = 'Feito com o Safety Nexo.';
const NOCIVOS = ['FISICO', 'QUIMICO', 'BIOLOGICO'];

export type TipoLaudo = 'LIP' | 'LPP';
const TITULOS: Record<TipoLaudo, string> = {
  LIP: 'Laudo de Insalubridade e Periculosidade (LIP)',
  LPP: 'Laudo de Periculosidade (LPP)',
};

@Injectable()
export class LaudosService {
  constructor(
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
    private readonly prisma: PrismaService,
  ) {}

  private infos(empresa: { razaoSocial: string; cnpj: string; cnae: string | null; grauRisco: number | null }, versao: number, geradoEm: Date) {
    return [
      ['Empresa', empresa.razaoSocial],
      ['CNPJ', empresa.cnpj],
      ['CNAE', empresa.cnae],
      ['Grau de risco', empresa.grauRisco],
      ['Versão', `${versao} · emitido em ${geradoEm.toLocaleDateString('pt-BR')}`],
    ] as [string, string | number | null][];
  }

  async laudo(consultoriaId: string, empresaId: string, tipo: TipoLaudo) {
    const { empresa, versao, logoEmpresa, consultoria, geradoEm } = await this.contexto.carregar(consultoriaId, empresaId, tipo);
    const colaboradores = await this.prisma.colaborador.findMany({ where: { empresaId }, select: { gheId: true, cargo: true } });
    const html = laudoHtml(
      { titulo: TITULOS[tipo], logoEmpresa, consultoria, infos: this.infos(empresa, versao, geradoEm), aviso: AVISO_LAUDO },
      empresa.ghes.map((g) => ({
        nome: g.nome,
        descricao: g.descricao,
        colaboradores: g._count.colaboradores,
        cargos: [...new Set(colaboradores.filter((c) => c.gheId === g.id).map((c) => c.cargo))].sort(),
        agentes: g.riscos.filter((r) => NOCIVOS.includes(r.tipo)),
        periculosidadeAnexo: g.periculosidadeAnexo,
        periculosidadeJustificativa: g.periculosidadeJustificativa,
      })),
      { insalubridade: tipo === 'LIP', periculosidade: true },
      { nome: empresa.responsavelTecnicoNome, registro: empresa.responsavelTecnicoRegistro },
    );
    const pdf = await this.pdf.render(html);
    // Sem prazo fixo na lei: o painel lembra de revisar em 12 meses, como o LTCAT.
    await this.contexto.registrar(empresaId, tipo, versao, geradoEm, 12);
    return { pdf, versao };
  }

  async pgrtr(consultoriaId: string, empresaId: string) {
    const { empresa, versao, logoEmpresa, consultoria, geradoEm } = await this.contexto.carregar(consultoriaId, empresaId, 'PGRTR');
    const html = pgrtrHtml(
      {
        titulo: 'Programa de Gerenciamento de Riscos no Trabalho Rural (PGRTR)',
        logoEmpresa,
        consultoria,
        infos: [...this.infos(empresa, versao, geradoEm).slice(0, 4), ['Trabalhadores', empresa.numFuncionarios], this.infos(empresa, versao, geradoEm)[4]],
        aviso: 'Feito com o Safety Nexo.',
      },
      empresa.ghes.map((g) => ({ nome: g.nome, descricao: g.descricao, colaboradores: g._count.colaboradores, riscos: g.riscos })),
    );
    const pdf = await this.pdf.render(html);
    await this.contexto.registrar(empresaId, 'PGRTR', versao, geradoEm, 24);
    return { pdf, versao };
  }

  // Ordem de serviço de um trabalhador ou de todos (colaboradorId vazio).
  async ordemServico(consultoriaId: string, empresaId: string, colaboradorId?: string) {
    const { empresa, logoEmpresa, consultoria } = await this.contexto.carregar(consultoriaId, empresaId, 'OS');
    const colaboradores = await this.prisma.colaborador.findMany({
      where: { empresaId, ...(colaboradorId ? { id: colaboradorId } : {}) },
      orderBy: { nome: 'asc' },
      include: { ghe: { include: { riscos: true } }, entregasEpi: { select: { epi: true } } },
    });
    if (!colaboradores.length) throw new NotFoundException(colaboradorId ? 'Colaborador não encontrado nesta empresa' : 'Cadastre os colaboradores antes de gerar as ordens de serviço.');
    const lista: DadosOs[] = colaboradores.map((c) => ({
      colaborador: c,
      ghe: c.ghe,
      riscos: c.ghe?.riscos ?? [],
      epis: [...new Set(c.entregasEpi.map((e) => e.epi))].sort(),
    }));
    return this.pdf.render(
      osHtml({ titulo: 'Ordem de Serviço de Segurança e Saúde no Trabalho', logoEmpresa, consultoria, infos: [['Empresa', empresa.razaoSocial], ['CNPJ', empresa.cnpj]], aviso: AVISO }, lista),
    );
  }
}
