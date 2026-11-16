import { BadRequestException, Body, Controller, Delete, Get, Injectable, NotFoundException, Param, Post, Res } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsIn, IsOptional, IsString, Length, MaxLength, ValidateNested } from 'class-validator';
import { Response } from 'express';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { enviarPdf } from '../documentos/documentos.controller';
import { documentoHtml, escape } from '../documentos/layout';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';

// Reuniões da CIPA (NR-05, 5.6): ordinárias todo mês, pelo calendário, e extraordinárias quando
// há acidente grave ou pedido de uma das representações. Cada reunião vira uma ata em PDF.

export class EncaminhamentoDto {
  @IsString() @Length(2, 500, { message: 'Escreva a ação combinada.' }) acao!: string;
  @IsOptional() @IsString() @MaxLength(120) responsavel?: string;
  @IsOptional() @IsString() @MaxLength(10) prazo?: string; // AAAA-MM-DD
}

export class CriarReuniaoDto {
  @IsIn(['ORDINARIA', 'EXTRAORDINARIA'], { message: 'Escolha se a reunião é ordinária ou extraordinária.' }) tipo!: string;
  @IsDateString({}, { message: 'Informe a data da reunião.' }) data!: string;
  @IsOptional() @IsString() @MaxLength(20) horario?: string;
  @IsString() @Length(2, 200, { message: 'Informe o local da reunião.' }) local!: string;
  @IsArray() @ArrayMinSize(1, { message: 'Marque quem participou da reunião.' }) @ArrayMaxSize(200) @IsString({ each: true }) presentes!: string[];
  @IsString() @Length(2, 3000, { message: 'Escreva a pauta da reunião.' }) pauta!: string;
  @IsString() @Length(2, 20000, { message: 'Escreva o que foi tratado na reunião.' }) discussao!: string;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => EncaminhamentoDto) encaminhamentos?: EncaminhamentoDto[];
}

type Encaminhamento = { acao: string; responsavel: string | null; prazo: string | null };
const DIA_MS = 86_400_000;

@Injectable()
export class ReunioesCipaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
  ) {}

  private async empresa(c: string, e: string) {
    const x = await this.prisma.empresa.findFirst({ where: { id: e, consultoriaId: c }, select: { id: true } });
    if (!x) throw new NotFoundException('Empresa não encontrada');
  }

  // Lista as reuniões (mais recente primeiro) e avisa se a reunião do mês passou do prazo.
  async listar(c: string, e: string) {
    await this.empresa(c, e);
    const reunioes = await this.prisma.cipaReuniao.findMany({ where: { empresaId: e }, orderBy: [{ data: 'desc' }, { numero: 'desc' }] });
    const ultimaOrdinaria = reunioes.find((r) => r.tipo === 'ORDINARIA');
    const dias = ultimaOrdinaria ? Math.floor((Date.now() - ultimaOrdinaria.data.getTime()) / DIA_MS) : null;
    return { reunioes, diasDesdeUltimaOrdinaria: dias };
  }

  async criar(c: string, e: string, dto: CriarReuniaoDto) {
    await this.empresa(c, e);
    const presentes = [...new Set(dto.presentes.map((p) => p.trim()).filter(Boolean))];
    if (!presentes.length) throw new BadRequestException('Marque quem participou da reunião.');
    const encaminhamentos: Encaminhamento[] = (dto.encaminhamentos ?? [])
      .filter((x) => x.acao.trim())
      .map((x) => ({ acao: x.acao.trim(), responsavel: x.responsavel?.trim() || null, prazo: x.prazo?.trim() || null }));
    // Número sequencial por empresa; tenta de novo se duas atas forem salvas ao mesmo tempo.
    for (let tentativa = 0; ; tentativa++) {
      const ultima = await this.prisma.cipaReuniao.findFirst({ where: { empresaId: e }, orderBy: { numero: 'desc' }, select: { numero: true } });
      try {
        return await this.prisma.cipaReuniao.create({
          data: {
            empresaId: e, numero: (ultima?.numero ?? 0) + 1, tipo: dto.tipo, data: new Date(dto.data), horario: dto.horario?.trim() || null,
            local: dto.local.trim(), presentes, pauta: dto.pauta.trim(), discussao: dto.discussao.trim(), encaminhamentos,
          },
        });
      } catch (erro) {
        if (tentativa >= 2 || (erro as { code?: string }).code !== 'P2002') throw erro;
      }
    }
  }

  async excluir(c: string, e: string, id: string) {
    await this.empresa(c, e);
    const { count } = await this.prisma.cipaReuniao.deleteMany({ where: { id, empresaId: e } });
    if (!count) throw new NotFoundException('Reunião não encontrada');
    return { ok: true };
  }

  async gerarPdf(c: string, e: string, id: string) {
    await this.empresa(c, e);
    const r = await this.prisma.cipaReuniao.findFirst({ where: { id, empresaId: e } });
    if (!r) throw new NotFoundException('Reunião não encontrada');
    const { empresa, logoEmpresa, consultoria } = await this.contexto.carregar(c, e, 'ATA_CIPA');
    const html = ataReuniaoHtml(
      { logoEmpresa, consultoria, infos: [['Empresa', empresa.razaoSocial], ['CNPJ', empresa.cnpj]], aviso: 'Feito com o Safety Nexo. Segue a NR-05.' },
      empresa.razaoSocial,
      { ...r, encaminhamentos: Array.isArray(r.encaminhamentos) ? (r.encaminhamentos as unknown as Encaminhamento[]) : [] },
    );
    return { pdf: await this.pdf.render(html), arquivo: `Ata-reuniao-CIPA-${String(r.numero).padStart(3, '0')}.pdf` };
  }
}

const porExtenso = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
const dataCurta = (iso: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '');
const paragrafos = (t: string) => t.split(/\n+/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${escape(p)}</p>`).join('');

export function ataReuniaoHtml(
  moldura: { logoEmpresa: string | null; consultoria: Parameters<typeof documentoHtml>[0]['consultoria']; infos: [string, string][]; aviso: string },
  razaoSocial: string,
  r: { numero: number; tipo: string; data: Date; horario: string | null; local: string; presentes: string[]; pauta: string; discussao: string; encaminhamentos: Encaminhamento[] },
): string {
  const tipo = r.tipo === 'EXTRAORDINARIA' ? 'extraordinária' : 'ordinária';
  const encaminhamentos = r.encaminhamentos.length
    ? `<table><thead><tr><th>O que fazer</th><th>Responsável</th><th>Prazo</th></tr></thead><tbody>${r.encaminhamentos
        .map((x) => `<tr><td>${escape(x.acao)}</td><td>${escape(x.responsavel)}</td><td>${escape(dataCurta(x.prazo))}</td></tr>`)
        .join('')}</tbody></table>`
    : '<p>Nenhum encaminhamento nesta reunião.</p>';
  return documentoHtml(
    { ...moldura, titulo: `Ata da ${r.numero}ª reunião ${tipo} da CIPA` },
    `
    <p>Em ${porExtenso(r.data)}${r.horario ? `, às ${escape(r.horario)}` : ''}, em ${escape(r.local)}, reuniram-se os membros da Comissão Interna de
    Prevenção de Acidentes e de Assédio (CIPA) da <strong>${escape(razaoSocial)}</strong> para a reunião ${tipo}, conforme a NR-05.</p>
    <h2>Presentes</h2>
    <p>${r.presentes.map((p) => escape(p)).join(', ')}.</p>
    <h2>Pauta</h2>
    ${paragrafos(r.pauta)}
    <h2>O que foi tratado</h2>
    ${paragrafos(r.discussao)}
    <h2>Encaminhamentos</h2>
    ${encaminhamentos}
    <p>Nada mais havendo a tratar, a reunião foi encerrada e esta ata foi lida e assinada pelos presentes. Uma cópia fica à disposição
    dos empregados e da fiscalização (NR-05, 5.6.3).</p>
    <div class="assinaturas">${r.presentes.map((p) => `<div class="assinatura">${escape(p)}</div>`).join('')}</div>`,
  );
}

@Controller('empresas/:empresaId/cipa/reunioes')
export class ReunioesCipaController {
  constructor(private readonly reunioes: ReunioesCipaService) {}

  @PermiteEmpresa()
  @Get()
  listar(@ConsultoriaId() c: string, @Param('empresaId') e: string) {
    return this.reunioes.listar(c, e);
  }

  @Post()
  criar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: CriarReuniaoDto) {
    return this.reunioes.criar(c, e, dto);
  }

  @Delete(':id')
  excluir(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) {
    return this.reunioes.excluir(c, e, id);
  }

  @PermiteEmpresa()
  @Post(':id/pdf')
  async pdf(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Res() res: Response) {
    const { pdf, arquivo } = await this.reunioes.gerarPdf(c, e, id);
    enviarPdf(res, pdf, arquivo);
  }
}
