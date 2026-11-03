import { PrismaService } from '../prisma/prisma.service';

export type TipoLista = 'DDS' | 'TREINAMENTO';

// Para os PDFs: assinatura de cada pessoa de um DDS ou turma.
export async function assinaturasDaLista(prisma: PrismaService, tipo: TipoLista, refId: string) {
  const l = await prisma.assinaturaPresenca.findMany({ where: { tipo, refId } });
  return new Map(l.map((a) => [a.colaboradorId, a]));
}
