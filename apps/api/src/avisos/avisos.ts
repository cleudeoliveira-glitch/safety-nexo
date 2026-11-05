import { Body, Controller, Get, Headers, Injectable, Logger, Module, Post, Put, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { IsBoolean } from 'class-validator';
import { Publica } from '../auth/publica.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { enviarEmail, WEB } from '../common/email';
import { escape } from '../documentos/layout';
import { NormasModule, NormasService } from '../normas/normas';
import { PainelModule } from '../painel/painel.module';
import { Pendencia, PainelService } from '../painel/painel.service';
import { PrismaService } from '../prisma/prisma.service';

class PreferenciaDto { @IsBoolean() avisosEmail!: boolean; }

type Bloco = { empresa: string; empresaId: string; pendencias: Pendencia[] };
type Norma = { titulo: string; vigenciaEm: Date | null; empresas: { razaoSocial: string }[] };

const COR = { vencido: '#EF4444', pendente: '#FF8C69', 'em-dia': '#10B981' };

export function emailHtml(nome: string, blocos: Bloco[], normas: Norma[]) {
  const total = blocos.reduce((s, b) => s + b.pendencias.length, 0);
  const vencidos = blocos.reduce((s, b) => s + b.pendencias.filter((p) => p.nivel === 'vencido').length, 0);
  const linhas = blocos.filter((b) => b.pendencias.length).map((b) => `
    <h3 style="margin:20px 0 6px;color:#0E4A5B;font-size:16px">${escape(b.empresa)}</h3>
    <ul style="margin:0;padding-left:18px">${b.pendencias.slice(0, 15).map((p) => `<li style="margin:4px 0"><span style="color:${COR[p.nivel]};font-weight:600">${escape(p.titulo)}</span><br/><span style="color:#6b7280;font-size:13px">${escape(p.detalhe)}</span></li>`).join('')}
    ${b.pendencias.length > 15 ? `<li style="color:#6b7280">e mais ${b.pendencias.length - 15}…</li>` : ''}</ul>
    <p style="margin:6px 0"><a href="${WEB()}/empresas/${b.empresaId}" style="color:#0E4A5B">Abrir a empresa</a></p>`).join('');
  const blocoNormas = normas.length ? `<h3 style="margin:24px 0 6px;color:#0E4A5B;font-size:16px">Mudanças nas normas</h3><ul style="margin:0;padding-left:18px">${normas.map((n) => `<li style="margin:4px 0"><strong>${escape(n.titulo)}</strong>${n.vigenciaEm ? ` · vale a partir de ${n.vigenciaEm.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}` : ''}<br/><span style="color:#6b7280;font-size:13px">Afeta: ${n.empresas.length ? escape(n.empresas.map((e) => e.razaoSocial).join(', ')) : 'nenhuma empresa sua'}</span></li>`).join('')}</ul>` : '';
  return `<div style="font-family:Inter,Arial,sans-serif;color:#1F2937;max-width:620px;margin:auto">
    <div style="background:#0E4A5B;color:#fff;padding:18px 20px;border-radius:12px 12px 0 0"><strong style="font-size:18px">Safety Nexo</strong><br/>Resumo da semana</div>
    <div style="border:1px solid #E5E7EB;border-top:0;padding:18px 20px;border-radius:0 0 12px 12px">
      <p>Olá, ${escape(nome.split(' ')[0])}! ${total ? `Você tem <strong>${total} item(ns)</strong> para cuidar${vencidos ? `, sendo <strong style="color:#EF4444">${vencidos} vencido(s)</strong>` : ''}.` : 'Tudo em dia nas suas empresas. Bom trabalho!'}</p>
      ${linhas}${blocoNormas}
      <p style="margin-top:24px;font-size:12px;color:#6b7280">Você recebe este e-mail toda segunda-feira. Para parar, desligue em <a href="${WEB()}/" style="color:#6b7280">Painel › Avisos por e-mail</a>.</p>
    </div></div>`;
}

// Resumo semanal: pendências e vencimentos de cada empresa + mudanças de norma não lidas.
@Injectable()
export class AvisosService {
  private readonly log = new Logger('AvisosSemanais');
  constructor(private readonly prisma: PrismaService, private readonly painel: PainelService, private readonly normas: NormasService) {}

  private async blocos(consultoriaId: string, empresaIds: string[]) {
    const blocos: Bloco[] = [];
    for (const id of empresaIds) {
      const p = await this.painel.montar(consultoriaId, id);
      blocos.push({ empresa: p.empresa.razaoSocial, empresaId: id, pendencias: p.pendencias.filter((x) => x.nivel !== 'em-dia').sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === 'vencido' ? -1 : 1)) });
    }
    return blocos;
  }

  async previa(consultoriaId: string) {
    const [empresas, usuario, normas, c] = await Promise.all([
      this.prisma.empresa.findMany({ where: { consultoriaId }, select: { id: true }, orderBy: { razaoSocial: 'asc' } }),
      this.prisma.usuario.findFirst({ where: { consultoriaId, papel: 'CONSULTORIA' }, orderBy: { createdAt: 'asc' }, select: { nome: true } }),
      this.normas.daConsultoria(consultoriaId),
      this.prisma.consultoria.findUnique({ where: { id: consultoriaId }, select: { avisosEmail: true } }),
    ]);
    return { avisosEmail: c?.avisosEmail ?? true, emailLigado: !!process.env.RESEND_API_KEY, html: emailHtml(usuario?.nome ?? '', await this.blocos(consultoriaId, empresas.map((e) => e.id)), normas.filter((n) => !n.lido)) };
  }

  async preferencia(consultoriaId: string, avisosEmail: boolean) {
    await this.prisma.consultoria.update({ where: { id: consultoriaId }, data: { avisosEmail } });
    return { avisosEmail };
  }

  async enviarTodos() {
    if (!process.env.RESEND_API_KEY) throw new ServiceUnavailableException('Falta a chave RESEND_API_KEY no servidor para mandar e-mails.');
    const consultorias = await this.prisma.consultoria.findMany({
      where: { bloqueada: false, avisosEmail: true },
      select: { id: true, empresas: { select: { id: true }, orderBy: { razaoSocial: 'asc' } }, usuarios: { select: { nome: true, email: true, papel: true, empresaId: true } } },
    });
    let enviados = 0; let falhas = 0;
    for (const c of consultorias) {
      if (!c.empresas.length) continue;
      try {
        const blocos = await this.blocos(c.id, c.empresas.map((e) => e.id));
        const normas = (await this.normas.daConsultoria(c.id)).filter((n) => !n.lido);
        const equipe = c.usuarios.filter((u) => u.papel === 'CONSULTORIA');
        if (equipe.length && (blocos.some((b) => b.pendencias.length) || normas.length)) {
          await enviarEmail(equipe.map((u) => u.email), 'Safety Nexo: o que vence e o que falta nesta semana', emailHtml(equipe[0].nome, blocos, normas));
          enviados++;
        }
        // Login da empresa cliente: só a empresa dela, sem as normas (isso é com a consultoria).
        for (const u of c.usuarios.filter((x) => x.papel === 'EMPRESA' && x.empresaId)) {
          const b = blocos.find((x) => x.empresaId === u.empresaId);
          if (!b?.pendencias.length) continue;
          await enviarEmail([u.email], `Segurança do trabalho: pendências da ${b.empresa}`, emailHtml(u.nome, [b], []));
          enviados++;
        }
      } catch (e) {
        falhas++;
        this.log.error(`consultoria ${c.id}: ${(e as Error).message}`);
      }
    }
    return { enviados, falhas };
  }
}

@Controller('avisos')
export class AvisosController {
  constructor(private readonly a: AvisosService) {}
  @Get('previa') previa(@ConsultoriaId() c: string) { return this.a.previa(c); }
  @Put('preferencia') preferencia(@ConsultoriaId() c: string, @Body() d: PreferenciaDto) { return this.a.preferencia(c, d.avisosEmail); }
}

// Chamado toda segunda pelo agendador do GitHub (.github/workflows/avisos-semanais.yml).
@Publica()
@Controller('tarefas')
export class TarefasController {
  constructor(private readonly a: AvisosService) {}
  @Post('avisos-semanais')
  enviar(@Headers('x-tarefa-segredo') segredo?: string) {
    const certo = process.env.TAREFAS_SEGREDO;
    if (!certo) throw new ServiceUnavailableException('Falta TAREFAS_SEGREDO no servidor.');
    const a = Buffer.from(segredo ?? ''); const b = Buffer.from(certo);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException('Segredo da tarefa incorreto.');
    return this.a.enviarTodos();
  }
}

@Module({ imports: [PainelModule, NormasModule], controllers: [AvisosController, TarefasController], providers: [AvisosService] })
export class AvisosModule {}
