import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarItemDto, EditarItemDto, MovimentoDto } from './dto';

@Injectable()
export class EstoqueService {
  constructor(private readonly prisma: PrismaService) {}

  private async empresa(c: string, e: string) {
    const x = await this.prisma.empresa.findFirst({ where: { id: e, consultoriaId: c } });
    if (!x) throw new NotFoundException('Empresa não encontrada');
  }

  private async item(c: string, e: string, id: string) {
    await this.empresa(c, e);
    const i = await this.prisma.estoqueEpi.findFirst({ where: { id, empresaId: e } });
    if (!i) throw new NotFoundException('Item não encontrado');
    return i;
  }

  async listar(c: string, e: string) {
    await this.empresa(c, e);
    const hoje = new Date();
    const itens = await this.prisma.estoqueEpi.findMany({ where: { empresaId: e }, orderBy: [{ ativo: 'desc' }, { epi: 'asc' }] });
    return itens.map((i) => ({ ...i, baixo: i.ativo && i.quantidade <= i.minimo, caVencido: !!i.validadeCa && i.validadeCa < hoje }));
  }

  async criar(c: string, e: string, dto: CriarItemDto) {
    await this.empresa(c, e);
    const epi = dto.epi.trim(), ca = dto.ca.trim(), tamanho = dto.tamanho?.trim() || null;
    const ja = await this.prisma.estoqueEpi.findFirst({ where: { empresaId: e, ca, epi: { equals: epi, mode: 'insensitive' }, tamanho } });
    if (ja) throw new BadRequestException(`${epi} (CA ${ca}) já está no almoxarifado. Use "Entrada" para somar.`);
    return this.prisma.estoqueEpi.create({
      data: {
        empresaId: e, epi, ca, tamanho, validadeCa: dto.validadeCa ? new Date(dto.validadeCa) : null, quantidade: dto.quantidade, minimo: dto.minimo ?? 0,
        movimentos: dto.quantidade ? { create: { tipo: 'ENTRADA', quantidade: dto.quantidade, saldo: dto.quantidade, observacao: 'Saldo inicial' } } : undefined,
      },
    });
  }

  async editar(c: string, e: string, id: string, dto: EditarItemDto) {
    await this.item(c, e, id);
    return this.prisma.estoqueEpi.update({ where: { id }, data: { ...(dto.validadeCa !== undefined ? { validadeCa: dto.validadeCa ? new Date(dto.validadeCa) : null } : {}), ...(dto.minimo !== undefined ? { minimo: dto.minimo } : {}), ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}) } });
  }

  async entrada(c: string, e: string, id: string, dto: MovimentoDto) {
    await this.item(c, e, id);
    if (!dto.quantidade) throw new BadRequestException('Informe quantas unidades chegaram.');
    return this.prisma.$transaction(async (tx) => {
      const i = await tx.estoqueEpi.update({ where: { id }, data: { quantidade: { increment: dto.quantidade } } });
      await tx.movimentoEstoque.create({ data: { estoqueId: id, tipo: 'ENTRADA', quantidade: dto.quantidade, saldo: i.quantidade, observacao: dto.observacao?.trim() || null } });
      return i;
    });
  }

  // Contagem física: o saldo passa a ser o contado, e a diferença fica registrada.
  async ajuste(c: string, e: string, id: string, dto: MovimentoDto) {
    const atual = await this.item(c, e, id);
    if (!dto.observacao?.trim()) throw new BadRequestException('Diga o motivo do ajuste (ex.: contagem do mês).');
    return this.prisma.$transaction(async (tx) => {
      const i = await tx.estoqueEpi.update({ where: { id }, data: { quantidade: dto.quantidade } });
      await tx.movimentoEstoque.create({ data: { estoqueId: id, tipo: 'AJUSTE', quantidade: dto.quantidade - atual.quantidade, saldo: dto.quantidade, observacao: dto.observacao!.trim() } });
      return i;
    });
  }

  async movimentos(c: string, e: string, id: string) {
    await this.item(c, e, id);
    const ms = await this.prisma.movimentoEstoque.findMany({ where: { estoqueId: id }, orderBy: { createdAt: 'desc' }, take: 200 });
    const entregas = await this.prisma.entregaEpi.findMany({ where: { id: { in: ms.map((m) => m.entregaEpiId).filter((x): x is string => !!x) } }, include: { colaborador: { select: { nome: true } } } });
    return ms.map((m) => ({ ...m, colaborador: entregas.find((x) => x.id === m.entregaEpiId)?.colaborador.nome ?? null }));
  }
}
