import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CadastroDto, EntrarDto } from './dto';

export type Sessao = { sub: string; consultoriaId: string };

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
    const usuario = await this.prisma.usuario.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!usuario || !(await bcrypt.compare(dto.senha, usuario.senhaHash))) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }
    return this.emitir(usuario);
  }

  verificar(token: string): Sessao {
    return this.jwt.verify<Sessao>(token);
  }

  private emitir(usuario: { id: string; nome: string; consultoriaId: string }) {
    const sessao: Sessao = { sub: usuario.id, consultoriaId: usuario.consultoriaId };
    return { token: this.jwt.sign(sessao), usuario: { nome: usuario.nome } };
  }
}
