import { Injectable, NotFoundException } from '@nestjs/common';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { calcular } from './calculo';
import { FapRatDto } from './dto';
import { relatorioFapHtml } from './template';

const DIA = 86_400_000;

@Injectable()
export class FapService {
  constructor(private readonly prisma: PrismaService, private readonly contexto: ContextoDocumentoService, private readonly pdf: PdfService) {}

  private async empresa(consultoriaId: string, empresaId: string) {
    const e = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId }, select: { id: true, cnae: true, razaoSocial: true } });
    if (!e) throw new NotFoundException('Empresa não encontrada');
    return e;
  }

  // O que o sistema sabe e que pesa no FAP: acidentes com CAT e afastamentos por acidente/doença do trabalho
  // que passaram de 15 dias (a partir do 16º dia o INSS paga o benefício).
  async ocorrencias(empresaId: string, hoje = new Date()) {
    const desde = new Date(hoje.getTime() - 730 * DIA);
    const [cats, afast] = await Promise.all([
      this.prisma.cat.findMany({ where: { empresaId, dataHora: { gte: desde } }, select: { tipoCat: true, houveAfastamento: true, houveObito: true } }),
      this.prisma.afastamento.findMany({ where: { empresaId, motivo: '01', OR: [{ fim: null }, { fim: { gte: desde } }] }, select: { inicio: true, fim: true } }),
    ]);
    const longos = afast.filter((a) => ((a.fim ?? hoje).getTime() - a.inicio.getTime()) / DIA + 1 > 15).length;
    return {
      desde,
      cats: cats.filter((c) => c.tipoCat !== 'REABERTURA').length,
      comAfastamento: cats.filter((c) => c.houveAfastamento).length,
      obitos: cats.filter((c) => c.houveObito || c.tipoCat === 'OBITO').length,
      afastamentosInss: longos,
    };
  }

  async listar(c: string, e: string) {
    const emp = await this.empresa(c, e);
    const anos = await this.prisma.fapRat.findMany({ where: { empresaId: e }, orderBy: { ano: 'desc' } });
    return {
      cnae: emp.cnae,
      anos: anos.map((a) => ({ id: a.id, ano: a.ano, observacao: a.observacao, folhaMensal: a.folhaMensal == null ? null : Number(a.folhaMensal), ...calcular(a.rat, Number(a.fap), a.folhaMensal == null ? null : Number(a.folhaMensal)) })),
      ocorrencias: await this.ocorrencias(e),
    };
  }

  async salvar(c: string, e: string, dto: FapRatDto) {
    await this.empresa(c, e);
    const dados = { rat: dto.rat, fap: dto.fap, folhaMensal: dto.folhaMensal ?? null, observacao: dto.observacao?.trim() || null };
    return this.prisma.fapRat.upsert({ where: { empresaId_ano: { empresaId: e, ano: dto.ano } }, create: { empresaId: e, ano: dto.ano, ...dados }, update: dados, select: { id: true, ano: true } });
  }

  async remover(c: string, e: string, id: string) {
    await this.empresa(c, e);
    const r = await this.prisma.fapRat.deleteMany({ where: { id, empresaId: e } });
    if (!r.count) throw new NotFoundException('Ano não encontrado');
    return { ok: true };
  }

  async relatorio(c: string, e: string) {
    const dados = await this.listar(c, e);
    if (!dados.anos.length) throw new NotFoundException('Informe o FAP de pelo menos um ano para gerar o relatório.');
    const { empresa, logoEmpresa, consultoria } = await this.contexto.carregar(c, e, 'FAP-RAT');
    const m = { titulo: 'FAP e RAT: quanto a segurança custa na folha', logoEmpresa, consultoria, aviso: 'Documento gerado pelo Safety Nexo. Valores estimados: confira com a folha e o FAP oficial.', infos: [['Empresa', empresa.razaoSocial], ['CNPJ', empresa.cnpj], ['CNAE', dados.cnae ?? 'não informado']] as [string, string][] };
    return this.pdf.render(relatorioFapHtml(m, dados.anos, dados.ocorrencias));
  }
}
