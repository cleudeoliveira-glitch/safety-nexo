import type { PrismaClient } from '@prisma/client';
import { ILIMITADO } from '../admin/planos';

// Quem desce para um plano com menos empresas escolhe as que ficam ativas. As outras ficam só para consulta
// (vê e baixa, não muda). Nada é apagado. A escolha pode ser trocada uma vez a cada 30 dias.
export const DIAS_TROCA_ATIVAS = 30;
const DIA = 86_400_000;

type ConsultoriaAtivas = { id: string; limiteEmpresas: number; empresasAtivas: string[] };

// Ids das empresas ativas quando a conta passa do limite; null quando todas cabem no plano.
// Sem escolha feita (ou com escolha incompleta), completa com as empresas mexidas por último.
export async function empresasAtivas(prisma: PrismaClient, c: ConsultoriaAtivas): Promise<Set<string> | null> {
  if (c.limiteEmpresas >= ILIMITADO) return null;
  const empresas = await prisma.empresa.findMany({ where: { consultoriaId: c.id }, select: { id: true, createdAt: true } });
  if (empresas.length <= c.limiteEmpresas) return null;
  const existe = new Set(empresas.map((e) => e.id));
  const ativas = c.empresasAtivas.filter((id) => existe.has(id)).slice(0, c.limiteEmpresas);
  if (ativas.length < c.limiteEmpresas) {
    const uso = await prisma.historico.groupBy({ by: ['empresaId'], where: { consultoriaId: c.id, empresaId: { in: [...existe] } }, _max: { createdAt: true } });
    const ultimo = new Map(uso.map((u) => [u.empresaId, u._max.createdAt?.getTime() ?? 0]));
    const resto = empresas.filter((e) => !ativas.includes(e.id))
      .sort((a, b) => (ultimo.get(b.id) ?? 0) - (ultimo.get(a.id) ?? 0) || b.createdAt.getTime() - a.createdAt.getTime());
    ativas.push(...resto.slice(0, c.limiteEmpresas - ativas.length).map((e) => e.id));
  }
  return new Set(ativas);
}

// Quando dá para trocar a escolha de novo (null = já pode).
export function proximaTroca(escolhidaEm: Date | null, agora = new Date()): Date | null {
  if (!escolhidaEm) return null;
  const libera = new Date(escolhidaEm.getTime() + DIAS_TROCA_ATIVAS * DIA);
  return libera > agora ? libera : null;
}

// Numa empresa fora do plano, o que ainda pode: ver, baixar e excluir a própria empresa (para caber no plano).
export const liberadoForaDoPlano = (caminho: string) => /^\/empresas\/[^/]+\/excluir$/.test(caminho);

export const MENSAGEM_FORA_DO_PLANO = (cliente: boolean) =>
  cliente
    ? 'Por enquanto esta empresa está só para consulta: você pode ver e baixar tudo. Fale com a sua consultoria.'
    : 'Esta empresa está fora do seu plano atual: dá para ver e baixar tudo, mas não mudar. Em "Meu plano", escolha as empresas ativas ou volte para um plano maior. Nada foi apagado.';
