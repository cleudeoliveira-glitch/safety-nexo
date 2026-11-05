import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { CriarInspecaoDto } from './dto';
import { ehModelo } from './modelos';
import { inspecaoHtml, ItemInspecao, resumoInspecao } from './templates';

@Injectable()
export class InspecoesService {
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

  async listar(consultoriaId: string, empresaId: string) {
    const empresa = await this.empresa(consultoriaId, empresaId);
    const lista = await this.prisma.inspecao.findMany({ where: { empresaId }, orderBy: [{ data: 'desc' }, { createdAt: 'desc' }] });
    return lista.map((i) => ({ ...i, resumo: resumoInspecao(i.modelo, i.itens as unknown as ItemInspecao[], empresa.numFuncionarios) }));
  }

  async criar(consultoriaId: string, empresaId: string, dto: CriarInspecaoDto) {
    const empresa = await this.empresa(consultoriaId, empresaId);
    if (!ehModelo(dto.modelo)) throw new BadRequestException('Modelo de checklist desconhecido.');
    const itens = dto.itens.map((i) => ({
      texto: i.texto.trim(),
      resposta: i.resposta,
      ...(i.observacao?.trim() ? { observacao: i.observacao.trim() } : {}),
      ...(i.grau ? { grau: i.grau } : {}),
    }));
    const criada = await this.prisma.inspecao.create({ data: { ...dto, itens, empresaId, data: new Date(dto.data) } });
    return { ...criada, resumo: resumoInspecao(dto.modelo, itens as unknown as ItemInspecao[], empresa.numFuncionarios) };
  }

  async gerarPdf(consultoriaId: string, empresaId: string, id: string) {
    const i = await this.prisma.inspecao.findFirst({ where: { id, empresaId, empresa: { consultoriaId } } });
    if (!i) throw new NotFoundException('Inspeção não encontrada');
    const { empresa, logoEmpresa, consultoria } = await this.contexto.carregar(consultoriaId, empresaId, 'INSPECAO');
    return this.pdf.render(
      inspecaoHtml(
        {
          titulo: 'Relatório de Inspeção de Segurança',
          logoEmpresa,
          consultoria,
          infos: [['Empresa', empresa.razaoSocial], ['CNPJ', empresa.cnpj]],
          aviso: 'Documento gerado pelo Safety Nexo. As não conformidades devem ser corrigidas e acompanhadas no plano de ação.',
        },
        { ...i, itens: i.itens as unknown as ItemInspecao[] },
        empresa.numFuncionarios,
      ),
    );
  }
}
