import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { ehAdminPlataforma } from '../admin/admin-plataforma';
import { PrismaService } from '../prisma/prisma.service';
import { CadastroDto, EntrarDto } from './dto';

export type Sessao = { sub: string; consultoriaId: string };
type UsuarioEmitido = { id: string; nome: string; email: string; consultoriaId: string; papel: string; empresaId: string | null };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // Cadastro direto: cria a consultoria no plano Free e o primeiro usuário dela.
  async cadastrar(dto: CadastroDto) {
    const email = dto.email.toLowerCase();
    if (await this.prisma.usuario.findUnique({ where: { email } })) {
      throw new ConflictException('Já existe uma conta com este e-mail. Use "Entrar".');
    }
    const senhaHash = await bcrypt.hash(dto.senha, 10);
    const usuario = await this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        email,
        senhaHash,
        consultoria: { create: { nome: dto.nomeConsultoria, plano: 'FREE', limiteEmpresas: 1 } },
      },
    });
    return this.emitir(usuario);
  }

  async entrar(dto: EntrarDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { consultoria: { select: { bloqueada: true } } },
    });
    if (!usuario || !(await bcrypt.compare(dto.senha, usuario.senhaHash))) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }
    if (usuario.consultoria.bloqueada && !this.ehAdmin(usuario)) {
      throw new ForbiddenException('Este acesso está suspenso. Fale com o suporte do Safety Nexo.');
    }
    await this.prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAcesso: new Date() } });
    return this.emitir(usuario);
  }

  verificar(token: string): Sessao {
    return this.jwt.verify<Sessao>(token);
  }

  private emitir(usuario: UsuarioEmitido) {
    const sessao: Sessao = { sub: usuario.id, consultoriaId: usuario.consultoriaId };
    return {
      token: this.jwt.sign(sessao),
      usuario: { nome: usuario.nome, papel: usuario.papel, empresaId: usuario.empresaId, adminPlataforma: this.ehAdmin(usuario) },
    };
  }

  private ehAdmin(usuario: Pick<UsuarioEmitido, 'papel' | 'email'>) {
    return usuario.papel === 'CONSULTORIA' && ehAdminPlataforma(usuario.email);
  }
}
