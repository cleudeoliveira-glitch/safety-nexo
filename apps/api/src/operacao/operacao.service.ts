import { identificacao } from '../documentos/capa';
import { selarIcp } from '../assinaturas/selo';
import { EsocialService } from '../esocial/esocial.service';
import { assinaturasDaLista } from '../presenca/consulta';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { MODELOS_RESGATE, RISCOS_CONFINADO, TEMAS_DDS, TIPOS_ESPACO, TIPOS_PT, TipoPt } from './conteudo';
import { CriarAprDto, CriarDdsDto, CriarPermissaoDto, MedicaoGasDto } from './dto';
import { sugerirTemasDds } from './sugestoes-dds';
import { aprHtml, ddsHtml, DetalhesPt, EtapaApr, permissaoHtml } from './templates';
import { nomeGhe } from '../empresas/ghe-ambiente';
import { apagarPresencas, conferirApagado } from '../common/exclusao';

const AVISO = 'Feito com o Safety Nexo.';

type Medicao = { hora: string; oxigenio: number; lie: number; h2s: number | null; co: number | null; outro: string | null; responsavel: string };
const medicao = (m: MedicaoGasDto): Medicao => ({
  hora: new Date(m.hora).toISOString(), oxigenio: m.oxigenio, lie: m.lie, h2s: m.h2s ?? null, co: m.co ?? null, outro: m.outro?.trim() || null, responsavel: m.responsavel.trim(),
});

@Injectable()
export class OperacaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
    private readonly esocial: EsocialService,
  ) {}

  conteudo() {
    return { tiposPt: TIPOS_PT, temasDds: TEMAS_DDS, tiposEspaco: TIPOS_ESPACO, riscosConfinado: RISCOS_CONFINADO, modelosResgate: MODELOS_RESGATE };
  }

  private async empresa(consultoriaId: string, empresaId: string) {
    const empresa = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId } });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    return empresa;
  }

  // Só aceita colaboradores da própria empresa.
  private async conferirColaboradores(empresaId: string, ids: string[]) {
    const unicos = [...new Set(ids)];
    const achados = await this.prisma.colaborador.count({ where: { empresaId, id: { in: unicos } } });
    if (achados !== unicos.length) throw new BadRequestException('Há colaboradores que não são desta empresa.');
    return unicos;
  }

  private async pessoas(ids: string[]) {
    const lista = await this.prisma.colaborador.findMany({ where: { id: { in: ids } }, select: { id: true, nome: true, cargo: true } });
    return ids.map((id) => lista.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => Boolean(c));
  }

  private async moldura(consultoriaId: string, empresaId: string, titulo: string, extra: [string, string][]) {
    const { empresa, logoEmpresa, consultoria } = await this.contexto.carregar(consultoriaId, empresaId, 'OPERACAO');
    return {
      titulo,
      logoEmpresa,
      consultoria,
      infos: [...identificacao(empresa), ...extra] as [string, string][],
      aviso: AVISO,
    };
  }

  // Número sequencial por empresa, como no talão de papel.
  private async proximoNumero(tabela: 'apr' | 'permissaoTrabalho', empresaId: string) {
    const ultimo =
      tabela === 'apr'
        ? await this.prisma.apr.findFirst({ where: { empresaId }, orderBy: { numero: 'desc' }, select: { numero: true } })
        : await this.prisma.permissaoTrabalho.findFirst({ where: { empresaId }, orderBy: { numero: 'desc' }, select: { numero: true } });
    return (ultimo?.numero ?? 0) + 1;
  }

  // APR
  async listarAprs(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    return this.prisma.apr.findMany({ where: { empresaId }, orderBy: { numero: 'desc' } });
  }

  async criarApr(consultoriaId: string, empresaId: string, dto: CriarAprDto) {
    await this.empresa(consultoriaId, empresaId);
    const equipe = await this.conferirColaboradores(empresaId, dto.equipe);
    const ghe = dto.gheId ? await this.prisma.ghe.findFirst({ where: { id: dto.gheId, empresaId }, select: { id: true } }) : null;
    if (dto.gheId && !ghe) throw new BadRequestException('Esse setor (GHE) não é desta empresa.');
    return this.prisma.apr.create({
      data: {
        empresaId,
        numero: await this.proximoNumero('apr', empresaId),
        atividade: dto.atividade.trim(),
        local: dto.local.trim(),
        gheId: ghe?.id ?? null,
        data: new Date(dto.data),
        responsavel: dto.responsavel.trim(),
        equipe,
        etapas: dto.etapas.map((e) => ({ etapa: e.etapa, riscos: e.riscos, medidas: e.medidas, epis: e.epis ?? '' })),
      },
    });
  }

  async pdfApr(consultoriaId: string, empresaId: string, aprId: string) {
    await this.empresa(consultoriaId, empresaId);
    const apr = await this.prisma.apr.findFirst({ where: { id: aprId, empresaId }, include: { ghe: { include: { riscos: true } } } });
    if (!apr) throw new NotFoundException('APR não encontrada');
    const moldura = await this.moldura(consultoriaId, empresaId, `Análise Preliminar de Risco (APR) nº ${apr.numero}`, [['Responsável', apr.responsavel]]);
    // Riscos do ambiente: os que o PGR já levantou para o setor onde a atividade acontece.
    const ambiente = apr.ghe ? { setor: nomeGhe(apr.ghe), riscos: apr.ghe.riscos } : null;
    return this.pdf.render(aprHtml(moldura, { ...apr, etapas: apr.etapas as EtapaApr[], ambiente }, await this.pessoas(apr.equipe)));
  }

  // Permissão de Trabalho
  async listarPermissoes(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    return this.prisma.permissaoTrabalho.findMany({
      where: { empresaId },
      orderBy: { numero: 'desc' },
      include: { apr: { select: { numero: true } }, espaco: { select: { codigo: true, nome: true } }, planoResgate: { select: { numero: true, titulo: true } } },
    });
  }

  async criarPermissao(consultoriaId: string, empresaId: string, dto: CriarPermissaoDto) {
    await this.empresa(consultoriaId, empresaId);
    const inicio = new Date(dto.inicio);
    const fim = new Date(dto.fim);
    if (fim <= inicio) throw new BadRequestException('O fim da permissão precisa ser depois do início.');
    if (dto.aprId && !(await this.prisma.apr.findFirst({ where: { id: dto.aprId, empresaId } }))) {
      throw new NotFoundException('APR não encontrada nesta empresa');
    }
    if (dto.espacoId && !(await this.prisma.espacoConfinado.findFirst({ where: { id: dto.espacoId, empresaId } }))) {
      throw new NotFoundException('Espaço confinado não encontrado nesta empresa');
    }
    if (dto.planoResgateId && !(await this.prisma.planoResgate.findFirst({ where: { id: dto.planoResgateId, empresaId } }))) {
      throw new NotFoundException('Plano de resgate não encontrado nesta empresa');
    }
    const d = dto.detalhes ?? {};
    if (dto.tipo === 'ICAMENTO' && d.pesoCargaKg && d.capacidadeKg && d.pesoCargaKg > d.capacidadeKg) {
      throw new BadRequestException('A carga é mais pesada que a capacidade do equipamento nesse raio. Não dá para liberar este içamento.');
    }
    const texto = (v?: string) => v?.trim() || undefined;
    const detalhes = Object.fromEntries(Object.entries({
      equipamento: texto(d.equipamento), pesoCargaKg: d.pesoCargaKg, capacidadeKg: d.capacidadeKg, operador: texto(d.operador), sinaleiro: texto(d.sinaleiro),
      profundidadeM: d.profundidadeM, tipoSolo: texto(d.tipoSolo), contencao: texto(d.contencao),
    }).filter(([, v]) => v !== undefined && v !== null));
    return this.prisma.permissaoTrabalho.create({
      data: {
        empresaId,
        numero: await this.proximoNumero('permissaoTrabalho', empresaId),
        tipo: dto.tipo,
        aprId: dto.aprId || null,
        atividade: dto.atividade.trim(),
        local: dto.local.trim(),
        inicio,
        fim,
        executantes: await this.conferirColaboradores(empresaId, dto.executantes),
        emitente: dto.emitente.trim(),
        checklist: dto.checklist.map((c) => ({ item: c.item, ok: c.ok })),
        supervisorEntrada: dto.supervisorEntrada?.trim() || null,
        vigia: dto.vigia?.trim() || null,
        medicoes: (dto.medicoes ?? []).map(medicao),
        detalhes,
        espacoId: dto.espacoId || null,
        planoResgateId: dto.planoResgateId || null,
      },
    });
  }

  // Medições feitas durante o trabalho entram na mesma permissão, com a hora de cada uma.
  async registrarMedicao(consultoriaId: string, empresaId: string, ptId: string, dto: MedicaoGasDto) {
    await this.empresa(consultoriaId, empresaId);
    const pt = await this.prisma.permissaoTrabalho.findFirst({ where: { id: ptId, empresaId } });
    if (!pt) throw new NotFoundException('Permissão não encontrada');
    if (pt.encerradaEm) throw new BadRequestException('Esta permissão já foi encerrada.');
    const lista = [...((pt.medicoes as Medicao[]) ?? []), medicao(dto)].sort((a, b) => a.hora.localeCompare(b.hora));
    return this.prisma.permissaoTrabalho.update({ where: { id: ptId }, data: { medicoes: lista } });
  }

  async encerrarPermissao(consultoriaId: string, empresaId: string, ptId: string) {
    await this.empresa(consultoriaId, empresaId);
    const pt = await this.prisma.permissaoTrabalho.findFirst({ where: { id: ptId, empresaId } });
    if (!pt) throw new NotFoundException('Permissão não encontrada');
    if (pt.encerradaEm) throw new BadRequestException('Esta permissão já foi encerrada.');
    return this.prisma.permissaoTrabalho.update({ where: { id: ptId }, data: { encerradaEm: new Date() } });
  }

  async pdfPermissao(consultoriaId: string, empresaId: string, ptId: string) {
    await this.empresa(consultoriaId, empresaId);
    const pt = await this.prisma.permissaoTrabalho.findFirst({
      where: { id: ptId, empresaId },
      include: { apr: { select: { numero: true } }, espaco: { select: { codigo: true, nome: true } }, planoResgate: { select: { numero: true, titulo: true } } },
    });
    if (!pt) throw new NotFoundException('Permissão não encontrada');
    const tipo = TIPOS_PT[pt.tipo as TipoPt];
    const moldura = await this.moldura(consultoriaId, empresaId, `Permissão de Trabalho nº ${pt.numero}`, [['Emitente', pt.emitente]]);
    return this.pdf.render(
      permissaoHtml(
        moldura,
        {
          ...pt, tipoNome: tipo?.nome ?? pt.tipo, norma: tipo?.norma ?? '', aprNumero: pt.apr?.numero ?? null,
          detalhes: (pt.detalhes ?? {}) as DetalhesPt,
          espaco: pt.espaco ? `${pt.espaco.codigo} · ${pt.espaco.nome}` : null,
          planoResgate: pt.planoResgate ? `nº ${pt.planoResgate.numero} · ${pt.planoResgate.titulo}` : null,
        },
        pt.checklist as { item: string; ok: boolean }[],
        await this.pessoas(pt.executantes),
        pt.medicoes as Medicao[],
      ),
    );
  }

  // Excluir: a APR some e as PTs ligadas a ela ficam guardadas, só sem o vínculo.
  async excluirApr(consultoriaId: string, empresaId: string, id: string) {
    await this.empresa(consultoriaId, empresaId);
    const { count } = await this.prisma.apr.deleteMany({ where: { id, empresaId } });
    return conferirApagado(count, 'Esta APR não foi encontrada. Talvez já tenha sido excluída.');
  }

  async excluirPermissao(consultoriaId: string, empresaId: string, id: string) {
    await this.empresa(consultoriaId, empresaId);
    const { count } = await this.prisma.permissaoTrabalho.deleteMany({ where: { id, empresaId } });
    return conferirApagado(count, 'Esta permissão não foi encontrada. Talvez já tenha sido excluída.');
  }

  async excluirDds(consultoriaId: string, empresaId: string, id: string) {
    await this.empresa(consultoriaId, empresaId);
    const { count } = await this.prisma.dds.deleteMany({ where: { id, empresaId } });
    conferirApagado(count, 'Este DDS não foi encontrado. Talvez já tenha sido excluído.');
    await apagarPresencas(this.prisma, 'DDS', id);
    return { ok: true };
  }

  // DDS
  async listarDds(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    return this.prisma.dds.findMany({ where: { empresaId }, orderBy: { data: 'desc' } });
  }

  async criarDds(consultoriaId: string, empresaId: string, dto: CriarDdsDto) {
    await this.empresa(consultoriaId, empresaId);
    return this.prisma.dds.create({
      data: {
        empresaId,
        tema: dto.tema.trim(),
        conteudo: dto.conteudo.trim(),
        data: new Date(dto.data),
        duracaoMin: dto.duracaoMin,
        ministrante: dto.ministrante.trim(),
        local: dto.local?.trim() || null,
        participantes: await this.conferirColaboradores(empresaId, dto.participantes),
      },
    });
  }

  // Temas sugeridos pelos riscos da empresa (GHEs, espaços confinados e PTs recentes).
  async sugestoesDds(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    const desde = new Date(Date.now() - 90 * 86400000);
    const [ghes, espacos, pts, recentes] = await Promise.all([
      this.prisma.ghe.findMany({ where: { empresaId }, select: { nome: true, riscos: { select: { tipo: true, agente: true, severidade: true, probabilidade: true } } } }),
      this.prisma.espacoConfinado.count({ where: { empresaId, ativo: true } }),
      this.prisma.permissaoTrabalho.findMany({ where: { empresaId, createdAt: { gte: desde } }, select: { tipo: true } }),
      this.prisma.dds.findMany({ where: { empresaId, data: { gte: desde } }, select: { tema: true } }),
    ]);
    const riscos = ghes.flatMap((g) => g.riscos.map((r) => ({ ...r, ghe: g.nome })));
    return {
      temRiscos: riscos.length > 0,
      sugestoes: sugerirTemasDds(riscos, { espacosConfinados: espacos, tiposPt: pts.map((p) => p.tipo), temasRecentes: recentes.map((d) => d.tema) }),
    };
  }

  async pdfDds(consultoriaId: string, empresaId: string, ddsId: string) {
    await this.empresa(consultoriaId, empresaId);
    const dds = await this.prisma.dds.findFirst({ where: { id: ddsId, empresaId } });
    if (!dds) throw new NotFoundException('DDS não encontrado');
    const moldura = await this.moldura(consultoriaId, empresaId, 'Diálogo Diário de Segurança (DDS)', [['Ministrante', dds.ministrante]]);
    const rostos = await this.prisma.presencaFacial.findMany({ where: { tipo: 'DDS', refId: ddsId }, select: { colaboradorId: true, codigo: true } });
    const toques = await assinaturasDaLista(this.prisma, 'DDS', ddsId);
    const usouLista = toques.size > 0 || rostos.length > 0; // com lista eletrônica, quem não assinou é falta
    const pessoas = (await this.pessoas(dds.participantes)).map((p) => {
      const rosto = rostos.find((r) => r.colaboradorId === p.id)?.codigo ?? null;
      const toque = toques.get(p.id) ?? null;
      return { ...p, rosto, toque, faltou: usouLista && !rosto && !toque };
    });
    const pdf = await this.pdf.render(ddsHtml(moldura, dds, pessoas));
    return usouLista ? (await selarIcp(this.esocial, consultoriaId, pdf, `Lista de presença do DDS: ${dds.tema}`)).pdf : pdf;
  }
}
