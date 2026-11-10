import { selarIcp } from '../assinaturas/selo';
import { EsocialService } from '../esocial/esocial.service';
import { assinaturasDaLista } from '../presenca/consulta';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { TEMAS_DDS, TIPOS_PT, TipoPt } from './conteudo';
import { CriarAprDto, CriarDdsDto, CriarPermissaoDto } from './dto';
import { aprHtml, ddsHtml, EtapaApr, permissaoHtml } from './templates';

const AVISO = 'Feito com o Safety Nexo.';

@Injectable()
export class OperacaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
    private readonly esocial: EsocialService,
  ) {}

  conteudo() {
    return { tiposPt: TIPOS_PT, temasDds: TEMAS_DDS };
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
      infos: [['Empresa', empresa.razaoSocial], ['CNPJ', empresa.cnpj], ...extra] as [string, string][],
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
    return this.prisma.apr.create({
      data: {
        empresaId,
        numero: await this.proximoNumero('apr', empresaId),
        atividade: dto.atividade.trim(),
        local: dto.local.trim(),
        data: new Date(dto.data),
        responsavel: dto.responsavel.trim(),
        equipe,
        etapas: dto.etapas.map((e) => ({ etapa: e.etapa, riscos: e.riscos, medidas: e.medidas, epis: e.epis ?? '' })),
      },
    });
  }

  async pdfApr(consultoriaId: string, empresaId: string, aprId: string) {
    await this.empresa(consultoriaId, empresaId);
    const apr = await this.prisma.apr.findFirst({ where: { id: aprId, empresaId } });
    if (!apr) throw new NotFoundException('APR não encontrada');
    const moldura = await this.moldura(consultoriaId, empresaId, `Análise Preliminar de Risco (APR) nº ${apr.numero}`, [['Responsável', apr.responsavel]]);
    return this.pdf.render(aprHtml(moldura, { ...apr, etapas: apr.etapas as EtapaApr[] }, await this.pessoas(apr.equipe)));
  }

  // Permissão de Trabalho
  async listarPermissoes(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    return this.prisma.permissaoTrabalho.findMany({ where: { empresaId }, orderBy: { numero: 'desc' }, include: { apr: { select: { numero: true } } } });
  }

  async criarPermissao(consultoriaId: string, empresaId: string, dto: CriarPermissaoDto) {
    await this.empresa(consultoriaId, empresaId);
    const inicio = new Date(dto.inicio);
    const fim = new Date(dto.fim);
    if (fim <= inicio) throw new BadRequestException('O fim da permissão precisa ser depois do início.');
    if (dto.aprId && !(await this.prisma.apr.findFirst({ where: { id: dto.aprId, empresaId } }))) {
      throw new NotFoundException('APR não encontrada nesta empresa');
    }
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
      },
    });
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
    const pt = await this.prisma.permissaoTrabalho.findFirst({ where: { id: ptId, empresaId }, include: { apr: { select: { numero: true } } } });
    if (!pt) throw new NotFoundException('Permissão não encontrada');
    const tipo = TIPOS_PT[pt.tipo as TipoPt];
    const moldura = await this.moldura(consultoriaId, empresaId, `Permissão de Trabalho nº ${pt.numero}`, [['Emitente', pt.emitente]]);
    return this.pdf.render(
      permissaoHtml(
        moldura,
        { ...pt, tipoNome: tipo?.nome ?? pt.tipo, norma: tipo?.norma ?? '', aprNumero: pt.apr?.numero ?? null },
        pt.checklist as { item: string; ok: boolean }[],
        await this.pessoas(pt.executantes),
      ),
    );
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
        participantes: await this.conferirColaboradores(empresaId, dto.participantes),
      },
    });
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
