import { BadRequestException, Body, Controller, Get, Headers, Injectable, Ip, Logger, NotFoundException, Param, Post, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { Cobranca, Consultoria, Empresa } from '@prisma/client';
import { randomBytes, timingSafeEqual } from 'crypto';
import * as QRCode from 'qrcode';
import { Publica } from '../auth/publica.decorator';
import { emailLigado, emailMoldura, enviarEmail, WEB } from '../common/email';
import { escape } from '../documentos/layout';
import { PdfService } from '../documentos/pdf.service';
import { LogosService } from '../logos/logos.service';
import { PrismaService } from '../prisma/prisma.service';
import { chavePixValida, pixCopiaECola } from './pix';
import { cobrancaHtml, ItemProposta, reais, totalItens } from './templates';

const hoje = () => new Date(new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10));
const data = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const DIA = 86_400_000;

export class RespostaPropostaDto {
  @IsString() @Length(3, 120, { message: 'Escreva seu nome completo.' }) nome!: string;
  @IsOptional() @IsString() @MaxLength(80) cargo?: string;
  @IsOptional() @IsString() @MaxLength(1000) motivo?: string;
}

export const linkProposta = (token: string) => `${WEB()}/proposta/${token}`;

// Limite simples contra abuso da página pública: 30 respostas por hora por endereço.
const tentativas = new Map<string, number[]>();
function limitar(ip: string) {
  const agora = Date.now();
  const lista = (tentativas.get(ip) ?? []).filter((t) => agora - t < 3600_000);
  if (lista.length >= 30) throw new BadRequestException('Muitas tentativas seguidas. Tente de novo mais tarde.');
  lista.push(agora);
  tentativas.set(ip, lista);
}

// ---------- proposta com aprovação online ----------
@Injectable()
export class PropostaOnlineService {
  private readonly log = new Logger('PropostaOnline');
  constructor(private readonly prisma: PrismaService) {}

  // Cria (ou reaproveita) o link que a consultora manda ao cliente por WhatsApp ou e-mail.
  async link(consultoriaId: string, id: string) {
    const p = await this.prisma.proposta.findFirst({ where: { id, consultoriaId } });
    if (!p) throw new NotFoundException('Proposta não encontrada');
    const token = p.token ?? randomBytes(18).toString('base64url');
    if (!p.token) await this.prisma.proposta.update({ where: { id }, data: { token } });
    return { token, url: linkProposta(token) };
  }

  private async achar(token: string) {
    const p = await this.prisma.proposta.findUnique({ where: { token }, include: { consultoria: true } });
    if (!p) throw new NotFoundException('Proposta não encontrada. Confira o link com quem enviou.');
    return p;
  }

  private vencida(p: { data: Date; validadeDias: number }) {
    return hoje().getTime() > p.data.getTime() + p.validadeDias * DIA;
  }

  async ver(token: string) {
    const p = await this.achar(token);
    const itens = p.itens as ItemProposta[];
    return {
      numero: p.numero, data: p.data, validadeAte: new Date(p.data.getTime() + p.validadeDias * DIA), vencida: this.vencida(p),
      consultoria: { nome: p.consultoria.nome, cnpj: p.consultoria.cnpj, cidade: p.consultoria.cidade },
      cliente: { nome: p.clienteNome, cnpj: p.clienteCnpj, contato: p.clienteContato },
      itens, total: totalItens(itens), observacoes: p.observacoes,
      status: p.status, respostaNome: p.respostaNome, respostaEm: p.respostaEm,
    };
  }

  async responder(token: string, aceitar: boolean, d: RespostaPropostaDto, ip: string) {
    limitar(ip);
    const p = await this.achar(token);
    if (p.status !== 'ABERTA') throw new BadRequestException(p.status === 'ACEITA' ? 'Esta proposta já foi aceita.' : 'Esta proposta já foi respondida.');
    if (aceitar && this.vencida(p)) throw new BadRequestException('O prazo desta proposta acabou. Peça uma proposta atualizada a quem enviou.');
    const agora = new Date();
    const nome = d.nome.trim();
    const cargo = d.cargo?.trim() || null;
    // updateMany com status ABERTA evita duas respostas ao mesmo tempo.
    const { count } = await this.prisma.proposta.updateMany({
      where: { id: p.id, status: 'ABERTA' },
      data: { status: aceitar ? 'ACEITA' : 'RECUSADA', respostaNome: nome, respostaCargo: cargo, respostaEm: agora, respostaIp: ip, motivoRecusa: aceitar ? null : d.motivo?.trim() || null },
    });
    if (!count) throw new BadRequestException('Esta proposta já foi respondida.');

    // Aceita e com empresa cadastrada: o contrato já sai pronto, com o registro do aceite.
    let contrato: number | null = null;
    if (aceitar && p.empresaId) {
      const ultimo = await this.prisma.contrato.findFirst({ where: { consultoriaId: p.consultoriaId }, orderBy: { numero: 'desc' }, select: { numero: true } });
      const itens = p.itens as ItemProposta[];
      const c = await this.prisma.contrato.create({
        data: {
          consultoriaId: p.consultoriaId, numero: (ultimo?.numero ?? 0) + 1, empresaId: p.empresaId, propostaId: p.id,
          objeto: itens.map((i) => `${i.quantidade > 1 ? `${i.quantidade} x ` : ''}${i.descricao}`).join('\n'),
          inicio: hoje(),
          observacoes: [p.observacoes, `Proposta nº ${p.numero} (${reais(totalItens(itens))}) aceita online por ${nome}${cargo ? ` (${cargo})` : ''} em ${agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`].filter(Boolean).join('\n'),
        },
      });
      contrato = c.numero;
    }

    await this.avisarConsultoria(p.consultoriaId, p.numero, p.clienteNome, aceitar, nome, cargo, d.motivo, contrato).catch((e) => this.log.error((e as Error).message));
    return { ok: true, status: aceitar ? 'ACEITA' : 'RECUSADA' };
  }

  private async avisarConsultoria(consultoriaId: string, numero: number, cliente: string, aceitou: boolean, nome: string, cargo: string | null, motivo: string | undefined, contrato: number | null) {
    if (!emailLigado()) return;
    const equipe = await this.prisma.usuario.findMany({ where: { consultoriaId, papel: 'CONSULTORIA' }, select: { email: true } });
    if (!equipe.length) return;
    const quem = `${escape(nome)}${cargo ? ` (${escape(cargo)})` : ''}`;
    const corpo = aceitou
      ? `<p><strong>${escape(cliente)}</strong> aceitou a proposta nº ${numero}. Quem aceitou: ${quem}.</p>
         <p>${contrato ? `O contrato nº ${contrato} já foi criado. Confira o valor da mensalidade e o vencimento antes de mandar.` : 'Cadastre a empresa e faça o contrato a partir da proposta.'}</p>`
      : `<p><strong>${escape(cliente)}</strong> recusou a proposta nº ${numero}. Quem respondeu: ${quem}.</p>${motivo ? `<p>Motivo: ${escape(motivo)}</p>` : ''}`;
    await enviarEmail(equipe.map((u) => u.email), `Proposta nº ${numero} ${aceitou ? 'aceita' : 'recusada'} por ${cliente}`,
      emailMoldura('Safety Nexo · Comercial', `${corpo}<p><a href="${WEB()}/comercial" style="color:#0E4A5B">Abrir o Comercial</a></p>`));
  }
}

@Publica()
@Controller('proposta-online')
export class PropostaOnlineController {
  constructor(private readonly s: PropostaOnlineService) {}
  @Get(':token') ver(@Param('token') t: string) { return this.s.ver(t); }
  @Post(':token/aceitar') aceitar(@Param('token') t: string, @Ip() ip: string, @Body() d: RespostaPropostaDto) { return this.s.responder(t, true, d, ip); }
  @Post(':token/recusar') recusar(@Param('token') t: string, @Ip() ip: string, @Body() d: RespostaPropostaDto) { return this.s.responder(t, false, d, ip); }
}

// ---------- régua de cobrança ----------
// Avisos por e-mail para a empresa cliente: 3 dias antes, no dia, 3 e 10 dias depois do vencimento.
// Só para consultorias que ligaram a régua e empresas com e-mail de cobrança (ou login da empresa).
export const REGUA: { codigo: string; dias: number; assunto: (n: string) => string; texto: string }[] = [
  { codigo: 'ANTES3', dias: -3, assunto: (n) => `Lembrete: cobrança de ${n} vence em 3 dias`, texto: 'vence em 3 dias' },
  { codigo: 'DIA', dias: 0, assunto: (n) => `Cobrança de ${n} vence hoje`, texto: 'vence hoje' },
  { codigo: 'DEPOIS3', dias: 3, assunto: (n) => `Cobrança de ${n} em atraso`, texto: 'venceu há 3 dias e ainda não consta como paga' },
  { codigo: 'DEPOIS10', dias: 10, assunto: (n) => `Cobrança de ${n} com 10 dias de atraso`, texto: 'venceu há 10 dias e ainda não consta como paga' },
];

// Qual aviso cabe hoje (o mais recente ainda não mandado). Se o servidor ficou dias parado, não manda os atrasados em fila.
export function avisoDoDia(vencimento: Date, dia: Date, jaMandados: string[]) {
  const diff = Math.round((dia.getTime() - vencimento.getTime()) / DIA);
  const cabem = REGUA.filter((r) => diff >= r.dias && diff - r.dias <= 2);
  const r = cabem[cabem.length - 1];
  return r && !jaMandados.includes(r.codigo) ? r : null;
}

@Injectable()
export class ReguaCobrancaService {
  private readonly log = new Logger('ReguaCobranca');
  constructor(private readonly prisma: PrismaService, private readonly pdf: PdfService, private readonly logos: LogosService) {}

  private destinatarios(e: { emailCobranca: string | null; usuarios: { email: string }[] }) {
    return e.emailCobranca ? [e.emailCobranca] : e.usuarios.map((u) => u.email);
  }

  // O que a régua vai mandar (e para quem), para a consultora conferir na tela.
  async previa(consultoriaId: string) {
    const c = await this.prisma.consultoria.findUnique({ where: { id: consultoriaId }, select: { reguaCobranca: true } });
    const abertas = await this.prisma.cobranca.findMany({
      where: { consultoriaId, status: 'ABERTA' },
      include: { empresa: { select: { razaoSocial: true, emailCobranca: true, usuarios: { where: { papel: 'EMPRESA' }, select: { email: true } } } } },
      orderBy: { vencimento: 'asc' },
    });
    const semEmail = [...new Set(abertas.filter((a) => !this.destinatarios(a.empresa).length).map((a) => a.empresa.razaoSocial))];
    return { ligada: c?.reguaCobranca ?? false, emailLigado: emailLigado(), semEmail };
  }

  async ligar(consultoriaId: string, ligada: boolean) {
    await this.prisma.consultoria.update({ where: { id: consultoriaId }, data: { reguaCobranca: ligada } });
    return this.previa(consultoriaId);
  }

  async rodar() {
    if (!emailLigado()) throw new ServiceUnavailableException('Falta a chave RESEND_API_KEY no servidor para mandar e-mails.');
    const dia = hoje();
    const cobrancas = await this.prisma.cobranca.findMany({
      where: {
        status: 'ABERTA', consultoria: { reguaCobranca: true, bloqueada: false },
        vencimento: { gte: new Date(dia.getTime() - 13 * DIA), lte: new Date(dia.getTime() + 3 * DIA) },
      },
      include: { consultoria: true, empresa: { include: { usuarios: { where: { papel: 'EMPRESA' }, select: { email: true } } } } },
    });
    let enviados = 0; let falhas = 0;
    for (const cb of cobrancas) {
      const r = avisoDoDia(cb.vencimento, dia, cb.avisos);
      const para = this.destinatarios(cb.empresa);
      if (!r || !para.length) continue;
      try {
        const cons = cb.consultoria;
        const pix = cons.pixChave && chavePixValida(cons.pixChave)
          ? pixCopiaECola({ chave: cons.pixChave, nome: cons.pixNome || cons.nome, cidade: cons.cidade || 'BRASIL', valorCentavos: cb.valorCentavos, txid: cb.txid })
          : null;
        const html = emailMoldura(escape(cons.nome), `
          <p>Olá! A cobrança abaixo ${r.texto}.</p>
          <table style="border-collapse:collapse;width:100%;font-size:14px">
            <tr><td style="padding:6px 0;color:#6b7280">Empresa</td><td style="padding:6px 0"><strong>${escape(cb.empresa.razaoSocial)}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Referente a</td><td style="padding:6px 0">${escape(cb.descricao)}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Valor</td><td style="padding:6px 0"><strong>${reais(cb.valorCentavos)}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Vencimento</td><td style="padding:6px 0">${data(cb.vencimento)}</td></tr>
          </table>
          ${pix ? `<p style="margin-top:16px"><strong>Pix copia e cola</strong> (cole no app do banco):</p><p style="word-break:break-all;background:#F8F9FB;padding:10px;border-radius:8px;font-family:monospace;font-size:12px">${escape(pix)}</p>` : ''}
          <p>O documento da cobrança, com QR Code, vai em anexo. Se já pagou, desconsidere este aviso.</p>`,
          `Aviso automático enviado por ${escape(cons.nome)} pelo Safety Nexo.`);
        const anexo = await this.pdfCobranca(cb, pix);
        const responder = (await this.prisma.usuario.findFirst({ where: { consultoriaId: cons.id, papel: 'CONSULTORIA' }, orderBy: { createdAt: 'asc' }, select: { email: true } }))?.email;
        await enviarEmail(para, r.assunto(cons.nome), html, anexo ? [{ filename: `Cobranca-${data(cb.vencimento).replace(/\//g, '-')}.pdf`, content: anexo }] : [], responder);
        await this.prisma.cobranca.update({ where: { id: cb.id }, data: { avisos: { push: r.codigo } } });
        enviados++;
      } catch (e) {
        falhas++;
        this.log.error(`cobrança ${cb.id}: ${(e as Error).message}`);
      }
    }
    return { enviados, falhas };
  }

  // PDF da cobrança em anexo; se o gerador de PDF falhar, o e-mail segue sem anexo.
  private async pdfCobranca(cb: Cobranca & { empresa: Empresa; consultoria: Consultoria }, pix: string | null) {
    try {
      const pixDados = pix ? { copiaECola: pix, qr: await QRCode.toDataURL(pix, { margin: 1, width: 340 }), recebedor: cb.consultoria.pixNome || cb.consultoria.nome } : null;
      const m = {
        titulo: 'Cobrança', logoEmpresa: await this.logos.comoDataUri(cb.empresa.logoPath),
        consultoria: { nome: cb.consultoria.nome, logo: await this.logos.comoDataUri(cb.consultoria.logoPath) }, infos: [], aviso: 'Documento gerado pelo Safety Nexo.',
      };
      const buf = await this.pdf.render(cobrancaHtml(m, cb, cb.empresa, pixDados));
      return Buffer.from(buf).toString('base64');
    } catch (e) {
      this.log.warn(`PDF da cobrança ${cb.id}: ${(e as Error).message}`);
      return null;
    }
  }
}

// Chamado todo dia pelo agendador do GitHub (.github/workflows/regua-cobranca.yml).
@Publica()
@Controller('tarefas')
export class TarefaReguaController {
  constructor(private readonly r: ReguaCobrancaService) {}
  @Post('regua-cobranca')
  rodar(@Headers('x-tarefa-segredo') segredo?: string) {
    const certo = process.env.TAREFAS_SEGREDO;
    if (!certo) throw new ServiceUnavailableException('Falta TAREFAS_SEGREDO no servidor.');
    const a = Buffer.from(segredo ?? ''); const b = Buffer.from(certo);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException('Segredo da tarefa incorreto.');
    return this.r.rodar();
  }
}
