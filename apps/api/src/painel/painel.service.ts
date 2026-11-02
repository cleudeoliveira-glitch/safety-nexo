import { Injectable, NotFoundException } from '@nestjs/common';
import { situacaoCipa } from '../cipa/cipa.service';
import { PrismaService } from '../prisma/prisma.service';

export type Pendencia = { titulo: string; detalhe: string; nivel: 'vencido' | 'pendente' | 'em-dia' };

const DIA_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PainelService {
  constructor(private readonly prisma: PrismaService) {}

  async montar(consultoriaId: string, empresaId: string, hoje = new Date()) {
    const empresa = await this.prisma.empresa.findFirst({
      where: { id: empresaId, consultoriaId },
      include: {
        ghes: { include: { _count: { select: { riscos: true, exames: true, colaboradores: true } } } },
        colaboradores: {
          select: {
            nome: true,
            gheId: true,
            asos: { orderBy: { dataExame: 'desc' }, take: 1, select: { proximoExame: true } },
            entregasEpi: { orderBy: { dataEntrega: 'desc' }, select: { epi: true, validadeCa: true } },
          },
        },
        documentos: { orderBy: { geradoEm: 'desc' } },
      },
    });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');

    const pendencias: Pendencia[] = [];
    const ghesSemRisco = empresa.ghes.filter((g) => g._count.riscos === 0).length;
    const semColaboradores = empresa.colaboradores.length === 0;

    // Cada item vale uma parte do percentual. Sem "falta", o item conta mas não vira tarefa,
    // para não repetir o que um item anterior já pede.
    const itens: { ok: boolean; falta?: Omit<Pendencia, 'nivel'> }[] = [
      {
        ok: Boolean(empresa.cnae && empresa.grauRisco && empresa.numFuncionarios > 0),
        falta: { titulo: 'Complete os dados da empresa', detalhe: 'CNAE, grau de risco e número de funcionários' },
      },
      {
        ok: empresa.ghes.length > 0,
        falta: { titulo: 'Cadastre ao menos um GHE', detalhe: 'O PGR precisa dos grupos de exposição' },
      },
      {
        ok: empresa.ghes.length > 0 && ghesSemRisco === 0,
        falta:
          empresa.ghes.length > 0
            ? { titulo: `PGR: faltam riscos em ${ghesSemRisco} GHE`, detalhe: 'Cada GHE precisa de pelo menos um risco' }
            : undefined,
      },
      {
        ok: !semColaboradores && empresa.colaboradores.every((c) => c.gheId),
        falta: semColaboradores
          ? { titulo: 'Cadastre os colaboradores', detalhe: 'Eles entram no PGR pelo GHE' }
          : { titulo: 'Vincule os colaboradores a um GHE', detalhe: 'Todo colaborador precisa estar em um GHE' },
      },
    ];
    for (const item of itens) if (!item.ok && item.falta) pendencias.push({ ...item.falta, nivel: 'pendente' });

    // Só o documento mais recente de cada tipo conta para o vencimento.
    const ultimos = new Map<string, (typeof empresa.documentos)[number]>();
    for (const doc of empresa.documentos) if (!ultimos.has(doc.tipo)) ultimos.set(doc.tipo, doc);

    const pgr = ultimos.get('PGR');
    if (!pgr) pendencias.push({ titulo: 'Gere o primeiro PGR', detalhe: 'Nenhum PGR emitido para esta empresa', nivel: 'pendente' });

    // O PCMSO vem depois do PGR: só aparece como tarefa quando o PGR já existe.
    if (pgr) {
      const ghesSemExame = empresa.ghes.filter((g) => g._count.exames === 0).length;
      if (ghesSemExame > 0) {
        pendencias.push({ titulo: `PCMSO: faltam exames em ${ghesSemExame} GHE`, detalhe: 'Programe os exames de cada GHE', nivel: 'pendente' });
      } else if (!ultimos.get('PCMSO')) {
        pendencias.push({ titulo: 'Gere o primeiro PCMSO', detalhe: 'Os exames já estão programados', nivel: 'pendente' });
      }
    }

    pendencias.push(...this.pendenciasDosColaboradores(empresa.colaboradores, hoje));
    pendencias.push(...this.pendenciasDaCipa(empresa, hoje));

    const vencimentos = [...ultimos.values()]
      .filter((doc) => doc.vencimento)
      .map((doc) => {
        const dias = Math.ceil((doc.vencimento!.getTime() - hoje.getTime()) / DIA_MS);
        return { tipo: doc.tipo, versao: doc.versao, vencimento: doc.vencimento, dias };
      })
      .sort((a, b) => a.dias - b.dias);

    for (const v of vencimentos) {
      if (v.dias < 0) pendencias.unshift({ titulo: `${v.tipo} vencido`, detalhe: `Venceu há ${-v.dias} dia(s)`, nivel: 'vencido' });
      else if (v.dias <= 30) pendencias.push({ titulo: `${v.tipo} vence em ${v.dias} dia(s)`, detalhe: 'Programe a revisão', nivel: 'pendente' });
    }

    const concluidos = itens.filter((i) => i.ok).length + (pgr && (!pgr.vencimento || pgr.vencimento > hoje) ? 1 : 0);
    const percentual = Math.round((concluidos / (itens.length + 1)) * 100);

    return {
      empresa: { id: empresa.id, razaoSocial: empresa.razaoSocial, cnpj: empresa.cnpj },
      percentual,
      pendencias,
      vencimentos,
    };
  }

  private pendenciasDaCipa(empresa: Parameters<typeof situacaoCipa>[0], hoje: Date): Pendencia[] {
    const { dimensionamento: d, calendario: c, atendidaSesmt, representante } = situacaoCipa(empresa);
    const data = (x: Date) => x.toLocaleDateString('pt-BR', { timeZone: 'UTC' });

    if (d.situacao === 'REPRESENTANTE') {
      if (atendidaSesmt || representante) return [];
      return [{ titulo: 'Nomeie o representante da NR-05', detalhe: 'A empresa não precisa de CIPA, mas precisa de um representante', nivel: 'pendente' }];
    }
    if (d.situacao !== 'CIPA') return [];
    if (!c) {
      return [{
        titulo: 'Organize a CIPA',
        detalhe: `${d.efetivos} efetivo(s) e ${d.suplentes} suplente(s) de cada lado. Informe o mandato atual, se já houver`,
        nivel: 'pendente',
      }];
    }
    if (c.fimMandato < hoje) return [{ titulo: 'Mandato da CIPA vencido', detalhe: `Terminou em ${data(c.fimMandato)}`, nivel: 'vencido' }];
    if (c.eleicaoAte < hoje) return [{ titulo: 'Eleição da CIPA atrasada', detalhe: `Devia ocorrer até ${data(c.eleicaoAte)}`, nivel: 'vencido' }];
    if (c.convocacaoAte < hoje) {
      return [{ titulo: 'Edital da CIPA atrasado', detalhe: `A convocação devia sair até ${data(c.convocacaoAte)}; eleição até ${data(c.eleicaoAte)}`, nivel: 'vencido' }];
    }
    const dias = Math.ceil((c.convocacaoAte.getTime() - hoje.getTime()) / DIA_MS);
    if (dias <= 30) return [{ titulo: `Publique o edital da CIPA em até ${dias} dia(s)`, detalhe: `Prazo: ${data(c.convocacaoAte)}`, nivel: 'pendente' }];
    return [];
  }

  // ASO e CA viram uma tarefa por situação, com os nomes, para não lotar o painel.
  private pendenciasDosColaboradores(
    colaboradores: { nome: string; asos: { proximoExame: Date | null }[]; entregasEpi: { epi: string; validadeCa: Date | null }[] }[],
    hoje: Date,
  ): Pendencia[] {
    const asoVencido: string[] = [];
    const asoAVencer: string[] = [];
    const caVencido: string[] = [];
    for (const c of colaboradores) {
      const proximo = c.asos[0]?.proximoExame;
      if (proximo) {
        const dias = Math.ceil((proximo.getTime() - hoje.getTime()) / DIA_MS);
        if (dias < 0) asoVencido.push(c.nome);
        else if (dias <= 30) asoAVencer.push(c.nome);
      }
      // Só a entrega mais recente de cada EPI conta: uma troca resolve o CA vencido.
      const vistos = new Set<string>();
      for (const e of c.entregasEpi) {
        const chave = e.epi.trim().toLowerCase();
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        if (e.validadeCa && e.validadeCa < hoje) caVencido.push(`${e.epi} (${c.nome})`);
      }
    }

    const lista = (nomes: string[]) => (nomes.length > 3 ? `${nomes.slice(0, 3).join(', ')} e mais ${nomes.length - 3}` : nomes.join(', '));
    const pendencias: Pendencia[] = [];
    if (asoVencido.length) pendencias.push({ titulo: `ASO vencido: ${asoVencido.length} colaborador(es)`, detalhe: lista(asoVencido), nivel: 'vencido' });
    if (caVencido.length) pendencias.push({ titulo: `EPI com CA vencido: ${caVencido.length}`, detalhe: `Troque o EPI: ${lista(caVencido)}`, nivel: 'vencido' });
    if (asoAVencer.length) pendencias.push({ titulo: `ASO vence em até 30 dias: ${asoAVencer.length}`, detalhe: lista(asoAVencer), nivel: 'pendente' });
    return pendencias;
  }
}
