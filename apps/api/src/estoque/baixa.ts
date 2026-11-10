import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Entrega = { colaboradorId: string; epi?: string; ca?: string; validadeCa?: Date | null; quantidade: number; motivo: string; dataEntrega: Date; estoqueId?: string | null };

// Registra a entrega de EPI. Se veio do almoxarifado, dá baixa no saldo na mesma operação
// (EPI, CA e validade passam a ser os do item, para não haver divergência).
export async function registrarEntrega(prisma: PrismaService, empresaId: string, d: Entrega) {
  if (!d.estoqueId) {
    if (!d.epi || !d.ca) throw new BadRequestException('Informe o EPI e o CA, ou escolha um item do almoxarifado.');
    if (d.validadeCa && d.validadeCa < d.dataEntrega) throw new BadRequestException(`O CA ${d.ca} venceu em ${d.validadeCa.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}. Não entregue EPI com CA vencido (NR-06).`);
    return prisma.entregaEpi.create({ data: { colaboradorId: d.colaboradorId, epi: d.epi, ca: d.ca, validadeCa: d.validadeCa ?? null, quantidade: d.quantidade, motivo: d.motivo, dataEntrega: d.dataEntrega } });
  }
  return prisma.$transaction(async (tx) => {
    const item = await tx.estoqueEpi.findFirst({ where: { id: d.estoqueId!, empresaId } });
    if (!item || !item.ativo) throw new NotFoundException('Item do almoxarifado não encontrado.');
    if (item.validadeCa && item.validadeCa < d.dataEntrega) throw new BadRequestException(`O CA ${item.ca} de ${item.epi} venceu em ${item.validadeCa.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}. Não entregue EPI com CA vencido (NR-06).`);
    const baixa = await tx.estoqueEpi.updateMany({ where: { id: item.id, quantidade: { gte: d.quantidade } }, data: { quantidade: { decrement: d.quantidade } } });
    if (!baixa.count) throw new BadRequestException(`Estoque insuficiente: há ${item.quantidade} unidade(s) de ${item.epi} no almoxarifado.`);
    const entrega = await tx.entregaEpi.create({ data: { colaboradorId: d.colaboradorId, epi: item.epi, ca: item.ca, validadeCa: item.validadeCa, quantidade: d.quantidade, motivo: d.motivo, dataEntrega: d.dataEntrega, estoqueId: item.id } });
    await tx.movimentoEstoque.create({ data: { estoqueId: item.id, tipo: 'SAIDA', quantidade: -d.quantidade, saldo: item.quantidade - d.quantidade, entregaEpiId: entrega.id } });
    return entrega;
  });
}
