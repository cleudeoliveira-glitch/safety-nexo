import { NotFoundException, SetMetadata } from '@nestjs/common';
import { PERMITE_EMPRESA } from '../auth/permite-empresa.decorator';
import { PrismaService } from '../prisma/prisma.service';

// Apagar um documento é só da consultoria, mesmo quando a tela também abre para o login da empresa.
export const SoConsultoria = () => SetMetadata(PERMITE_EMPRESA, false);

// Confere se a empresa é desta consultoria antes de apagar qualquer coisa dela.
export async function empresaDaConsultoria(prisma: PrismaService, consultoriaId: string, empresaId: string) {
  const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId }, select: { id: true } });
  if (!empresa) throw new NotFoundException('Empresa não encontrada');
}

// deleteMany devolve quantos apagou: zero quer dizer que o documento não é desta empresa (ou já tinha saído).
export function conferirApagado(count: number, mensagem: string) {
  if (!count) throw new NotFoundException(mensagem);
  return { ok: true };
}

// Lista de presença (assinatura no toque e pelo rosto) de um DDS ou turma que foi apagado.
export async function apagarPresencas(prisma: PrismaService, tipo: 'DDS' | 'TREINAMENTO', refId: string) {
  await prisma.assinaturaPresenca.deleteMany({ where: { tipo, refId } });
  await prisma.presencaFacial.deleteMany({ where: { tipo, refId } });
}

// Documento que já foi para o eSocial não some daqui: a exclusão precisa ser feita lá (S-3000).
export async function jaFoiAoEsocial(prisma: PrismaService, empresaId: string, referenciaId: string) {
  const ev = await prisma.eventoEsocial.findFirst({ where: { empresaId, referenciaId, status: { in: ['ENVIADO', 'PROCESSADO'] } }, select: { id: true } });
  return !!ev;
}
