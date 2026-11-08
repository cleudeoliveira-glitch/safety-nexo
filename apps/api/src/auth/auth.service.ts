import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { ehAdminPlataforma } from '../admin/admin-plataforma';
import { PrismaService } from '../prisma/prisma.service';
import { emailLigado, emailMoldura, enviarEmail, WEB } from '../common/email';
import { CadastroDto, EntrarDto, RedefinirDto } from './dto';

// Link de criar ou trocar a senha: vale 1 hora (convite: 7 dias) e deixa de valer assim que a senha muda.
type TokenSenha = { sub: string; uso: 'senha'; v: string };
const DIAS_TESTE = 14;

export type Sessao = { sub: string; consultoriaId: string };
type UsuarioEmitido = { id: string; nome: string; email: string; consultoriaId: string; papel: string; empresaId: string | null };

@Injectable()
export class AuthService {
  private readonly log = new Logger('Auth');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // Cadastro direto: cria a conta no plano Grátis, com 14 dias de tudo liberado. Não pede CNPJ.
  async cadastrar(dto: CadastroDto) {
    const email = dto.email.toLowerCase().trim();
    if (await this.prisma.usuario.findUnique({ where: { email } })) {
      throw new ConflictException('Já existe uma conta com este e-mail. Use "Entrar".');
    }
    const senhaHash = await bcrypt.hash(dto.senha, 10);
    const testeAte = new Date(Date.now() + DIAS_TESTE * 86400_000);
    const usuario = await this.prisma.usuario.create({
      data: {
        nome: dto.nome.trim(),
        email,
        senhaHash,
        consultoria: {
          create: {
            nome: dto.nomeConsultoria.trim(),
            plano: 'FREE',
            limiteEmpresas: 1,
            testeAte,
          },
        },
      },
    });
    return this.emitir(usuario);
  }

  // "Esqueci minha senha": manda o link por e-mail. A resposta é sempre a mesma, para não revelar quem tem conta.
  async esqueci(emailInformado: string) {
    const email = emailInformado.toLowerCase().trim();
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    if (usuario && emailLigado()) {
      const link = this.linkSenha(usuario, 'redefinir');
      const corpo = `<p>Olá, ${usuario.nome.split(' ')[0]}.</p><p>Recebemos um pedido para trocar a senha do Safety Nexo. Toque no botão para criar uma senha nova. O link vale por 1 hora.</p>
        <p><a href="${link}" style="display:inline-block;background:#10B981;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600">Criar senha nova</a></p>
        <p style="font-size:13px;color:#6b7280">Se não foi você, é só ignorar este e-mail. A senha atual continua valendo.</p>`;
      await enviarEmail([email], 'Safety Nexo: trocar a senha', emailMoldura('Trocar a senha', corpo)).catch((e) => this.log.warn(`E-mail de senha não saiu: ${(e as Error).message}`));
    }
    return { ok: true, emailLigado: emailLigado() };
  }

  // Link de senha que o ADM ou a consultoria entrega por WhatsApp (convite ou "esqueci a senha" sem e-mail).
  linkSenha(usuario: { id: string; senhaHash: string }, tipo: 'redefinir' | 'convite') {
    const token = this.jwt.sign({ sub: usuario.id, uso: 'senha', v: usuario.senhaHash.slice(-12) } satisfies TokenSenha, { expiresIn: tipo === 'convite' ? '7d' : '1h' });
    return `${WEB()}/redefinir-senha?token=${encodeURIComponent(token)}${tipo === 'convite' ? '&convite=1' : ''}`;
  }

  async redefinir(dto: RedefinirDto) {
    let dados: TokenSenha;
    try {
      dados = this.jwt.verify<TokenSenha>(dto.token);
    } catch {
      throw new BadRequestException('Este link venceu. Peça um link novo em "Esqueci minha senha".');
    }
    const usuario = dados.uso === 'senha' ? await this.prisma.usuario.findUnique({ where: { id: dados.sub }, include: { consultoria: { select: { bloqueada: true } } } }) : null;
    if (!usuario || usuario.senhaHash.slice(-12) !== dados.v) throw new BadRequestException('Este link já foi usado. Peça um link novo em "Esqueci minha senha".');
    if (usuario.consultoria.bloqueada && !this.ehAdmin(usuario)) throw new ForbiddenException('Este acesso está suspenso. Fale com o suporte do Safety Nexo.');
    const atualizado = await this.prisma.usuario.update({ where: { id: usuario.id }, data: { senhaHash: await bcrypt.hash(dto.senha, 10), ultimoAcesso: new Date() } });
    return this.emitir(atualizado);
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
    const s = this.jwt.verify<Sessao & { uso?: string }>(token);
    if (s.uso) throw new UnauthorizedException('Token inválido.'); // link de senha não serve para entrar
    return s;
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
