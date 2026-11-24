import { BadRequestException, Body, Controller, Get, Headers, HttpException, HttpStatus, Injectable, Logger, Module, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { emailsAdmin, SomenteAdmin } from '../admin/admin-plataforma';
import { Publica } from '../auth/publica.decorator';
import { Sessao, SessaoUsuario } from '../common/sessao.decorator';
import { conferirSegredo } from '../common/segredo';
import { emailLigado, emailMoldura, enviarEmail } from '../common/email';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push';

// "Relatar problema": o cliente conta o que aconteceu e o aviso cai no celular do dono da plataforma.
// O dono responde no Painel ADM > Pedidos dos clientes; a resposta aparece para o cliente e vai por e-mail.
// Também tem o resumo do dia (8h): o que aconteceu nas últimas 24 horas e o que está esperando por ele.

const TIPOS = { PROBLEMA: 'Algo deu errado', DUVIDA: 'Dúvida', SUGESTAO: 'Sugestão' } as const;

class NovoPedidoDto {
  @IsIn(Object.keys(TIPOS)) tipo!: keyof typeof TIPOS;
  @IsString() @MinLength(5, { message: 'Conte um pouco mais (pelo menos 5 letras).' }) @MaxLength(3000) mensagem!: string;
  @IsOptional() @IsString() @MaxLength(300) tela?: string;
}
class RespostaDto {
  @IsOptional() @IsString() @MaxLength(3000) resposta?: string;
  @IsOptional() @IsIn(['ABERTO', 'RESPONDIDO', 'RESOLVIDO']) status?: 'ABERTO' | 'RESPONDIDO' | 'RESOLVIDO';
}

const WEB = () => (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');
const DIA = 24 * 3600_000;
const escapar = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

@Injectable()
export class SuporteService {
  private readonly log = new Logger('Suporte');
  constructor(private readonly prisma: PrismaService, private readonly push: PushService) {}

  async criar(s: SessaoUsuario, dto: NovoPedidoDto) {
    // Freio contra envio repetido: até 10 pedidos por pessoa em 24 horas.
    const hoje = await this.prisma.pedidoSuporte.count({ where: { usuarioId: s.sub, createdAt: { gte: new Date(Date.now() - DIA) } } });
    if (hoje >= 10) throw new HttpException('Você já mandou 10 pedidos hoje. Já estamos olhando; se for urgente, chame no WhatsApp.', HttpStatus.TOO_MANY_REQUESTS);
    const mensagem = dto.mensagem.trim();
    const pedido = await this.prisma.pedidoSuporte.create({
      data: { consultoriaId: s.consultoriaId, usuarioId: s.sub, tipo: dto.tipo, mensagem, tela: dto.tela?.slice(0, 300) || null },
    });
    const [u, c] = await Promise.all([
      this.prisma.usuario.findUnique({ where: { id: s.sub }, select: { nome: true } }),
      this.prisma.consultoria.findUnique({ where: { id: s.consultoriaId }, select: { nome: true } }),
    ]);
    this.push.avisarAdmins({
      titulo: dto.tipo === 'PROBLEMA' ? 'Cliente relatou um problema' : dto.tipo === 'DUVIDA' ? 'Cliente com dúvida' : 'Sugestão de cliente',
      corpo: `${u?.nome ?? 'Cliente'} (${c?.nome ?? 'consultoria'}): "${mensagem.slice(0, 140)}"`,
      url: '/admin/suporte', tag: `suporte-${pedido.id}`,
    }, 'suporte');
    return pedido;
  }

  meus(s: SessaoUsuario) {
    return this.prisma.pedidoSuporte.findMany({ where: { usuarioId: s.sub }, orderBy: { createdAt: 'desc' }, take: 30 });
  }

  async todos() {
    const pedidos = await this.prisma.pedidoSuporte.findMany({ orderBy: [{ createdAt: 'desc' }], take: 200 });
    const [usuarios, consultorias] = await Promise.all([
      this.prisma.usuario.findMany({ where: { id: { in: [...new Set(pedidos.map((p) => p.usuarioId))] } }, select: { id: true, nome: true, email: true, papel: true } }),
      this.prisma.consultoria.findMany({ where: { id: { in: [...new Set(pedidos.map((p) => p.consultoriaId))] } }, select: { id: true, nome: true } }),
    ]);
    const u = new Map(usuarios.map((x) => [x.id, x]));
    const c = new Map(consultorias.map((x) => [x.id, x.nome]));
    return pedidos.map((p) => ({ ...p, usuario: u.get(p.usuarioId) ?? null, consultoria: c.get(p.consultoriaId) ?? null }));
  }

  async responder(id: string, dto: RespostaDto) {
    const p = await this.prisma.pedidoSuporte.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Pedido não encontrado.');
    const resposta = dto.resposta?.trim();
    if (!resposta && !dto.status) throw new BadRequestException('Escreva a resposta ou escolha a situação.');
    const atualizado = await this.prisma.pedidoSuporte.update({
      where: { id },
      data: {
        ...(resposta ? { resposta, respondidoEm: new Date() } : {}),
        status: dto.status ?? (resposta ? 'RESPONDIDO' : p.status),
      },
    });
    if (resposta && emailLigado()) {
      const u = await this.prisma.usuario.findUnique({ where: { id: p.usuarioId }, select: { email: true, nome: true } });
      if (u) {
        const corpo = `<p>Olá, ${escapar(u.nome.split(' ')[0])}.</p><p>Respondemos o que você mandou pelo Safety Nexo:</p>
          <p style="border-left:3px solid #10B981;padding-left:10px;color:#6b7280">${escapar(p.mensagem.slice(0, 600))}</p>
          <p><b>Resposta:</b><br>${escapar(resposta).replace(/\n/g, '<br>')}</p>
          <p><a href="${WEB()}/suporte" style="display:inline-block;background:#10B981;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600">Ver no sistema</a></p>`;
        await enviarEmail([u.email], 'Safety Nexo: resposta ao seu pedido', emailMoldura('Resposta ao seu pedido', corpo)).catch((e) => this.log.warn(`E-mail de resposta não saiu: ${(e as Error).message}`));
      }
    }
    return atualizado;
  }

  // Resumo do dia para o celular do dono: o que aconteceu nas últimas 24 horas e o que está esperando.
  async resumoDoDia() {
    const desde = new Date(Date.now() - DIA);
    const admins = emailsAdmin();
    const [cadastros, entraram, pagamentos, erros, abertos, normas, pedidosPlano, atrasadas] = await Promise.all([
      this.prisma.consultoria.count({ where: { createdAt: { gte: desde } } }),
      this.prisma.usuario.count({ where: { ultimoAcesso: { gte: desde }, email: { notIn: admins } } }),
      this.prisma.pagamentoPlano.count({ where: { status: 'PAGO', pagoEm: { gte: desde } } }),
      this.prisma.falhaSistema.count({ where: { ultimaEm: { gte: desde } } }),
      this.prisma.pedidoSuporte.count({ where: { status: 'ABERTO' } }),
      this.prisma.avisoNorma.count({ where: { status: 'RASCUNHO' } }),
      this.prisma.consultoria.count({ where: { pedidoPlano: { not: null } } }),
      this.prisma.consultoria.count({ where: { assinaturaStatus: 'ATRASADA' } }),
    ]);
    const ontem = [
      cadastros && `${cadastros} cadastro${cadastros > 1 ? 's' : ''} novo${cadastros > 1 ? 's' : ''}`,
      `${entraram} pessoa${entraram === 1 ? '' : 's'} usando o sistema`,
      pagamentos && `${pagamentos} pagamento${pagamentos > 1 ? 's' : ''}`,
    ].filter(Boolean);
    const olhar = [
      abertos && `${abertos} pedido${abertos > 1 ? 's' : ''} de cliente sem resposta`,
      erros && `${erros} erro${erros > 1 ? 's' : ''} no Diagnóstico`,
      normas && `${normas} norma${normas > 1 ? 's' : ''} para aprovar`,
      pedidosPlano && `${pedidosPlano} pedido${pedidosPlano > 1 ? 's' : ''} de plano`,
      atrasadas && `${atrasadas} pagamento${atrasadas > 1 ? 's' : ''} atrasado${atrasadas > 1 ? 's' : ''}`,
    ].filter(Boolean);
    const corpo = `Últimas 24h: ${ontem.join(', ')}. ${olhar.length ? `Para olhar: ${olhar.join(', ')}.` : 'Nada pendente, tudo tranquilo.'}`;
    // Vai para a tela que mais precisa: pedido de cliente, depois erro, depois norma.
    const url = abertos ? '/admin/suporte' : erros ? '/admin/diagnostico' : normas ? '/admin/normas' : '/admin';
    await this.push.enviarParaAdmins({ titulo: olhar.length ? `Bom dia! ${olhar.length} coisa${olhar.length > 1 ? 's' : ''} para olhar` : 'Bom dia! Tudo em ordem', corpo, url, tag: 'resumo' }, undefined, 'resumo');
    return { corpo, url };
  }
}

@Controller('suporte')
export class SuporteController {
  constructor(private readonly s: SuporteService) {}
  @Post() criar(@Sessao() sessao: SessaoUsuario, @Body() dto: NovoPedidoDto) { return this.s.criar(sessao, dto); }
  @Get() meus(@Sessao() sessao: SessaoUsuario) { return this.s.meus(sessao); }
}

@SomenteAdmin()
@Controller('admin/suporte')
export class SuporteAdmController {
  constructor(private readonly s: SuporteService) {}
  @Get() todos() { return this.s.todos(); }
  @Patch(':id') responder(@Param('id') id: string, @Body() dto: RespostaDto) { return this.s.responder(id, dto); }
}

// Chamado todo dia às 8h (Brasília) pelo agendador do GitHub (.github/workflows/resumo-do-dia.yml).
@Publica()
@Controller('tarefas')
export class ResumoDoDiaController {
  constructor(private readonly s: SuporteService) {}
  @Post('resumo-do-dia')
  enviar(@Headers('x-tarefa-segredo') segredo?: string) {
    conferirSegredo(segredo, process.env.TAREFAS_SEGREDO, 'Falta TAREFAS_SEGREDO no servidor.', 'Segredo da tarefa incorreto.');
    return this.s.resumoDoDia();
  }
}

@Module({ controllers: [SuporteController, SuporteAdmController, ResumoDoDiaController], providers: [SuporteService] })
export class SuporteModule {}
