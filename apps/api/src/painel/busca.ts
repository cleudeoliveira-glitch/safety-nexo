import { Controller, Get, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { PrismaService } from '../prisma/prisma.service';

// Busca em todas as empresas da consultoria: funcionários (nome, cargo, matrícula, CPF), GHEs e terceirizadas.
// A lupa do topo junta isso com as telas e documentos que ela já acha sozinha. Acento e maiúscula não importam.
const COM = 'áàâãäéèêëíìîïóòôõöúùûüçñ';
const SEM = 'aaaaaeeeeiiiiooooouuuucn';
export const normalizar = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const coluna = (c: string) => Prisma.sql`translate(lower(coalesce(${Prisma.raw(c)}, '')), ${COM}, ${SEM})`;

@Controller('busca')
export class BuscaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async buscar(@ConsultoriaId() consultoriaId: string, @Query('q') q = '') {
    const texto = normalizar(q.trim().slice(0, 80));
    if (texto.length < 3) return { pessoas: [], ghes: [], terceiros: [] };
    const padrao = `%${texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const numeros = texto.replace(/\D/g, '');
    const porCpf = numeros.length >= 3 ? Prisma.sql`OR coalesce(x."cpf", '') LIKE ${`%${numeros}%`}` : Prisma.empty;
    const porCnpj = numeros.length >= 3 ? Prisma.sql`OR regexp_replace(coalesce(x."cnpj", ''), '\\D', '', 'g') LIKE ${`%${numeros}%`}` : Prisma.empty;
    const [p, g, t] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>`SELECT x.id FROM "Colaborador" x JOIN "Empresa" e ON e.id = x."empresaId"
        WHERE e."consultoriaId" = ${consultoriaId} AND (${coluna('x."nome"')} LIKE ${padrao} OR ${coluna('x."cargo"')} LIKE ${padrao} OR ${coluna('x."matricula"')} LIKE ${padrao} ${porCpf})
        ORDER BY (x."dataDesligamento" IS NOT NULL), x."nome" LIMIT 15`,
      this.prisma.$queryRaw<{ id: string }[]>`SELECT x.id FROM "Ghe" x JOIN "Empresa" e ON e.id = x."empresaId"
        WHERE e."consultoriaId" = ${consultoriaId} AND (${coluna('x."nome"')} LIKE ${padrao} OR ${coluna('x."setor"')} LIKE ${padrao} OR ${coluna('x."codigo"')} LIKE ${padrao})
        ORDER BY x."nome" LIMIT 10`,
      this.prisma.$queryRaw<{ id: string }[]>`SELECT x.id FROM "Terceiro" x JOIN "Empresa" e ON e.id = x."empresaId"
        WHERE e."consultoriaId" = ${consultoriaId} AND (${coluna('x."razaoSocial"')} LIKE ${padrao} ${porCnpj})
        ORDER BY x."razaoSocial" LIMIT 10`,
    ]);
    const [pessoas, ghes, terceiros] = await Promise.all([
      this.prisma.colaborador.findMany({ where: { id: { in: p.map((x) => x.id) } }, select: { id: true, nome: true, cargo: true, dataDesligamento: true, empresaId: true, empresa: { select: { razaoSocial: true } } }, orderBy: { nome: 'asc' } }),
      this.prisma.ghe.findMany({ where: { id: { in: g.map((x) => x.id) } }, select: { id: true, nome: true, setor: true, empresaId: true, empresa: { select: { razaoSocial: true } } }, orderBy: { nome: 'asc' } }),
      this.prisma.terceiro.findMany({ where: { id: { in: t.map((x) => x.id) } }, select: { id: true, razaoSocial: true, empresaId: true, empresa: { select: { razaoSocial: true } } }, orderBy: { razaoSocial: 'asc' } }),
    ]);
    return {
      pessoas: pessoas.map((x) => ({ id: x.id, nome: x.nome, cargo: x.cargo, desligado: !!x.dataDesligamento, empresaId: x.empresaId, empresa: x.empresa.razaoSocial })),
      ghes: ghes.map((x) => ({ id: x.id, nome: x.nome, setor: x.setor, empresaId: x.empresaId, empresa: x.empresa.razaoSocial })),
      terceiros: terceiros.map((x) => ({ id: x.id, nome: x.razaoSocial, empresaId: x.empresaId, empresa: x.empresa.razaoSocial })),
    };
  }
}
