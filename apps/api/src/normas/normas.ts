import { BadRequestException, Body, Controller, Delete, Get, Injectable, Module, NotFoundException, Param, Post, Put } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDateString, IsInt, IsOptional, IsString, IsUrl, Length, MaxLength, Min } from 'class-validator';
import { SomenteAdmin } from '../admin/admin-plataforma';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { PrismaService } from '../prisma/prisma.service';

export class AvisoNormaDto {
  @IsString() @Length(3, 200, { message: 'Dê um título ao aviso.' }) titulo!: string;
  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) normas!: string[];
  @IsString() @Length(10, 5000, { message: 'Explique o que mudou.' }) resumo!: string;
  @IsOptional() @IsString() @MaxLength(5000) oQueFazer?: string;
  @IsOptional() @IsUrl({}, { message: 'O link oficial precisa ser um endereço completo (https://...).' }) linkOficial?: string;
  @IsOptional() @IsDateString() publicadaEm?: string;
  @IsOptional() @IsDateString() vigenciaEm?: string;
  @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) cnaePrefixos!: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) grauRiscoMin?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) funcionariosMin?: number;
}

const soDigitos = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');

type Filtro = { cnaePrefixos: string[]; grauRiscoMin: number | null; funcionariosMin: number | null };
type EmpresaFiltro = { cnae: string | null; grauRisco: number | null; numFuncionarios: number };

// Uma empresa é afetada quando passa em todos os filtros preenchidos. Sem filtro, vale para todas.
export function afeta(a: Filtro, e: EmpresaFiltro) {
  const prefixos = a.cnaePrefixos.map(soDigitos).filter(Boolean);
  if (prefixos.length && !prefixos.some((p) => soDigitos(e.cnae).startsWith(p))) return false;
  if (a.grauRiscoMin && (e.grauRisco ?? 0) < a.grauRiscoMin) return false;
  if (a.funcionariosMin && e.numFuncionarios < a.funcionariosMin) return false;
  return true;
}

const dados = (d: AvisoNormaDto) => ({
  titulo: d.titulo.trim(),
  normas: d.normas.map((n) => n.trim().toUpperCase()).filter(Boolean),
  resumo: d.resumo.trim(),
  oQueFazer: d.oQueFazer?.trim() || null,
  linkOficial: d.linkOficial?.trim() || null,
  publicadaEm: d.publicadaEm ? new Date(d.publicadaEm) : null,
  vigenciaEm: d.vigenciaEm ? new Date(d.vigenciaEm) : null,
  cnaePrefixos: d.cnaePrefixos.map(soDigitos).filter(Boolean),
  grauRiscoMin: d.grauRiscoMin ?? null,
  funcionariosMin: d.funcionariosMin ?? null,
});

@Injectable()
export class NormasService {
  constructor(private readonly prisma: PrismaService) {}

  listarAdmin() {
    return this.prisma.avisoNorma.findMany({ orderBy: { criadoEm: 'desc' }, include: { _count: { select: { lidos: true } } } });
  }

  criar(d: AvisoNormaDto) { return this.prisma.avisoNorma.create({ data: dados(d) }); }

  async atualizar(id: string, d: AvisoNormaDto) {
    await this.existe(id);
    return this.prisma.avisoNorma.update({ where: { id }, data: dados(d) });
  }

  async remover(id: string) {
    await this.existe(id);
    await this.prisma.avisoNorma.delete({ where: { id } });
    return { ok: true };
  }

  private async existe(id: string) {
    if (!(await this.prisma.avisoNorma.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Aviso não encontrado');
  }

  // Para a consultoria: cada aviso com as empresas clientes dela que são afetadas.
  async daConsultoria(consultoriaId: string) {
    const [avisos, empresas, lidos] = await Promise.all([
      this.prisma.avisoNorma.findMany({ orderBy: [{ vigenciaEm: 'desc' }, { criadoEm: 'desc' }], take: 100 }),
      this.prisma.empresa.findMany({ where: { consultoriaId }, select: { id: true, razaoSocial: true, cnae: true, grauRisco: true, numFuncionarios: true } }),
      this.prisma.avisoNormaLido.findMany({ where: { consultoriaId }, select: { avisoId: true } }),
    ]);
    const lido = new Set(lidos.map((l) => l.avisoId));
    return avisos.map((a) => ({
      ...a,
      lido: lido.has(a.id),
      empresas: empresas.filter((e) => afeta(a, e)).map((e) => ({ id: e.id, razaoSocial: e.razaoSocial })),
    }));
  }

  async marcarLido(consultoriaId: string, avisoId: string) {
    await this.existe(avisoId);
    await this.prisma.avisoNormaLido.upsert({ where: { avisoId_consultoriaId: { avisoId, consultoriaId } }, create: { avisoId, consultoriaId }, update: {} });
    return { ok: true };
  }
}

@SomenteAdmin()
@Controller('admin/normas')
export class NormasAdminController {
  constructor(private readonly normas: NormasService) {}
  @Get() listar() { return this.normas.listarAdmin(); }
  @Post() criar(@Body() d: AvisoNormaDto) { return this.normas.criar(d); }
  @Put(':id') atualizar(@Param('id') id: string, @Body() d: AvisoNormaDto) { return this.normas.atualizar(id, d); }
  @Delete(':id') remover(@Param('id') id: string) { return this.normas.remover(id); }
}

@Controller('normas')
export class NormasController {
  constructor(private readonly normas: NormasService) {}
  @Get('avisos') listar(@ConsultoriaId() c: string) { return this.normas.daConsultoria(c); }
  @Post('avisos/:id/lido') lido(@ConsultoriaId() c: string, @Param('id') id: string) {
    if (!id) throw new BadRequestException();
    return this.normas.marcarLido(c, id);
  }
}

@Module({ controllers: [NormasAdminController, NormasController], providers: [NormasService], exports: [NormasService] })
export class NormasModule {}
