import { Body, Controller, Delete, Get, Global, Injectable, Logger, Module, Post, ServiceUnavailableException } from '@nestjs/common';
import { IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import * as webpush from 'web-push';
import { emailsAdmin, SomenteAdmin } from '../admin/admin-plataforma';
import { Sessao, SessaoUsuario } from '../common/sessao.decorator';
import { PrismaService } from '../prisma/prisma.service';

// Avisos que caem na tela do celular, mesmo bloqueada (Web Push), para os ADMs da plataforma:
// novo cadastro e novo pedido de plano. Não usa serviço pago: o aviso vai pelo próprio Google (Android/Chrome),
// Apple (iPhone) ou Mozilla, que entregam de graça.
// As duas chaves que assinam os avisos são criadas sozinhas na primeira vez e ficam guardadas no banco.
// Se quiser fixar, dá para pôr VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY no Render (opcional).

class ChavesDto {
  @IsString() @MaxLength(200) p256dh!: string;
  @IsString() @MaxLength(100) auth!: string;
}
class InscricaoDto {
  @IsString() @MaxLength(1000) @Matches(/^https:\/\//, { message: 'Endereço do aparelho inválido.' }) endpoint!: string;
  @ValidateNested() @Type(() => ChavesDto) keys!: ChavesDto;
  @IsOptional() @IsString() @MaxLength(40) aparelho?: string;
}
class SairDto {
  @IsString() @MaxLength(1000) endpoint!: string;
}

export type AvisoPush = { titulo: string; corpo: string; url?: string; tag?: string };

type Chaves = { publica: string; privada: string };

@Injectable()
export class PushService {
  private readonly log = new Logger('Push');
  private chaves: Promise<Chaves> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  chavePublica() {
    return this.obterChaves().then((c) => c.publica);
  }

  private obterChaves(): Promise<Chaves> {
    if (!this.chaves) {
      this.chaves = this.carregarChaves().catch((e) => {
        this.chaves = null; // tenta de novo na próxima vez
        throw e;
      });
    }
    return this.chaves;
  }

  private async carregarChaves(): Promise<Chaves> {
    const envPub = process.env.VAPID_PUBLIC_KEY?.trim();
    const envPriv = process.env.VAPID_PRIVATE_KEY?.trim();
    if (envPub && envPriv) return { publica: envPub, privada: envPriv };
    const salvo = await this.prisma.configPlataforma.findUnique({ where: { chave: 'vapid' } });
    if (salvo) return JSON.parse(salvo.valor) as Chaves;
    const novas = webpush.generateVAPIDKeys();
    const chaves: Chaves = { publica: novas.publicKey, privada: novas.privateKey };
    try {
      await this.prisma.configPlataforma.create({ data: { chave: 'vapid', valor: JSON.stringify(chaves) } });
      return chaves;
    } catch {
      // Outro pedido criou ao mesmo tempo: usa a que ficou gravada.
      const outra = await this.prisma.configPlataforma.findUniqueOrThrow({ where: { chave: 'vapid' } });
      return JSON.parse(outra.valor) as Chaves;
    }
  }

  async inscrever(usuarioId: string, dto: InscricaoDto) {
    const dados = { usuarioId, p256dh: dto.keys.p256dh, auth: dto.keys.auth, aparelho: dto.aparelho ?? null };
    await this.prisma.avisoCelular.upsert({ where: { endpoint: dto.endpoint }, create: { endpoint: dto.endpoint, ...dados }, update: dados });
  }

  async sair(usuarioId: string, endpoint: string) {
    await this.prisma.avisoCelular.deleteMany({ where: { usuarioId, endpoint } });
  }

  aparelhos(usuarioId: string) {
    return this.prisma.avisoCelular.findMany({ where: { usuarioId }, select: { endpoint: true, aparelho: true, criadoEm: true }, orderBy: { criadoEm: 'desc' } });
  }

  // Manda para os aparelhos dos ADMs. Nunca derruba quem chamou: se falhar, só fica no registro.
  avisarAdmins(aviso: AvisoPush) {
    this.enviarParaAdmins(aviso).catch((e) => this.log.warn(`Aviso no celular não saiu: ${(e as Error).message}`));
  }

  async enviarParaAdmins(aviso: AvisoPush, soUsuarioId?: string) {
    const emails = emailsAdmin();
    const usuarios = await this.prisma.usuario.findMany({ where: soUsuarioId ? { id: soUsuarioId } : { email: { in: emails } }, select: { id: true } });
    const inscricoes = await this.prisma.avisoCelular.findMany({ where: { usuarioId: { in: usuarios.map((u) => u.id) } } });
    if (!inscricoes.length) return { enviados: 0, aparelhos: 0 };
    const chaves = await this.obterChaves();
    const opcoes: webpush.RequestOptions = {
      vapidDetails: { subject: 'mailto:avisos@safetynexo.com.br', publicKey: chaves.publica, privateKey: chaves.privada },
      TTL: 24 * 3600, // se o celular estiver desligado, o aviso espera até 1 dia
      urgency: 'high',
    };
    const corpo = JSON.stringify(aviso);
    let enviados = 0;
    await Promise.all(
      inscricoes.map(async (i) => {
        try {
          await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, corpo, opcoes);
          enviados++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          // 404/410: o aparelho desligou os avisos ou o site foi removido da tela de início. Tira da lista.
          if (status === 404 || status === 410) await this.prisma.avisoCelular.delete({ where: { id: i.id } }).catch(() => undefined);
          else this.log.warn(`Aviso para ${i.aparelho ?? 'aparelho'} falhou (${status ?? '?'}): ${(e as Error).message}`);
        }
      }),
    );
    return { enviados, aparelhos: inscricoes.length };
  }
}

@SomenteAdmin()
@Controller('admin/avisos-celular')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get()
  async ver(@Sessao() s: SessaoUsuario) {
    return { chavePublica: await this.push.chavePublica(), aparelhos: (await this.push.aparelhos(s.sub)).map((a) => ({ ...a, endpoint: a.endpoint.slice(-24) })) };
  }

  @Post()
  async inscrever(@Sessao() s: SessaoUsuario, @Body() dto: InscricaoDto) {
    await this.push.inscrever(s.sub, dto);
    return { ok: true };
  }

  @Delete()
  async sair(@Sessao() s: SessaoUsuario, @Body() dto: SairDto) {
    await this.push.sair(s.sub, dto.endpoint);
    return { ok: true };
  }

  @Post('teste')
  async teste(@Sessao() s: SessaoUsuario) {
    const r = await this.push.enviarParaAdmins({ titulo: 'Safety Nexo', corpo: 'Teste: os avisos no celular estão funcionando.', url: '/admin', tag: 'teste' }, s.sub);
    if (!r.aparelhos) throw new ServiceUnavailableException('Nenhum aparelho ligado ainda. Toque em "Ligar avisos neste aparelho" primeiro.');
    return r;
  }
}

@Global()
@Module({ providers: [PushService], controllers: [PushController], exports: [PushService] })
export class PushModule {}
