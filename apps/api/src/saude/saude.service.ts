import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { TABELA_18_MOTIVOS_AFASTAMENTO } from '../esocial/tabelas';
import { AtualizarCatEsocialDto, CriarAetDto, CriarAfastamentoDto, CriarCatDto } from './dto';
import { prazoCat } from './prazo-cat';
import { AetPdf, aetHtml, catHtml } from './templates';

const AVISO = 'Feito com o Safety Nexo.';

@Injectable()
export class SaudeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
  ) {}

  private async empresa(consultoriaId: string, empresaId: string) {
    const empresa = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId } });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    return empresa;
  }

  private async moldura(consultoriaId: string, empresaId: string, titulo: string, tipo: string) {
    const { empresa, logoEmpresa, consultoria } = await this.contexto.carregar(consultoriaId, empresaId, tipo);
    return { titulo, logoEmpresa, consultoria, aviso: AVISO, infos: [['Empresa', empresa.razaoSocial], ['CNPJ', empresa.cnpj]] as [string, string][] };
  }

  // AET
  async listarAets(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    return this.prisma.aet.findMany({ where: { empresaId }, orderBy: [{ data: 'desc' }, { createdAt: 'desc' }] });
  }

  async criarAet(consultoriaId: string, empresaId: string, dto: CriarAetDto) {
    await this.empresa(consultoriaId, empresaId);
    return this.prisma.aet.create({
      data: { ...dto, empresaId, data: new Date(dto.data), recomendacoes: dto.recomendacoes.map((r) => ({ ...r })) },
    });
  }

  async pdfAet(consultoriaId: string, empresaId: string, id: string) {
    await this.empresa(consultoriaId, empresaId);
    const aet = await this.prisma.aet.findFirst({ where: { id, empresaId } });
    if (!aet) throw new NotFoundException('AET não encontrada');
    const moldura = await this.moldura(consultoriaId, empresaId, 'Análise Ergonômica do Trabalho (AET)', 'AET');
    return this.pdf.render(aetHtml(moldura, { ...aet, recomendacoes: aet.recomendacoes as AetPdf['recomendacoes'] }));
  }

  // CAT
  // Afastamentos (S-2230). Dias contados do início ao último dia afastado, inclusive.
  async listarAfastamentos(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    const lista = await this.prisma.afastamento.findMany({
      where: { empresaId }, orderBy: { inicio: 'desc' },
      include: { colaborador: { select: { nome: true, asos: { where: { tipo: 'RETORNO_TRABALHO' }, select: { dataExame: true } } } } },
    });
    return lista.map(({ colaborador, ...a }) => ({ ...a, colaborador: colaborador.nome, ...situacaoAfastamento(a, colaborador.asos.map((x) => x.dataExame)) }));
  }

  async criarAfastamento(consultoriaId: string, empresaId: string, dto: CriarAfastamentoDto) {
    await this.empresa(consultoriaId, empresaId);
    const col = await this.prisma.colaborador.findFirst({ where: { id: dto.colaboradorId, empresaId } });
    if (!col) throw new NotFoundException('Colaborador não encontrado nesta empresa');
    if (!TABELA_18_MOTIVOS_AFASTAMENTO.some(([c]) => c === dto.motivo)) throw new BadRequestException('Motivo de afastamento fora da Tabela 18 do eSocial.');
    const inicio = new Date(dto.inicio.slice(0, 10));
    const fim = dto.fim ? new Date(dto.fim.slice(0, 10)) : null;
    if (fim && fim < inicio) throw new BadRequestException('A volta não pode ser antes do início do afastamento.');
    if (col.dataAdmissao && inicio < col.dataAdmissao) throw new BadRequestException('O afastamento não pode começar antes da admissão.');
    if (dto.motivo === '21' && !dto.observacao?.trim()) throw new BadRequestException('Para este motivo, descreva o afastamento na observação.');
    const aberto = await this.prisma.afastamento.findFirst({ where: { colaboradorId: col.id, fim: null } });
    if (aberto) throw new BadRequestException(`${col.nome} já tem um afastamento em aberto. Registre a volta dele antes de abrir outro.`);
    // Não pode haver dois afastamentos no mesmo período.
    const sobreposto = await this.prisma.afastamento.findFirst({ where: { colaboradorId: col.id, inicio: { lte: fim ?? new Date('9999-12-31') }, fim: { gte: inicio } } });
    if (sobreposto) throw new BadRequestException(`${col.nome} já tem um afastamento registrado nesse período.`);
    const saude = ['01', '03'].includes(dto.motivo);
    if (dto.catId && !(await this.prisma.cat.findFirst({ where: { id: dto.catId, empresaId, colaboradorId: col.id } }))) throw new NotFoundException('CAT não encontrada para este colaborador');
    return this.prisma.afastamento.create({
      data: {
        empresaId, colaboradorId: col.id, motivo: dto.motivo, inicio, fim,
        mesmoMotivo: saude ? dto.mesmoMotivo ?? null : null, acidenteTransito: saude ? dto.acidenteTransito ?? null : null,
        observacao: dto.observacao?.trim() || null, catId: dto.catId || null,
      },
    });
  }

  async encerrarAfastamento(consultoriaId: string, empresaId: string, id: string, fimIso: string) {
    await this.empresa(consultoriaId, empresaId);
    const a = await this.prisma.afastamento.findFirst({ where: { id, empresaId } });
    if (!a) throw new NotFoundException('Afastamento não encontrado');
    const fim = new Date(fimIso.slice(0, 10));
    if (fim < a.inicio) throw new BadRequestException('A volta não pode ser antes do início do afastamento.');
    return this.prisma.afastamento.update({ where: { id }, data: { fim } });
  }

  async removerAfastamento(consultoriaId: string, empresaId: string, id: string) {
    await this.empresa(consultoriaId, empresaId);
    const enviado = await this.prisma.eventoEsocial.findFirst({ where: { empresaId, tipo: 'S-2230', referenciaId: { startsWith: id }, status: { in: ['ENVIADO', 'PROCESSADO'] } } });
    if (enviado) throw new BadRequestException('Este afastamento já foi enviado ao eSocial e não pode ser apagado aqui.');
    const { count } = await this.prisma.afastamento.deleteMany({ where: { id, empresaId } });
    if (!count) throw new NotFoundException('Afastamento não encontrado');
    return { ok: true };
  }

  async listarCats(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    const cats = await this.prisma.cat.findMany({
      where: { empresaId },
      orderBy: { dataHora: 'desc' },
      include: { colaborador: { select: { nome: true, cargo: true } } },
    });
    return cats.map((c) => ({ ...c, prazo: prazoCat(c.dataHora, c.houveObito) }));
  }

  async criarCat(consultoriaId: string, empresaId: string, dto: CriarCatDto) {
    await this.empresa(consultoriaId, empresaId);
    if (!(await this.prisma.colaborador.findFirst({ where: { id: dto.colaboradorId, empresaId } }))) {
      throw new NotFoundException('Colaborador não encontrado nesta empresa');
    }
    const dataHora = new Date(dto.dataHora);
    if (dataHora > new Date()) throw new BadRequestException('A data do acidente não pode estar no futuro.');
    const cat = await this.prisma.cat.create({
      data: {
        ...dto,
        empresaId,
        dataHora,
        houveObito: dto.houveObito ?? dto.tipoCat === 'OBITO',
        atendimentoData: dto.atendimentoData ? new Date(dto.atendimentoData) : null,
        esocial: dto.esocial ? JSON.parse(JSON.stringify(dto.esocial)) : undefined,
      },
    });
    return { ...cat, prazo: prazoCat(cat.dataHora, cat.houveObito) };
  }

  // Completa os dados da CAT exigidos pelo S-2210 (códigos das tabelas, endereço, atestado).
  async atualizarEsocialCat(consultoriaId: string, empresaId: string, id: string, dto: AtualizarCatEsocialDto) {
    await this.empresa(consultoriaId, empresaId);
    const cat = await this.prisma.cat.findFirst({ where: { id, empresaId } });
    if (!cat) throw new NotFoundException('CAT não encontrada');
    const { horasTrabalhadas, atendimentoData, medicoNome, medicoCrm, cid, diasTratamento, ...codigos } = dto;
    const esocial = { ...((cat.esocial as object | null) ?? {}), ...JSON.parse(JSON.stringify(codigos)) };
    return this.prisma.cat.update({
      where: { id },
      data: {
        esocial, horasTrabalhadas, medicoNome, medicoCrm, cid, diasTratamento,
        atendimentoData: atendimentoData ? new Date(atendimentoData) : undefined,
      },
    });
  }

  async marcarEnviada(consultoriaId: string, empresaId: string, id: string, recibo: string) {
    await this.empresa(consultoriaId, empresaId);
    const { count } = await this.prisma.cat.updateMany({ where: { id, empresaId }, data: { enviadaEm: new Date(), recibo: recibo.trim() } });
    if (!count) throw new NotFoundException('CAT não encontrada');
    return { ok: true };
  }

  async pdfCat(consultoriaId: string, empresaId: string, id: string) {
    await this.empresa(consultoriaId, empresaId);
    const cat = await this.prisma.cat.findFirst({ where: { id, empresaId }, include: { colaborador: true } });
    if (!cat) throw new NotFoundException('CAT não encontrada');
    const moldura = await this.moldura(consultoriaId, empresaId, 'Comunicação de Acidente de Trabalho (CAT)', 'CAT');
    return this.pdf.render(catHtml(moldura, { ...cat, trabalhador: cat.colaborador, prazo: prazoCat(cat.dataHora, cat.houveObito) }));
  }
}

// NR-07, 7.5.9: afastamento de 30 dias ou mais por doença ou acidente pede exame de retorno antes de reassumir.
export function situacaoAfastamento(a: { motivo: string; inicio: Date; fim: Date | null }, retornos: Date[]) {
  const ate = a.fim ?? new Date(new Date().toISOString().slice(0, 10));
  const dias = Math.floor((ate.getTime() - a.inicio.getTime()) / 86_400_000) + 1;
  const pedeRetorno = ['01', '03'].includes(a.motivo) && dias >= 30;
  const asoRetorno = pedeRetorno && retornos.some((d) => d >= a.inicio);
  return { dias, emAberto: !a.fim, pedeRetorno, asoRetorno };
}
