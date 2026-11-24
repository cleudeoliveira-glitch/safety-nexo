import { PrismaService } from '../prisma/prisma.service';
import { compararRetratos, lerRetrato, tirarRetrato } from '../documentos/retrato';

// NR-01, 1.5.4.4.6: a avaliação de riscos é revista a cada 2 anos ou quando acontece algo que muda os riscos.
// Aqui o sistema junta o que aconteceu depois do último PGR emitido e diz se está na hora de revisar.
export type MotivoRevisao = { texto: string; detalhe: string; base: string };

const DIA = 86_400_000;
const data = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });

export async function gatilhosRevisaoPgr(prisma: PrismaService, empresaId: string, hoje = new Date()) {
  const [pgr, empresa] = await Promise.all([
    prisma.documento.findFirst({ where: { empresaId, tipo: 'PGR' }, orderBy: { geradoEm: 'desc' } }),
    prisma.empresa.findUnique({ where: { id: empresaId }, select: { cnae: true } }),
  ]);
  if (!pgr) return { ultimoPgr: null, venceEm: null, motivos: [] as MotivoRevisao[] };
  const desde = pgr.geradoEm;
  const venceEm = pgr.vencimento ?? new Date(desde.getTime() + 730 * DIA);

  const [cats, riscos, ghes, ineficazes, residuais, alterados, normas] = await Promise.all([
    prisma.cat.findMany({ where: { empresaId, dataHora: { gt: desde } }, select: { dataHora: true, colaborador: { select: { nome: true } } } }),
    prisma.gheRisco.findMany({ where: { ghe: { empresaId }, atualizadoEm: { gt: desde } }, select: { agente: true, ghe: { select: { nome: true } } } }),
    prisma.ghe.findMany({ where: { empresaId, atualizadoEm: { gt: desde } }, select: { nome: true } }),
    prisma.acaoCorretiva.findMany({ where: { empresaId, eficaz: false, verificadaEm: { gt: desde } }, select: { descricao: true } }),
    prisma.acaoCorretiva.count({ where: { empresaId, status: 'FEITA', feitaEm: { gt: desde }, riscoId: { not: null }, verificadaEm: null } }),
    prisma.registroSaude.count({ where: { empresaId, alterado: true, createdAt: { gt: desde } } }),
    prisma.avisoNorma.findMany({ where: { criadoEm: { gt: desde } }, select: { titulo: true, cnaePrefixos: true } }),
  ]);

  const motivos: MotivoRevisao[] = [];
  const faltam = Math.ceil((venceEm.getTime() - hoje.getTime()) / DIA);
  if (faltam <= 60) motivos.push({ texto: faltam < 0 ? 'Passou de 2 anos desde o último PGR' : `Faltam ${faltam} dias para completar 2 anos`, detalhe: `Último PGR em ${data(desde)}.`, base: 'prazo de 2 anos' });
  if (cats.length) motivos.push({ texto: `${cats.length} acidente(s) depois do último PGR`, detalhe: cats.slice(0, 3).map((c) => `${c.colaborador.nome} em ${data(c.dataHora)}`).join('; '), base: 'acidente ou doença do trabalho' });
  // Com o retrato do último PGR, a comparação é exata (pega até o que foi apagado). Sem ele, vale a data da última mudança.
  const retrato = lerRetrato(pgr.retrato);
  if (retrato) {
    const atuais = await prisma.ghe.findMany({ where: { empresaId }, include: { riscos: true } });
    const m = compararRetratos(retrato, tirarRetrato(atuais, hoje));
    if (m.linhas.length) motivos.push({ texto: `Cadastro de GHEs mudou depois do último PGR (${m.total} mudança${m.total === 1 ? '' : 's'})`, detalhe: m.linhas.join('; '), base: 'mudança no ambiente, processo ou organização do trabalho' });
  } else if (riscos.length || ghes.length) {
    const onde = [...new Set([...riscos.map((r) => r.ghe.nome), ...ghes.map((g) => g.nome)])];
    motivos.push({ texto: `Inventário mudou em ${onde.length} GHE`, detalhe: `${riscos.length} risco(s) alterado(s) ou incluído(s): ${onde.slice(0, 4).join(', ')}${onde.length > 4 ? '…' : ''}`, base: 'mudança no ambiente, processo ou organização do trabalho' });
  }
  if (ineficazes.length) motivos.push({ texto: `${ineficazes.length} medida(s) que não baixaram o risco`, detalhe: ineficazes.slice(0, 2).map((a) => a.descricao).join('; '), base: 'medida insuficiente ou ineficaz' });
  if (residuais) motivos.push({ texto: `${residuais} ação(ões) concluída(s) esperando reavaliar o risco`, detalhe: 'No plano de ação, use "A medida funcionou?" para registrar o risco que sobrou.', base: 'avaliação do risco residual depois das medidas' });
  if (alterados) motivos.push({ texto: `${alterados} exame(s) com resultado alterado`, detalhe: 'Pode indicar que alguma proteção não está funcionando. Converse com o médico do PCMSO.', base: 'indício de medida ineficaz' });
  const cnae = (empresa?.cnae ?? '').replace(/\D/g, '');
  const daEmpresa = normas.filter((n) => !n.cnaePrefixos.length || n.cnaePrefixos.some((p) => cnae.startsWith(p)));
  if (daEmpresa.length) motivos.push({ texto: `${daEmpresa.length} mudança(s) em norma depois do último PGR`, detalhe: daEmpresa.slice(0, 2).map((n) => n.titulo).join('; '), base: 'mudança nos requisitos legais' });

  return { ultimoPgr: desde, venceEm, motivos };
}
