import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { CHAVES_5S, notas5s } from './cinco-s';
import { AtividadeDto, Auditoria5sDto, SipatDto } from './dto';
import { auditoria5sHtml, presencaHtml, programacaoHtml, relatorioSipatHtml } from './templates';

const dia = (v: string) => new Date(`${v.slice(0, 10)}T12:00:00Z`);
const AVISO = 'Feito com o Safety Nexo.';

@Injectable()
export class CulturaService {
  constructor(private readonly prisma: PrismaService, private readonly contexto: ContextoDocumentoService, private readonly pdf: PdfService) {}

  private async empresa(consultoriaId: string, empresaId: string) {
    const e = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId }, select: { id: true } });
    if (!e) throw new NotFoundException('Empresa não encontrada');
  }
  private async moldura(consultoriaId: string, empresaId: string, titulo: string, tipo: string) {
    const { empresa, logoEmpresa, consultoria } = await this.contexto.carregar(consultoriaId, empresaId, tipo);
    return { titulo, logoEmpresa, consultoria, aviso: AVISO, infos: [['Empresa', empresa.razaoSocial], ['CNPJ', empresa.cnpj]] as [string, string][] };
  }

  // ---------- SIPAT ----------
  async listarSipats(c: string, e: string) {
    await this.empresa(c, e);
    return this.prisma.sipat.findMany({ where: { empresaId: e }, orderBy: { inicio: 'desc' }, include: { atividades: { orderBy: [{ data: 'asc' }, { horario: 'asc' }] } } });
  }
  private async sipat(c: string, e: string, id: string) {
    await this.empresa(c, e);
    const s = await this.prisma.sipat.findFirst({ where: { id, empresaId: e }, include: { atividades: { orderBy: [{ data: 'asc' }, { horario: 'asc' }] } } });
    if (!s) throw new NotFoundException('SIPAT não encontrada');
    return s;
  }
  async criarSipat(c: string, e: string, dto: SipatDto) {
    await this.empresa(c, e);
    if (dia(dto.fim) < dia(dto.inicio)) throw new BadRequestException('O último dia é antes do primeiro.');
    return this.prisma.sipat.create({ data: { empresaId: e, ano: dto.ano, tema: dto.tema, inicio: dia(dto.inicio), fim: dia(dto.fim) } });
  }
  async removerSipat(c: string, e: string, id: string) { await this.sipat(c, e, id); await this.prisma.sipat.delete({ where: { id } }); return { ok: true }; }
  async criarAtividade(c: string, e: string, id: string, dto: AtividadeDto) {
    const s = await this.sipat(c, e, id);
    const d = dia(dto.data);
    if (d < s.inicio || d > s.fim) throw new BadRequestException('O dia da atividade está fora do período da SIPAT.');
    return this.prisma.sipatAtividade.create({ data: { sipatId: id, data: d, horario: dto.horario, titulo: dto.titulo, responsavel: dto.responsavel, local: dto.local, duracaoMin: dto.duracaoMin ?? 60 } });
  }
  async removerAtividade(c: string, e: string, id: string, ativId: string) {
    await this.sipat(c, e, id);
    const { count } = await this.prisma.sipatAtividade.deleteMany({ where: { id: ativId, sipatId: id } });
    if (!count) throw new NotFoundException('Atividade não encontrada');
    return { ok: true };
  }
  async presenca(c: string, e: string, id: string, ativId: string, presentes: string[]) {
    await this.sipat(c, e, id);
    const validos = await this.prisma.colaborador.findMany({ where: { empresaId: e, id: { in: presentes } }, select: { id: true } });
    const { count } = await this.prisma.sipatAtividade.updateMany({ where: { id: ativId, sipatId: id }, data: { presentes: validos.map((v) => v.id) } });
    if (!count) throw new NotFoundException('Atividade não encontrada');
    return { presentes: validos.length };
  }
  async pdfProgramacao(c: string, e: string, id: string) {
    const s = await this.sipat(c, e, id);
    if (!s.atividades.length) throw new BadRequestException('Inclua as atividades antes de gerar a programação.');
    return this.pdf.render(programacaoHtml(await this.moldura(c, e, `SIPAT ${s.ano}: programação`, 'SIPAT'), s, s.atividades));
  }
  async pdfPresenca(c: string, e: string, id: string, ativId: string) {
    const s = await this.sipat(c, e, id);
    const a = s.atividades.find((x) => x.id === ativId);
    if (!a) throw new NotFoundException('Atividade não encontrada');
    // Lista em branco com todos os funcionários, ou só os presentes, se já marcados.
    const pessoas = await this.prisma.colaborador.findMany({ where: { empresaId: e, ...(a.presentes.length ? { id: { in: a.presentes } } : {}) }, orderBy: { nome: 'asc' }, select: { nome: true, cargo: true } });
    return this.pdf.render(presencaHtml(await this.moldura(c, e, `SIPAT ${s.ano}: lista de presença`, 'SIPAT'), a, pessoas));
  }
  async pdfRelatorio(c: string, e: string, id: string) {
    const s = await this.sipat(c, e, id);
    const total = await this.prisma.colaborador.count({ where: { empresaId: e } });
    return this.pdf.render(relatorioSipatHtml(await this.moldura(c, e, `SIPAT ${s.ano}: relatório`, 'SIPAT'), s, s.atividades, total));
  }

  // ---------- 5S ----------
  async listar5s(c: string, e: string) {
    await this.empresa(c, e);
    const lista = await this.prisma.auditoria5s.findMany({ where: { empresaId: e }, orderBy: { data: 'asc' } });
    return lista.map((a) => ({ ...a, resultado: notas5s(a.notas as Record<string, number>) }));
  }
  async criar5s(c: string, e: string, dto: Auditoria5sDto) {
    await this.empresa(c, e);
    for (const k of CHAVES_5S) { const n = dto.notas[k]; if (!Number.isInteger(n) || n < 0 || n > 4) throw new BadRequestException('Dê nota de 0 a 4 em todos os itens.'); }
    const notas = Object.fromEntries(CHAVES_5S.map((k) => [k, dto.notas[k]]));
    return this.prisma.auditoria5s.create({ data: { empresaId: e, setor: dto.setor, data: dia(dto.data), auditor: dto.auditor, notas, observacoes: dto.observacoes || null } });
  }
  async remover5s(c: string, e: string, id: string) {
    await this.empresa(c, e);
    const { count } = await this.prisma.auditoria5s.deleteMany({ where: { id, empresaId: e } });
    if (!count) throw new NotFoundException('Auditoria não encontrada');
    return { ok: true };
  }
  async pdf5s(c: string, e: string, id: string) {
    await this.empresa(c, e);
    const a = await this.prisma.auditoria5s.findFirst({ where: { id, empresaId: e } });
    if (!a) throw new NotFoundException('Auditoria não encontrada');
    const ant = await this.prisma.auditoria5s.findFirst({ where: { empresaId: e, setor: a.setor, data: { lt: a.data } }, orderBy: { data: 'desc' } });
    const notas = a.notas as Record<string, number>;
    return this.pdf.render(auditoria5sHtml(await this.moldura(c, e, 'Auditoria 5S', '5S'), { ...a, notas }, notas5s(notas), ant ? notas5s(ant.notas as Record<string, number>).total : null));
  }
}
