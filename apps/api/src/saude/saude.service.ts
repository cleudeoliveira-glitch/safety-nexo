import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { AtualizarCatEsocialDto, CriarAetDto, CriarCatDto } from './dto';
import { prazoCat } from './prazo-cat';
import { AetPdf, aetHtml, catHtml } from './templates';

const AVISO = 'Documento gerado pelo Safety Nexo. Deve ser conferido e assinado pelos responsáveis.';

@Injectable()
export class SaudeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
  ) {}

  private async empresa(consultoriaId: string, empresaId: string) {
    const empresa = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId } });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    return empresa;
  }

  private async moldura(consultoriaId: string, empresaId: string, titulo: string, tipo: string) {
    const { empresa, logoEmpresa, consultoria } = await this.contexto.carregar(consultoriaId, empresaId, tipo);
    return { titulo, logoEmpresa, consultoria, aviso: AVISO, infos: [['Empresa', empresa.razaoSocial], ['CNPJ', empresa.cnpj]] as [string, string][] };
  }

  // AET
  async listarAets(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    return this.prisma.aet.findMany({ where: { empresaId }, orderBy: [{ data: 'desc' }, { createdAt: 'desc' }] });
  }

  async criarAet(consultoriaId: string, empresaId: string, dto: CriarAetDto) {
    await this.empresa(consultoriaId, empresaId);
    return this.prisma.aet.create({
      data: { ...dto, empresaId, data: new Date(dto.data), recomendacoes: dto.recomendacoes.map((r) => ({ ...r })) },
    });
  }

  async pdfAet(consultoriaId: string, empresaId: string, id: string) {
    await this.empresa(consultoriaId, empresaId);
    const aet = await this.prisma.aet.findFirst({ where: { id, empresaId } });
    if (!aet) throw new NotFoundException('AET não encontrada');
    const moldura = await this.moldura(consultoriaId, empresaId, 'Análise Ergonômica do Trabalho (AET)', 'AET');
    return this.pdf.render(aetHtml(moldura, { ...aet, recomendacoes: aet.recomendacoes as AetPdf['recomendacoes'] }));
  }

  // CAT
  async listarCats(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    const cats = await this.prisma.cat.findMany({
      where: { empresaId },
      orderBy: { dataHora: 'desc' },
      include: { colaborador: { select: { nome: true, cargo: true } } },
    });
    return cats.map((c) => ({ ...c, prazo: prazoCat(c.dataHora, c.houveObito) }));
  }

  async criarCat(consultoriaId: string, empresaId: string, dto: CriarCatDto) {
    await this.empresa(consultoriaId, empresaId);
    if (!(await this.prisma.colaborador.findFirst({ where: { id: dto.colaboradorId, empresaId } }))) {
      throw new NotFoundException('Colaborador não encontrado nesta empresa');
    }
    const dataHora = new Date(dto.dataHora);
    if (dataHora > new Date()) throw new BadRequestException('A data do acidente não pode estar no futuro.');
    const cat = await this.prisma.cat.create({
      data: {
        ...dto,
        empresaId,
        dataHora,
        houveObito: dto.houveObito ?? dto.tipoCat === 'OBITO',
        atendimentoData: dto.atendimentoData ? new Date(dto.atendimentoData) : null,
        esocial: dto.esocial ? JSON.parse(JSON.stringify(dto.esocial)) : undefined,
      },
    });
    return { ...cat, prazo: prazoCat(cat.dataHora, cat.houveObito) };
  }

  // Completa os dados da CAT exigidos pelo S-2210 (códigos das tabelas, endereço, atestado).
  async atualizarEsocialCat(consultoriaId: string, empresaId: string, id: string, dto: AtualizarCatEsocialDto) {
    await this.empresa(consultoriaId, empresaId);
    const cat = await this.prisma.cat.findFirst({ where: { id, empresaId } });
    if (!cat) throw new NotFoundException('CAT não encontrada');
    const { horasTrabalhadas, atendimentoData, medicoNome, medicoCrm, cid, diasTratamento, ...codigos } = dto;
    const esocial = { ...((cat.esocial as object | null) ?? {}), ...JSON.parse(JSON.stringify(codigos)) };
    return this.prisma.cat.update({
      where: { id },
      data: {
        esocial, horasTrabalhadas, medicoNome, medicoCrm, cid, diasTratamento,
        atendimentoData: atendimentoData ? new Date(atendimentoData) : undefined,
      },
    });
  }

  async marcarEnviada(consultoriaId: string, empresaId: string, id: string, recibo: string) {
    await this.empresa(consultoriaId, empresaId);
    const { count } = await this.prisma.cat.updateMany({ where: { id, empresaId }, data: { enviadaEm: new Date(), recibo: recibo.trim() } });
    if (!count) throw new NotFoundException('CAT não encontrada');
    return { ok: true };
  }

  async pdfCat(consultoriaId: string, empresaId: string, id: string) {
    await this.empresa(consultoriaId, empresaId);
    const cat = await this.prisma.cat.findFirst({ where: { id, empresaId }, include: { colaborador: true } });
    if (!cat) throw new NotFoundException('CAT não encontrada');
    const moldura = await this.moldura(consultoriaId, empresaId, 'Comunicação de Acidente de Trabalho (CAT)', 'CAT');
    return this.pdf.render(catHtml(moldura, { ...cat, trabalhador: cat.colaborador, prazo: prazoCat(cat.dataHora, cat.houveObito) }));
  }
}
