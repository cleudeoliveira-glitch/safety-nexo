import { Body, Controller, Delete, Get, Global, Injectable, Logger, Module, Post, Put, ServiceUnavailableException } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import * as webpush from 'web-push';
import { emailsAdmin, SomenteAdmin } from '../admin/admin-plataforma';
import { Sessao, SessaoUsuario } from '../common/sessao.decorator';
import { PrismaService } from '../prisma/prisma.service';

// Avisos que caem na tela do celular, mesmo bloqueada (Web Push), para os ADMs da plataforma:
// cadastro, plano, primeiro acesso, erro novo, cliente pedindo ajuda, norma para aprovar e o resumo do dia. Não usa serviço pago: o aviso vai pelo próprio Google (Android/Chrome),
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

// Tipos de aviso que cada ADM liga ou desliga no Painel ADM (cartão "Avisos no celular").
// "acessos" (cada vez que um cliente entra) vem desligado para não virar excesso; o resto vem ligado.
export const TIPOS_AVISO = {
  cadastro: { nome: 'Cadastro novo', padrao: true },
  plano: { nome: 'Plano contratado, pagamento, cancelamento', padrao: true },
  teste: { nome: 'Teste de 14 dias acabando ou terminado (e o e-mail que o cliente recebeu)', padrao: true },
  primeiroAcesso: { nome: 'Cliente entrou pela primeira vez', padrao: true },
  acessos: { nome: 'Toda vez que um cliente entra (pode ser muito aviso)', padrao: false },
  erro: { nome: 'Erro novo que um cliente viu', padrao: true },
  suporte: { nome: 'Cliente relatou um problema', padrao: true },
  normas: { nome: 'Norma nova para aprovar', padrao: true },
  resumo: { nome: 'Resumo do dia às 8h (pendências)', padrao: true },
} as const;
export type TipoAviso = keyof typeof TIPOS_AVISO;
type Preferencias = Record<TipoAviso, boolean>;
const chavePref = (usuarioId: string) => `avisos:tipos:${usuarioId}`;

class PreferenciasDto {
  @IsOptional() @IsBoolean() cadastro?: boolean;
  @IsOptional() @IsBoolean() plano?: boolean;
  @IsOptional() @IsBoolean() teste?: boolean;
  @IsOptional() @IsBoolean() primeiroAcesso?: boolean;
  @IsOptional() @IsBoolean() acessos?: boolean;
  @IsOptional() @IsBoolean() erro?: boolean;
  @IsOptional() @IsBoolean() suporte?: boolean;
  @IsOptional() @IsBoolean() normas?: boolean;
  @IsOptional() @IsBoolean() resumo?: boolean;
}

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

  async preferencias(usuarioId: string): Promise<Preferencias> {
    const padrao = Object.fromEntries(Object.entries(TIPOS_AVISO).map(([k, v]) => [k, v.padrao])) as Preferencias;
    const salvo = await this.prisma.configPlataforma.findUnique({ where: { chave: chavePref(usuarioId) } });
    if (!salvo) return padrao;
    try { return { ...padrao, ...(JSON.parse(salvo.valor) as Partial<Preferencias>) }; } catch { return padrao; }
  }

  async salvarPreferencias(usuarioId: string, dto: PreferenciasDto) {
    const atual = await this.preferencias(usuarioId);
    for (const k of Object.keys(TIPOS_AVISO) as TipoAviso[]) if (typeof dto[k] === 'boolean') atual[k] = dto[k]!;
    const valor = JSON.stringify(atual);
    await this.prisma.configPlataforma.upsert({ where: { chave: chavePref(usuarioId) }, create: { chave: chavePref(usuarioId), valor }, update: { valor } });
    return atual;
  }

  // Manda para os aparelhos dos ADMs que querem esse tipo de aviso. Nunca derruba quem chamou: se falhar, só fica no registro.
  avisarAdmins(aviso: AvisoPush, tipo: TipoAviso) {
    this.enviarParaAdmins(aviso, undefined, tipo).catch((e) => this.log.warn(`Aviso no celular não saiu: ${(e as Error).message}`));
  }

  // Algum ADM quer este tipo de aviso? Serve para não fazer trabalho à toa (ex.: aviso de cada entrada).
  async alguemQuer(tipo: TipoAviso) {
    const usuarios = await this.prisma.usuario.findMany({ where: { email: { in: emailsAdmin() } }, select: { id: true } });
    for (const u of usuarios) if ((await this.preferencias(u.id))[tipo]) return true;
    return false;
  }

  async enviarParaAdmins(aviso: AvisoPush, soUsuarioId?: string, tipo?: TipoAviso) {
    const emails = emailsAdmin();
    const usuarios = await this.prisma.usuario.findMany({ where: soUsuarioId ? { id: soUsuarioId } : { email: { in: emails } }, select: { id: true } });
    const querem: string[] = [];
    for (const u of usuarios) if (!tipo || (await this.preferencias(u.id))[tipo]) querem.push(u.id);
    const inscricoes = await this.prisma.avisoCelular.findMany({ where: { usuarioId: { in: querem } } });
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
    return {
      chavePublica: await this.push.chavePublica(),
      aparelhos: (await this.push.aparelhos(s.sub)).map((a) => ({ ...a, endpoint: a.endpoint.slice(-24) })),
      preferencias: await this.push.preferencias(s.sub),
      tipos: Object.entries(TIPOS_AVISO).map(([id, t]) => ({ id, nome: t.nome })),
    };
  }

  @Put('preferencias')
  preferencias(@Sessao() s: SessaoUsuario, @Body() dto: PreferenciasDto) {
    return this.push.salvarPreferencias(s.sub, dto);
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
