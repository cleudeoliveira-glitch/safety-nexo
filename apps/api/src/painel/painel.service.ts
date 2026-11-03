import { situacaoAfastamento } from '../saude/saude.service';
import { alertasInss } from '../conectores/absenteismo';
import { dimensionarBrigada } from '../emergencia/it17';
import { Injectable, NotFoundException } from '@nestjs/common';
import { situacaoCipa } from '../cipa/cipa.service';
import { prazoCat } from '../saude/prazo-cat';
import { PrismaService } from '../prisma/prisma.service';
import { validadeDaTurma } from '../treinamentos/treinamentos.service';

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
            id: true,
            nome: true,
            dataAdmissao: true,
            gheId: true,
            asos: { orderBy: { dataExame: 'desc' }, take: 1, select: { proximoExame: true } },
            entregasEpi: { orderBy: { dataEntrega: 'desc' }, select: { epi: true, validadeCa: true } },
            treinamentos: { select: { turma: { select: { nome: true, fim: true, validadeMeses: true } } } },
          },
        },
        documentos: { orderBy: { geradoEm: 'desc' } },
        cats: { where: { enviadaEm: null }, include: { colaborador: { select: { nome: true } } } },
        afastamentos: { where: { motivo: { in: ['01', '03'] } }, include: { colaborador: { select: { nome: true, asos: { where: { tipo: 'RETORNO_TRABALHO' }, select: { dataExame: true } } } } } },
        controlesEmergencia: { where: { validade: { not: null } } },
        atestados: { where: { inicio: { gte: new Date(Date.now() - 180 * DIA_MS) } } },
        terceiros: { where: { OR: [{ fim: null }, { fim: { gte: new Date() } }] }, select: { razaoSocial: true, documentos: { where: { validade: { lt: new Date() } }, select: { tipo: true } } } },
        turmas: { where: { norma: 'IT-17' }, select: { fim: true, validadeMeses: true, participantes: { select: { colaboradorId: true } } } },
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
    pendencias.push(...this.pendenciasDeTreinamento(empresa.colaboradores, hoje));

    // CAT sem envio ao eSocial: atrasada vira item vencido, no prazo vira tarefa do dia.
    for (const cat of empresa.cats) {
      const prazo = prazoCat(cat.dataHora, cat.houveObito);
      const quando = prazo.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      if (prazo < hoje) pendencias.unshift({ titulo: `CAT fora do prazo: ${cat.colaborador.nome}`, detalhe: `Devia ser enviada até ${quando}. Envie pelo eSocial e registre o recibo`, nivel: 'vencido' });
      else pendencias.unshift({ titulo: `Envie a CAT de ${cat.colaborador.nome}`, detalhe: `Prazo: ${quando} (eSocial S-2210)`, nivel: 'pendente' });
    }

    // NR-07, 7.5.9: volta de afastamento de 30 dias ou mais por doença ou acidente pede ASO de retorno.
    for (const af of empresa.afastamentos) {
      const sit = situacaoAfastamento(af, af.colaborador.asos.map((x) => x.dataExame));
      if (!sit.pedeRetorno || sit.asoRetorno) continue;
      if (af.fim) pendencias.unshift({ titulo: `ASO de retorno de ${af.colaborador.nome}`, detalhe: `Afastado por ${sit.dias} dias: faça o exame de retorno antes de voltar ao trabalho (NR-07)`, nivel: 'vencido' });
      else pendencias.push({ titulo: `${af.colaborador.nome} afastado há ${sit.dias} dias`, detalhe: 'Na volta, faça o ASO de retorno antes de reassumir (NR-07)', nivel: 'pendente' });
    }

    // Atestados da mesma doença somando mais de 15 dias em 60 dias: do 16º dia em diante é com o INSS.
    const afastadosAgora = new Set(empresa.afastamentos.filter((a) => !a.fim).map((a) => a.colaboradorId));
    for (const al of alertasInss(empresa.colaboradores, empresa.atestados)) {
      if (afastadosAgora.has(al.colaboradorId)) continue;
      pendencias.unshift({ titulo: `${al.nome}: ${al.dias} dias de atestado`, detalhe: 'Passou de 15 dias pela mesma doença: encaminhe ao INSS e registre o afastamento (Lei 8.213/91, art. 60)', nivel: 'vencido' });
    }
    for (const t of empresa.terceiros) {
      if (t.documentos.length) pendencias.push({ titulo: `Documento vencido da terceirizada ${t.razaoSocial}`, detalhe: t.documentos.map((d) => d.tipo).join(', '), nivel: 'vencido' });
    }

    pendencias.push(...this.pendenciasDeEmergencia(empresa, hoje));

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

  // Vale o treinamento mais recente de cada tipo: uma reciclagem resolve o vencido.
  // Brigada abaixo do mínimo da IT 17 e AVCB, extintores e outros itens vencidos ou vencendo.
  private pendenciasDeEmergencia(
    empresa: {
      emergencia: unknown;
      controlesEmergencia: { tipo: string; descricao: string; validade: Date | null }[];
      turmas: { fim: Date; validadeMeses: number | null; participantes: { colaboradorId: string }[] }[];
    },
    hoje: Date,
  ): Pendencia[] {
    const pendencias: Pendencia[] = [];
    const config = empresa.emergencia as { divisao: string; risco: string; populacaoPorPavimento: number[] } | null;
    if (config) {
      const calculo = dimensionarBrigada(config.divisao, config.risco, config.populacaoPorPavimento);
      const treinados = new Set(
        empresa.turmas.filter((t) => { const v = validadeDaTurma(t); return !v || v >= hoje; }).flatMap((t) => t.participantes.map((p) => p.colaboradorId)),
      ).size;
      if (calculo?.total && treinados < calculo.total) {
        pendencias.push({ titulo: `Brigada incompleta: ${treinados} de ${calculo.total}`, detalhe: 'Treine mais brigadistas (IT 17) em Pessoas e Cultura', nivel: treinados === 0 ? 'vencido' : 'pendente' });
      }
    }
    for (const c of empresa.controlesEmergencia) {
      const dias = Math.ceil((c.validade!.getTime() - hoje.getTime()) / DIA_MS);
      const nome = `${c.tipo === 'AVCB' || c.tipo === 'CLCB' ? c.tipo : c.descricao}`;
      if (dias < 0) pendencias.unshift({ titulo: `${nome} vencido`, detalhe: `Venceu há ${-dias} dia(s)`, nivel: 'vencido' });
      else if (dias <= (c.tipo === 'AVCB' || c.tipo === 'CLCB' ? 90 : 30)) pendencias.push({ titulo: `${nome} vence em ${dias} dia(s)`, detalhe: c.tipo === 'AVCB' || c.tipo === 'CLCB' ? 'Comece a renovação junto ao Corpo de Bombeiros' : 'Programe a recarga ou manutenção', nivel: 'pendente' });
    }
    return pendencias;
  }

  private pendenciasDeTreinamento(
    colaboradores: { nome: string; treinamentos: { turma: { nome: string; fim: Date; validadeMeses: number | null } }[] }[],
    hoje: Date,
  ): Pendencia[] {
    const vencidos: string[] = [];
    const aVencer: string[] = [];
    for (const c of colaboradores) {
      const ultimo = new Map<string, Date | null>();
      for (const { turma } of [...c.treinamentos].sort((a, b) => b.turma.fim.getTime() - a.turma.fim.getTime())) {
        if (!ultimo.has(turma.nome)) ultimo.set(turma.nome, validadeDaTurma(turma));
      }
      for (const [nome, validade] of ultimo) {
        if (!validade) continue;
        const dias = Math.ceil((validade.getTime() - hoje.getTime()) / DIA_MS);
        if (dias < 0) vencidos.push(`${nome} (${c.nome})`);
        else if (dias <= 30) aVencer.push(`${nome} (${c.nome})`);
      }
    }
    const lista = (itens: string[]) => (itens.length > 3 ? `${itens.slice(0, 3).join(', ')} e mais ${itens.length - 3}` : itens.join(', '));
    const pendencias: Pendencia[] = [];
    if (vencidos.length) pendencias.push({ titulo: `Treinamento vencido: ${vencidos.length}`, detalhe: lista(vencidos), nivel: 'vencido' });
    if (aVencer.length) pendencias.push({ titulo: `Treinamento vence em até 30 dias: ${aVencer.length}`, detalhe: lista(aVencer), nivel: 'pendente' });
    return pendencias;
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
