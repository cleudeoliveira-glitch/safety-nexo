import { Body, ConflictException, Controller, Delete, Get, Injectable, Module, NotFoundException, Param, Post } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';
import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';
import { emailLigado, emailMoldura, enviarEmail } from '../common/email';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { PrismaService } from '../prisma/prisma.service';

export class CriarAcessoDto {
  @IsString()
  @Length(2, 120)
  nome!: string;

  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;

  // Sem senha: vira convite. A pessoa recebe um link para criar a própria senha.
  @IsOptional()
  @IsString()
  @Length(8, 72, { message: 'A senha precisa ter pelo menos 8 caracteres.' })
  senha?: string;
}

// Logins da empresa cliente: criados pela consultoria, enxergam só a própria empresa.
@Injectable()
export class AcessosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  private async empresa(consultoriaId: string, empresaId: string) {
    const empresa = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId }, include: { consultoria: { select: { nome: true } } } });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    return empresa;
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
    const empresa = await this.empresa(consultoriaId, empresaId);
    const email = dto.email.toLowerCase().trim();
    if (await this.prisma.usuario.findUnique({ where: { email } })) throw new ConflictException('Já existe um login com este e-mail.');
    // Convite: senha aleatória que ninguém sabe, trocada pela pessoa no link.
    const senha = dto.senha ?? randomBytes(24).toString('base64url');
    const u = await this.prisma.usuario.create({
      data: { nome: dto.nome.trim(), email, senhaHash: await bcrypt.hash(senha, 10), papel: 'EMPRESA', empresaId, consultoriaId },
    });
    const acesso = { id: u.id, nome: u.nome, email: u.email, createdAt: u.createdAt };
    if (dto.senha) return acesso;
    return { ...acesso, ...(await this.enviarConvite(u, empresa.razaoSocial, empresa.consultoria.nome)) };
  }

  // Link novo para o cliente criar ou trocar a senha (convite que venceu, ou senha esquecida).
  async convite(consultoriaId: string, empresaId: string, id: string) {
    const empresa = await this.empresa(consultoriaId, empresaId);
    const u = await this.prisma.usuario.findFirst({ where: { id, empresaId, papel: 'EMPRESA' } });
    if (!u) throw new NotFoundException('Acesso não encontrado');
    return this.enviarConvite(u, empresa.razaoSocial, empresa.consultoria.nome);
  }

  private async enviarConvite(u: { id: string; nome: string; email: string; senhaHash: string }, empresa: string, consultoria: string) {
    const link = this.auth.linkSenha(u, 'convite');
    const texto = `Olá, ${u.nome.split(' ')[0]}! A ${consultoria} liberou o acesso da ${empresa} no Safety Nexo. Crie a sua senha por este link (vale 7 dias): ${link}`;
    let emailEnviado = false;
    if (emailLigado()) {
      const corpo = `<p>Olá, ${u.nome.split(' ')[0]}.</p><p>A <b>${consultoria}</b> liberou o acesso da <b>${empresa}</b> no Safety Nexo. Lá você vê os documentos, treinamentos, EPIs e vencimentos da sua empresa.</p>
        <p><a href="${link}" style="display:inline-block;background:#10B981;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600">Criar minha senha</a></p><p style="font-size:13px;color:#6b7280">O link vale por 7 dias.</p>`;
      emailEnviado = await enviarEmail([u.email], `${consultoria}: seu acesso ao Safety Nexo`, emailMoldura('Seu acesso ao Safety Nexo', corpo)).then(() => true, () => false);
    }
    return { link, whatsapp: `https://wa.me/?text=${encodeURIComponent(texto)}`, emailEnviado };
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

  @Post(':id/convite')
  convite(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) {
    return this.acessos.convite(c, e, id);
  }

  @Delete(':id')
  remover(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) {
    return this.acessos.remover(c, e, id);
  }
}

@Module({ imports: [AuthModule], controllers: [AcessosController], providers: [AcessosService] })
export class AcessosModule {}
