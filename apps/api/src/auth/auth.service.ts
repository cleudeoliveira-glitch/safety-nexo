import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { ehAdminPlataforma } from '../admin/admin-plataforma';
import { PrismaService } from '../prisma/prisma.service';
import { emailLigado, emailMoldura, enviarEmail, WEB } from '../common/email';
import { CadastroDto, EntrarDto, RedefinirDto } from './dto';
import { PushService } from '../push/push';
import { limparErrosLogin, loginTravado, registrarErroLogin } from '../common/protecao';

// Senha falsa usada quando o e-mail não existe: a resposta demora o mesmo tempo e não revela quem tem conta.
const HASH_FALSO = bcrypt.hashSync('senha-que-nao-existe', 10);

// Link de criar ou trocar a senha: vale 1 hora (convite: 7 dias) e deixa de valer assim que a senha muda.
type TokenSenha = { sub: string; uso: 'senha'; v: string };
const DIAS_TESTE = 14;

// s: marca da senha (fim do hash). Quando a senha muda, as sessões abertas em outros aparelhos deixam de valer.
export type Sessao = { sub: string; consultoriaId: string; s?: string };
type UsuarioEmitido = { id: string; nome: string; email: string; consultoriaId: string; papel: string; empresaId: string | null; senhaHash: string; dono?: boolean };

// Verificação em duas etapas: o "desafio" é um token de 10 minutos que guarda só o resumo do código mandado por e-mail.
type Desafio = { sub: string; uso: '2fa'; h: string };
const resumoCodigo = (sub: string, codigo: string) => createHash('sha256').update(`${sub}:${codigo.trim()}`).digest('hex');
const tentativasCodigo = new Map<string, number>();
const mascarar = (email: string) => email.replace(/^(.{2})[^@]*(@.*)$/, '$1•••$2');

@Injectable()
export class AuthService {
  private readonly log = new Logger('Auth');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly push: PushService,
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
        dono: true, // quem cria a conta é o dono dela
        consultoria: {
          create: {
            nome: dto.nomeConsultoria.trim(),
            plano: 'FREE',
            limiteEmpresas: 1,
            testeAte,
            termosAceitosEm: new Date(),
            termosVersao: dto.versaoTermos ?? null,
          },
        },
      },
    });
    this.push.avisarAdmins({ titulo: 'Novo cadastro no Safety Nexo', corpo: `${usuario.nome} (${dto.nomeConsultoria.trim()}) acabou de criar a conta.`, url: '/admin', tag: 'cadastro' }, 'cadastro');
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
    const usuario = dados.uso === 'senha' ? await this.prisma.usuario.findUnique({ where: { id: dados.sub }, include: { consultoria: { select: { bloqueada: true, nome: true } } } }) : null;
    if (!usuario || usuario.senhaHash.slice(-12) !== dados.v) throw new BadRequestException('Este link já foi usado. Peça um link novo em "Esqueci minha senha".');
    if (usuario.consultoria.bloqueada && !this.ehAdmin(usuario)) throw new ForbiddenException('Este acesso está suspenso. Fale com o suporte do Safety Nexo.');
    const atualizado = await this.prisma.usuario.update({ where: { id: usuario.id }, data: { senhaHash: await bcrypt.hash(dto.senha, 10), ultimoAcesso: new Date() } });
    this.avisarEntrada(usuario);
    return this.emitir(atualizado);
  }

  async entrar(dto: EntrarDto) {
    const email = dto.email.toLowerCase().trim();
    if (loginTravado(email)) {
      throw new HttpException('Muitas senhas erradas para este e-mail. Espere 15 minutos ou use "Esqueci minha senha".', HttpStatus.TOO_MANY_REQUESTS);
    }
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: { consultoria: { select: { bloqueada: true, nome: true } } },
    });
    const senhaOk = await bcrypt.compare(dto.senha, usuario?.senhaHash ?? HASH_FALSO);
    if (!usuario || !senhaOk) {
      registrarErroLogin(email);
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }
    limparErrosLogin(email);
    if (usuario.consultoria.bloqueada && !this.ehAdmin(usuario)) {
      throw new ForbiddenException('Este acesso está suspenso. Fale com o suporte do Safety Nexo.');
    }
    // Verificação em duas etapas ligada: antes de entrar, manda um código por e-mail.
    if (usuario.doisFatores && emailLigado()) return this.mandarCodigo(usuario);
    await this.prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAcesso: new Date() } });
    this.avisarEntrada(usuario);
    return this.emitir(usuario);
  }

  private async mandarCodigo(usuario: { id: string; nome: string; email: string }) {
    const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const corpo = `<p>Olá, ${usuario.nome.split(' ')[0]}.</p><p>Seu código para entrar no Safety Nexo é:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0E4A5B">${codigo}</p>
      <p style="font-size:13px;color:#6b7280">Ele vale por 10 minutos. Se não foi você que tentou entrar, troque a sua senha.</p>`;
    await enviarEmail([usuario.email], `Safety Nexo: código ${codigo}`, emailMoldura('Código para entrar', corpo)).catch((e) => {
      this.log.warn(`código de entrada não saiu: ${(e as Error).message}`);
      throw new BadRequestException('Não consegui mandar o código por e-mail agora. Tente de novo em alguns minutos.');
    });
    const desafio = this.jwt.sign({ sub: usuario.id, uso: '2fa', h: resumoCodigo(usuario.id, codigo) } satisfies Desafio, { expiresIn: '10m' });
    return { precisaCodigo: true, desafio, email: mascarar(usuario.email) };
  }

  async entrarComCodigo(desafio: string, codigo: string) {
    let d: Desafio;
    try { d = this.jwt.verify<Desafio>(desafio); } catch { throw new UnauthorizedException('O código venceu. Entre de novo para receber outro.'); }
    if (d.uso !== '2fa') throw new UnauthorizedException('Entre de novo para receber outro código.');
    const tentativas = (tentativasCodigo.get(desafio) ?? 0) + 1;
    tentativasCodigo.set(desafio, tentativas);
    if (tentativasCodigo.size > 5000) tentativasCodigo.clear();
    if (tentativas > 5) throw new UnauthorizedException('Muitos códigos errados. Entre de novo para receber outro.');
    const certo = Buffer.from(d.h, 'hex');
    const veio = Buffer.from(resumoCodigo(d.sub, codigo), 'hex');
    if (certo.length !== veio.length || !timingSafeEqual(certo, veio)) throw new UnauthorizedException('Código errado. Confira o e-mail e digite de novo.');
    tentativasCodigo.delete(desafio);
    const usuario = await this.prisma.usuario.findUnique({ where: { id: d.sub }, include: { consultoria: { select: { bloqueada: true, nome: true } } } });
    if (!usuario) throw new UnauthorizedException('Seu acesso foi removido. Fale com a sua consultoria.');
    if (usuario.consultoria.bloqueada && !this.ehAdmin(usuario)) throw new ForbiddenException('Este acesso está suspenso. Fale com o suporte do Safety Nexo.');
    await this.prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAcesso: new Date() } });
    this.avisarEntrada(usuario);
    return this.emitir(usuario);
  }

  // Sessão nova para quem acabou de trocar a senha (os outros aparelhos saem, este continua).
  async novaSessao(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    return this.emitir(usuario);
  }

  // Aviso no celular do dono quando um cliente entra: sempre na primeira vez; nas outras, só se ele ligou
  // "toda vez que um cliente entra", e no máximo um aviso a cada 6 horas por pessoa. O próprio ADM não avisa.
  private avisarEntrada(usuario: { id: string; nome: string; email: string; papel: string; ultimoAcesso: Date | null; consultoria: { nome: string } }) {
    if (this.ehAdmin(usuario)) return;
    const quem = `${usuario.nome}${usuario.papel === 'EMPRESA' ? ' (empresa cliente de ' : ' ('}${usuario.consultoria.nome})`;
    if (!usuario.ultimoAcesso) {
      this.push.avisarAdmins({ titulo: 'Primeiro acesso', corpo: `${quem} entrou no sistema pela primeira vez.`, url: '/admin', tag: `acesso-${usuario.id}` }, 'primeiroAcesso');
      return;
    }
    if (Date.now() - usuario.ultimoAcesso.getTime() < 6 * 3600_000) return;
    this.push.avisarAdmins({ titulo: 'Cliente entrou', corpo: `${quem} entrou no sistema agora.`, url: '/admin', tag: `acesso-${usuario.id}` }, 'acessos');
  }

  verificar(token: string): Sessao {
    const s = this.jwt.verify<Sessao & { uso?: string }>(token);
    if (s.uso) throw new UnauthorizedException('Token inválido.'); // link de senha não serve para entrar
    return s;
  }

  private emitir(usuario: UsuarioEmitido) {
    const sessao: Sessao = { sub: usuario.id, consultoriaId: usuario.consultoriaId, s: usuario.senhaHash.slice(-12) };
    return {
      token: this.jwt.sign(sessao),
      usuario: { nome: usuario.nome, papel: usuario.papel, empresaId: usuario.empresaId, adminPlataforma: this.ehAdmin(usuario), dono: usuario.papel === 'CONSULTORIA' && (!!usuario.dono || this.ehAdmin(usuario)) },
    };
  }

  private ehAdmin(usuario: Pick<UsuarioEmitido, 'papel' | 'email'>) {
    return usuario.papel === 'CONSULTORIA' && ehAdminPlataforma(usuario.email);
  }
}
