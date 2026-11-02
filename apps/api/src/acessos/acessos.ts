import { Body, ConflictException, Controller, Delete, Get, Injectable, Module, NotFoundException, Param, Post } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { IsEmail, IsString, Length } from 'class-validator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { PrismaService } from '../prisma/prisma.service';

export class CriarAcessoDto {
  @IsString()
  @Length(2, 120)
  nome!: string;

  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;

  @IsString()
  @Length(8, 72, { message: 'A senha precisa ter pelo menos 8 caracteres.' })
  senha!: string;
}

// Logins da empresa cliente: criados pela consultoria, enxergam só a própria empresa.
@Injectable()
export class AcessosService {
  constructor(private readonly prisma: PrismaService) {}

  private async empresa(consultoriaId: string, empresaId: string) {
    const empresa = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId } });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
  }

  async listar(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    return this.prisma.usuario.findMany({
      where: { empresaId, papel: 'EMPRESA' },
      select: { id: true, nome: true, email: true, createdAt: true },
      orderBy: { nome: 'asc' },
    });
  }

  async criar(consultoriaId: string, empresaId: string, dto: CriarAcessoDto) {
    await this.empresa(consultoriaId, empresaId);
    const email = dto.email.toLowerCase().trim();
    if (await this.prisma.usuario.findUnique({ where: { email } })) throw new ConflictException('Já existe um login com este e-mail.');
    return this.prisma.usuario.create({
      data: { nome: dto.nome.trim(), email, senhaHash: await bcrypt.hash(dto.senha, 10), papel: 'EMPRESA', empresaId, consultoriaId },
      select: { id: true, nome: true, email: true, createdAt: true },
    });
  }

  async remover(consultoriaId: string, empresaId: string, id: string) {
    await this.empresa(consultoriaId, empresaId);
    const { count } = await this.prisma.usuario.deleteMany({ where: { id, empresaId, papel: 'EMPRESA' } });
    if (!count) throw new NotFoundException('Acesso não encontrado');
    return { ok: true };
  }
}

@Controller('empresas/:empresaId/acessos')
export class AcessosController {
  constructor(private readonly acessos: AcessosService) {}

  @Get()
  listar(@ConsultoriaId() c: string, @Param('empresaId') e: string) {
    return this.acessos.listar(c, e);
  }

  @Post()
  criar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: CriarAcessoDto) {
    return this.acessos.criar(c, e, dto);
  }

  @Delete(':id')
  remover(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) {
    return this.acessos.remover(c, e, id);
  }
}

@Module({ controllers: [AcessosController], providers: [AcessosService] })
export class AcessosModule {}
