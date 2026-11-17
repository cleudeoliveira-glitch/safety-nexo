import { Body, Controller, Delete, Get, Injectable, Module, NotFoundException, Param, Post, Res } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsOptional, IsString, Length, MaxLength, ValidateNested } from 'class-validator';
import { Response } from 'express';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { identificacao } from '../documentos/capa';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { enviarPdf } from '../documentos/documentos.controller';
import { DocumentosModule } from '../documentos/documentos.module';
import { documentoHtml, escape, Moldura } from '../documentos/layout';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';

// Resultado das calculadoras de SST guardado na empresa, com a memória de cálculo em PDF.
// A conta é feita na tela (funciona sem internet); aqui só guardamos o que entrou e o que saiu.

export const TIPOS_CALCULO: Record<string, { nome: string; norma: string }> = {
  CIPA: { nome: 'Dimensionamento da CIPA', norma: 'NR-05' },
  SESMT: { nome: 'Dimensionamento do SESMT', norma: 'NR-04' },
  BRIGADA: { nome: 'Dimensionamento da brigada de incêndio', norma: 'IT-17' },
  RUIDO: { nome: 'Dose de ruído', norma: 'NR-15 e NHO-01' },
  CALOR: { nome: 'Exposição ao calor (IBUTG)', norma: 'NR-15 e NHO-06' },
  TAXAS: { nome: 'Taxas de frequência e gravidade', norma: 'NBR 14280' },
};

export class LinhaCalculoDto {
  @IsString() @Length(1, 200) rotulo!: string;
  @IsString() @MaxLength(300) valor!: string;
}

export class CalculoDto {
  @IsIn(Object.keys(TIPOS_CALCULO), { message: 'Calculadora inválida.' }) tipo!: string;
  @IsString() @Length(2, 200, { message: 'Dê um nome ao cálculo (ex.: Ruído na prensa 2).' }) titulo!: string;
  @IsArray() @ArrayMaxSize(40) @ValidateNested({ each: true }) @Type(() => LinhaCalculoDto) entradas!: LinhaCalculoDto[];
  @IsArray() @ArrayMinSize(1, { message: 'Faça a conta antes de salvar.' }) @ArrayMaxSize(40) @ValidateNested({ each: true }) @Type(() => LinhaCalculoDto) resultado!: LinhaCalculoDto[];
  @IsOptional() @IsString() @MaxLength(2000) conclusao?: string;
  @IsOptional() @IsString() @MaxLength(2000) observacao?: string;
}

type Linha = { rotulo: string; valor: string };

@Injectable()
export class CalculosService {
  constructor(private prisma: PrismaService, private pdf: PdfService, private contexto: ContextoDocumentoService) {}

  private async empresa(c: string, e: string) {
    const x = await this.prisma.empresa.findFirst({ where: { id: e, consultoriaId: c }, select: { id: true } });
    if (!x) throw new NotFoundException('Empresa não encontrada');
  }

  async listar(c: string, e: string) {
    await this.empresa(c, e);
    return this.prisma.calculoSalvo.findMany({ where: { empresaId: e }, orderBy: { criadoEm: 'desc' } });
  }

  async criar(c: string, e: string, dto: CalculoDto) {
    await this.empresa(c, e);
    const limpar = (xs: LinhaCalculoDto[]) => xs.map((l) => ({ rotulo: l.rotulo.trim(), valor: l.valor.trim() })).filter((l) => l.rotulo);
    return this.prisma.calculoSalvo.create({
      data: {
        empresaId: e, tipo: dto.tipo, titulo: dto.titulo.trim(), entradas: limpar(dto.entradas), resultado: limpar(dto.resultado),
        conclusao: dto.conclusao?.trim() || null, observacao: dto.observacao?.trim() || null,
      },
    });
  }

  async excluir(c: string, e: string, id: string) {
    await this.empresa(c, e);
    const { count } = await this.prisma.calculoSalvo.deleteMany({ where: { id, empresaId: e } });
    if (!count) throw new NotFoundException('Cálculo não encontrado');
    return { ok: true };
  }

  async pdfCalculo(c: string, e: string, id: string) {
    await this.empresa(c, e);
    const x = await this.prisma.calculoSalvo.findFirst({ where: { id, empresaId: e } });
    if (!x) throw new NotFoundException('Cálculo não encontrado');
    const { empresa, logoEmpresa, consultoria } = await this.contexto.carregar(c, e, 'CALCULO');
    const moldura: Moldura = { titulo: 'Memória de cálculo', logoEmpresa, consultoria, infos: identificacao(empresa), aviso: 'Feito com o Safety Nexo.' };
    return this.pdf.render(calculoHtml(moldura, { ...x, entradas: x.entradas as Linha[], resultado: x.resultado as Linha[] }));
  }
}

function tabela(linhas: Linha[]) {
  return `<table class="kv"><tbody>${linhas.map((l) => `<tr><th>${escape(l.rotulo)}</th><td>${escape(l.valor)}</td></tr>`).join('')}</tbody></table>`;
}

export function calculoHtml(m: Moldura, x: { tipo: string; titulo: string; entradas: Linha[]; resultado: Linha[]; conclusao: string | null; observacao: string | null; criadoEm: Date }) {
  const t = TIPOS_CALCULO[x.tipo] ?? { nome: x.tipo, norma: '' };
  const quando = x.criadoEm.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return documentoHtml(m, `
    <section>
      <h2>${escape(x.titulo)} <small>${escape(t.nome)} · ${escape(t.norma)}</small></h2>
      <p><strong>Data do cálculo:</strong> ${quando}</p>
      ${x.entradas.length ? `<h2>Dados usados</h2>${tabela(x.entradas)}` : ''}
      <h2>Resultado</h2>${tabela(x.resultado)}
      ${x.conclusao ? `<p class="conclusao">${escape(x.conclusao)}</p>` : ''}
      ${x.observacao ? `<h2>Observações</h2><p>${escape(x.observacao).replace(/\n/g, '<br>')}</p>` : ''}
      <p class="base">Conta feita pela calculadora do Safety Nexo seguindo ${escape(t.norma)}. Confira com o texto da norma em vigor antes de usar num documento oficial.</p>
    </section>
    <div class="assinaturas"><div class="assinatura">&nbsp;<span>Responsável técnico</span></div></div>`,
    'h2 small { font-size: 11px; font-weight: normal; color: #64748b; } .kv th { width: 45%; text-align: left; } .conclusao { margin-top: 10px; padding: 10px 12px; border-left: 3px solid #0f4c5c; background: #f1f5f9; font-size: 13px; } .base { margin-top: 14px; font-size: 10px; color: #64748b; }');
}

@PermiteEmpresa()
@Controller('empresas/:empresaId/calculos')
export class CalculosController {
  constructor(private s: CalculosService) {}
  @Get() listar(@ConsultoriaId() c: string, @Param('empresaId') e: string) { return this.s.listar(c, e); }
  @Post() criar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: CalculoDto) { return this.s.criar(c, e, dto); }
  @Delete(':id') excluir(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.s.excluir(c, e, id); }
  @Post(':id/pdf') async pdf(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Res() res: Response) {
    enviarPdf(res, await this.s.pdfCalculo(c, e, id), 'Memoria-de-calculo.pdf');
  }
}

@Module({ imports: [DocumentosModule], controllers: [CalculosController], providers: [CalculosService] })
export class CalculosModule {}
