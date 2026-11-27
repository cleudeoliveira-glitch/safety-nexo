import { BadRequestException, Body, Controller, ConflictException, ForbiddenException, Get, Injectable, Module, NotFoundException, Put } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { IsBoolean, IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { ehAdminPlataforma } from '../admin/admin-plataforma';
import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { emailLigado, emailMoldura, enviarEmail } from '../common/email';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { guardaNaNuvem } from '../common/guarda';
import { Sessao, SessaoUsuario } from '../common/sessao.decorator';
import { iaConfigurada } from '../importacao/leitor';
import { LogosModule } from '../logos/logos.module';
import { LogosService } from '../logos/logos.service';
import { PrismaService } from '../prisma/prisma.service';

class ContaDto {
  @IsOptional() @IsString() @Length(2, 200, { message: 'Informe o seu nome.' }) nome?: string;
  @IsOptional() @IsEmail({}, { message: 'Informe um e-mail válido.' }) email?: string;
  @IsOptional() @IsString() @Length(2, 200, { message: 'Informe o nome da consultoria.' }) nomeConsultoria?: string;
  @IsOptional() @IsString() @MaxLength(20) cnpj?: string;
  @IsOptional() @IsString() @MaxLength(120) cidade?: string;
}

class DoisFatoresDto {
  @IsBoolean() ligar!: boolean;
  @IsString() senha!: string;
}

class SenhaDto {
  @IsString() atual!: string;
  @IsString() @Length(8, 100, { message: 'A nova senha precisa ter pelo menos 8 caracteres.' }) nova!: string;
}

// Meu perfil: dados de quem entrou e, para a consultoria, os dados que vão nos documentos.
@Injectable()
export class ContaService {
  constructor(private readonly prisma: PrismaService, private readonly logos: LogosService, private readonly auth: AuthService) {}

  private async usuario(id: string) {
    const u = await this.prisma.usuario.findUnique({ where: { id }, include: { consultoria: true, empresa: { select: { razaoSocial: true } } } });
    if (!u) throw new NotFoundException('Conta não encontrada');
    return u;
  }

  async ver(sessao: SessaoUsuario) {
    const u = await this.usuario(sessao.sub);
    const c = u.consultoria;
    return {
      nome: u.nome, email: u.email, papel: u.papel, criadoEm: u.createdAt,
      dono: u.papel === 'CONSULTORIA' && (u.dono || ehAdminPlataforma(u.email)), doisFatores: u.doisFatores, emailLigado: emailLigado(),
      adminPlataforma: u.papel === 'CONSULTORIA' && ehAdminPlataforma(u.email),
      empresa: u.empresa?.razaoSocial ?? null,
      consultoria: u.papel === 'CONSULTORIA'
        ? { nome: c.nome, cnpj: c.cnpj, cidade: c.cidade, plano: c.plano, logo: await this.logos.comoDataUri(c.logoPath) }
        : { nome: c.nome, cnpj: null, cidade: null, plano: null, logo: null },
    };
  }

  async salvar(sessao: SessaoUsuario, dto: ContaDto) {
    const u = await this.usuario(sessao.sub);
    const dados: { nome?: string; email?: string } = {};
    if (dto.nome !== undefined) dados.nome = dto.nome.trim();
    if (dto.email !== undefined && dto.email.toLowerCase() !== u.email) {
      const email = dto.email.trim().toLowerCase();
      // O acesso de administrador da plataforma é ligado ao e-mail: trocar aqui tiraria o acesso.
      if (u.papel === 'CONSULTORIA' && ehAdminPlataforma(u.email)) throw new ForbiddenException('Este e-mail é o do administrador da plataforma. Para trocar, fale com o suporte técnico.');
      if (await this.prisma.usuario.findUnique({ where: { email } })) throw new ConflictException('Já existe uma conta com este e-mail.');
      dados.email = email;
    }
    if (Object.keys(dados).length) await this.prisma.usuario.update({ where: { id: u.id }, data: dados });

    const daConsultoria = [dto.nomeConsultoria, dto.cnpj, dto.cidade].some((v) => v !== undefined);
    if (daConsultoria) {
      if (u.papel !== 'CONSULTORIA') throw new ForbiddenException('Os dados da consultoria são mudados pela própria consultoria.');
      if (!sessao.dono) throw new ForbiddenException('Só o dono da conta muda os dados da consultoria.');
      const limpo = (v?: string) => (v === undefined ? undefined : v.trim() || null);
      const cnpj = dto.cnpj === undefined ? undefined : dto.cnpj.replace(/\D/g, '') || null;
      if (cnpj && cnpj.length !== 14) throw new BadRequestException('O CNPJ precisa ter 14 números.');
      await this.prisma.consultoria.update({
        where: { id: u.consultoriaId },
        data: { ...(dto.nomeConsultoria !== undefined ? { nome: dto.nomeConsultoria.trim() } : {}), cnpj, cidade: limpo(dto.cidade) },
      });
    }
    return this.ver(sessao);
  }

  async trocarSenha(sessao: SessaoUsuario, dto: SenhaDto) {
    const u = await this.usuario(sessao.sub);
    if (!(await bcrypt.compare(dto.atual, u.senhaHash))) throw new BadRequestException('A senha atual não confere.');
    if (dto.atual === dto.nova) throw new BadRequestException('A nova senha precisa ser diferente da atual.');
    await this.prisma.usuario.update({ where: { id: u.id }, data: { senhaHash: await bcrypt.hash(dto.nova, 10) } });
    // Os outros aparelhos saem na hora; este recebe uma sessão nova e continua dentro.
    return { ok: true, ...(await this.auth.novaSessao(u.id)) };
  }

  // Verificação em duas etapas (código por e-mail). Pede a senha para ligar ou desligar.
  async doisFatores(sessao: SessaoUsuario, dto: DoisFatoresDto) {
    const u = await this.usuario(sessao.sub);
    if (!(await bcrypt.compare(dto.senha, u.senhaHash))) throw new BadRequestException('A senha não confere.');
    if (dto.ligar && !emailLigado()) throw new BadRequestException('O envio de e-mails do sistema está desligado agora, então não dá para mandar o código. Fale com o suporte.');
    // Ao ligar, manda um e-mail de confirmação na hora: assim a pessoa vê que o e-mail chega
    // e não fica presa fora da conta se o endereço estiver errado. Se não sair, não liga.
    if (dto.ligar && !u.doisFatores) {
      const corpo = `<p>Olá, ${u.nome.split(' ')[0]}.</p><p>A verificação em duas etapas foi ligada na sua conta do Safety Nexo.</p>
        <p>A partir de agora, depois da senha, o sistema pede um código de 6 números que chega neste e-mail. O primeiro código vem na próxima vez que você entrar.</p>
        <p style="font-size:13px;color:#6b7280">Se não foi você, entre no sistema, troque a senha e desligue em Meu perfil.</p>`;
      await enviarEmail([u.email], 'Safety Nexo: verificação em duas etapas ligada', emailMoldura('Verificação em duas etapas ligada', corpo)).catch((e) => {
        throw new BadRequestException(`Não consegui mandar e-mail para ${u.email} agora (${(e as Error).message.slice(0, 120)}). A verificação não foi ligada, para você não ficar sem entrar. Confira o e-mail em Meus dados e tente de novo.`);
      });
    }
    await this.prisma.usuario.update({ where: { id: u.id }, data: { doisFatores: dto.ligar } });
    return { ok: true, doisFatores: dto.ligar };
  }

  // Tudo o que o Safety Nexo conecta, com o que já está ligado e o que falta.
  async integracoes(consultoriaId: string) {
    const [c, cert, colaboradores, terceiros, relatos] = await Promise.all([
      this.prisma.consultoria.findUnique({ where: { id: consultoriaId }, select: { avisosEmail: true, pixChave: true } }),
      this.prisma.certificadoDigital.findUnique({ where: { consultoriaId }, select: { titular: true, validoAte: true } }),
      this.prisma.colaborador.count({ where: { empresa: { consultoriaId } } }),
      this.prisma.terceiro.count({ where: { empresa: { consultoriaId } } }),
      this.prisma.relato.count({ where: { empresa: { consultoriaId } } }),
    ]);
    const certValido = !!cert && cert.validoAte > new Date();
    const emailLigado = !!process.env.RESEND_API_KEY;
    const dominioProprio = !!process.env.AVISOS_REMETENTE && !/resend\.dev/i.test(process.env.AVISOS_REMETENTE);
    return {
      ia: { ligada: iaConfigurada() },
      email: { ligado: emailLigado, dominioProprio, avisosEmail: c?.avisosEmail ?? true },
      certificado: cert ? { titular: cert.titular, validoAte: cert.validoAte, valido: certValido } : null,
      armazenamentoNuvem: guardaNaNuvem,
      pix: !!c?.pixChave,
      uso: { colaboradores, terceiros, relatos },
    };
  }
}

@PermiteEmpresa()
@Controller('conta')
export class ContaController {
  constructor(private readonly conta: ContaService) {}

  @Get() ver(@Sessao() s: SessaoUsuario) { return this.conta.ver(s); }
  @Put() salvar(@Sessao() s: SessaoUsuario, @Body() d: ContaDto) { return this.conta.salvar(s, d); }
  @Put('senha') senha(@Sessao() s: SessaoUsuario, @Body() d: SenhaDto) { return this.conta.trocarSenha(s, d); }
  @Put('dois-fatores') doisFatores(@Sessao() s: SessaoUsuario, @Body() d: DoisFatoresDto) { return this.conta.doisFatores(s, d); }
}

// Só a consultoria vê as integrações (o login da empresa cliente não usa).
@Controller('integracoes')
export class IntegracoesController {
  constructor(private readonly conta: ContaService) {}
  @Get() listar(@ConsultoriaId() c: string) { return this.conta.integracoes(c); }
}

@Module({ imports: [LogosModule, AuthModule], controllers: [ContaController, IntegracoesController], providers: [ContaService] })
export class ContaModule {}
