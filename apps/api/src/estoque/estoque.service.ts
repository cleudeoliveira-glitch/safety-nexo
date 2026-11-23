import { trocaPrevista, vidaUtilSugerida } from './vida-util';
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

  // Trocas de EPI pela vida útil: o que já passou do prazo e o que vence nos próximos dias, por pessoa,
  // e quanto o almoxarifado precisa ter para dar conta (compra prevista).
  async trocas(c: string, e: string, dias = 30, hoje = new Date()) {
    await this.empresa(c, e);
    const limite = new Date(hoje.getTime() + dias * 86_400_000);
    const entregas = await this.prisma.entregaEpi.findMany({
      where: { devolvidoEm: null, vidaUtilDias: { gte: 7 }, colaborador: { empresaId: e, dataDesligamento: null } },
      orderBy: { dataEntrega: 'desc' },
      select: { id: true, epi: true, ca: true, quantidade: true, dataEntrega: true, vidaUtilDias: true, estoqueId: true, colaborador: { select: { id: true, nome: true, cargo: true } } },
    });
    // Só a entrega mais recente de cada EPI por pessoa: a troca registrada zera o prazo.
    const vistos = new Set<string>();
    const trocas: { entregaId: string; colaboradorId: string; nome: string; cargo: string; epi: string; ca: string; quantidade: number; entregueEm: Date; trocaEm: Date; atrasada: boolean; estoqueId: string | null }[] = [];
    for (const x of entregas) {
      const chave = `${x.colaborador.id}|${x.epi.trim().toLowerCase()}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      const quando = trocaPrevista(x.dataEntrega, x.vidaUtilDias)!;
      if (quando > limite) continue;
      trocas.push({ entregaId: x.id, colaboradorId: x.colaborador.id, nome: x.colaborador.nome, cargo: x.colaborador.cargo, epi: x.epi, ca: x.ca, quantidade: x.quantidade, entregueEm: x.dataEntrega, trocaEm: quando, atrasada: quando < hoje, estoqueId: x.estoqueId });
    }
    trocas.sort((a, b) => a.trocaEm.getTime() - b.trocaEm.getTime());
    const itens = await this.prisma.estoqueEpi.findMany({ where: { empresaId: e, id: { in: [...new Set(trocas.map((t) => t.estoqueId).filter((x): x is string => !!x))] } }, select: { id: true, epi: true, ca: true, tamanho: true, quantidade: true } });
    const compra = itens.map((i) => {
      const precisa = trocas.filter((t) => t.estoqueId === i.id).reduce((s, t) => s + t.quantidade, 0);
      return { estoqueId: i.id, epi: i.epi, ca: i.ca, tamanho: i.tamanho, saldo: i.quantidade, precisa, comprar: Math.max(0, precisa - i.quantidade) };
    }).filter((x) => x.comprar > 0);
    return { dias, trocas, compra };
  }

  async criar(c: string, e: string, dto: CriarItemDto) {
    await this.empresa(c, e);
    const epi = dto.epi.trim(), ca = dto.ca.trim(), tamanho = dto.tamanho?.trim() || null;
    const ja = await this.prisma.estoqueEpi.findFirst({ where: { empresaId: e, ca, epi: { equals: epi, mode: 'insensitive' }, tamanho } });
    if (ja) throw new BadRequestException(`${epi} (CA ${ca}) já está no almoxarifado. Use "Entrada" para somar.`);
    return this.prisma.estoqueEpi.create({
      data: {
        empresaId: e, epi, ca, tamanho, fabricante: dto.fabricante?.trim() || null, validadeCa: dto.validadeCa ? new Date(dto.validadeCa) : null, quantidade: dto.quantidade, minimo: dto.minimo ?? 0, vidaUtilDias: dto.vidaUtilDias ?? vidaUtilSugerida(epi)?.dias ?? null,
        movimentos: dto.quantidade ? { create: { tipo: 'ENTRADA', quantidade: dto.quantidade, saldo: dto.quantidade, observacao: 'Saldo inicial' } } : undefined,
      },
    });
  }

  async editar(c: string, e: string, id: string, dto: EditarItemDto) {
    await this.item(c, e, id);
    return this.prisma.estoqueEpi.update({ where: { id }, data: { ...(dto.fabricante !== undefined ? { fabricante: dto.fabricante.trim() || null } : {}), ...(dto.validadeCa !== undefined ? { validadeCa: dto.validadeCa ? new Date(dto.validadeCa) : null } : {}), ...(dto.minimo !== undefined ? { minimo: dto.minimo } : {}), ...(dto.vidaUtilDias !== undefined ? { vidaUtilDias: dto.vidaUtilDias } : {}), ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}) } });
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
