import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, HttpCode, Injectable, Logger, Module, NotFoundException, Post, ServiceUnavailableException } from '@nestjs/common';
import { IsIn, IsString, Matches } from 'class-validator';
import { ehAdminPlataforma, SomenteAdmin } from '../admin/admin-plataforma';
import { ILIMITADO, PLANOS, planoPorCodigo } from '../admin/planos';
import { fimDoPeriodo, hojeMeioDia, meioDia, somarDias } from '../admin/vigencia';
import { Publica } from '../auth/publica.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { emailLigado, emailMoldura, enviarEmail, WEB } from '../common/email';
import { situacaoPlano, TOLERANCIA_DIAS } from '../common/plano';
import { conferirSegredo } from '../common/segredo';
import { Sessao, SessaoUsuario } from '../common/sessao.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push';
import { asaas, asaasLigado, AsaasPagamento, asaasProducao } from './asaas';
import { dataBrasilia, diasAteBrasilia, EmailPronto, emailPlanoConfirmado, emailTesteAcabando, emailTesteAcabou } from './emails-plano';

// Formas que o cliente escolhe na tela "Meu plano".
// CARTAO: cartão de crédito, cobra sozinho todo mês. PIX: no 1º pagamento o banco oferece o Pix Automático.
// BOLETO: a fatura chega todo mês e deixa pagar com boleto, Pix ou cartão.
const FORMAS = { CARTAO: 'CREDIT_CARD', PIX: 'PIX', BOLETO: 'UNDEFINED' } as const;
type Forma = keyof typeof FORMAS;
const PLANOS_PAGOS = PLANOS.filter((p) => p.precoMensal > 0 && p.codigo !== 'PREMIUM').map((p) => p.codigo);

export class AssinarDto {
  @IsIn(PLANOS_PAGOS, { message: 'Escolha um dos planos pagos.' }) plano!: string;
  @IsIn(Object.keys(FORMAS), { message: 'Escolha cartão, Pix ou boleto.' }) forma!: Forma;
  @IsString() @Matches(/^\D*(\d\D*){11}$|^\D*(\d\D*){14}$/, { message: 'Digite o CPF (11 números) ou o CNPJ (14 números) de quem paga.' }) cpfCnpj!: string;
}

const STATUS: Record<string, string> = {
  PENDING: 'PENDENTE', AWAITING_RISK_ANALYSIS: 'PENDENTE', OVERDUE: 'ATRASADO',
  CONFIRMED: 'PAGO', RECEIVED: 'PAGO', RECEIVED_IN_CASH: 'PAGO',
  REFUNDED: 'ESTORNADO', REFUND_REQUESTED: 'ESTORNADO', REFUND_IN_PROGRESS: 'ESTORNADO', CHARGEBACK_REQUESTED: 'ESTORNADO', CHARGEBACK_DISPUTE: 'ESTORNADO', AWAITING_CHARGEBACK_REVERSAL: 'ESTORNADO',
};
const NOME_FORMA: Record<string, string> = { CARTAO: 'cartão de crédito', PIX: 'Pix', BOLETO: 'boleto' };
const iso = (d: Date) => d.toISOString().slice(0, 10);
const dataBr = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const valorDe = (plano: string) => planoPorCodigo(plano)?.precoMensal ?? 0;
const limiteDe = (plano: string) => planoPorCodigo(plano)?.limiteEmpresas ?? ILIMITADO;
const DIA = 86_400_000;

@Injectable()
export class PagamentosService {
  private readonly log = new Logger('Pagamentos');
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  // O que a tela "Meu plano" mostra sobre o pagamento.
  async resumo(consultoriaId: string) {
    const c = await this.prisma.consultoria.findUnique({
      where: { id: consultoriaId },
      include: { pagamentosPlano: { orderBy: { vencimento: 'desc' }, take: 12 } },
    });
    if (!c) throw new NotFoundException('Consultoria não encontrada.');
    const aberta = c.pagamentosPlano.find((p) => (p.status === 'PENDENTE' || p.status === 'ATRASADO') && p.linkFatura && p.assinaturaId === c.asaasAssinaturaId);
    return {
      ligado: asaasLigado(),
      teste: asaasLigado() && !asaasProducao(),
      toleranciaDias: TOLERANCIA_DIAS,
      assinatura: c.asaasAssinaturaId && c.assinaturaStatus !== 'CANCELADA'
        ? { plano: c.assinaturaPlano, forma: c.assinaturaForma, status: c.assinaturaStatus, pixAutomatico: c.pixAutomatico }
        : null,
      faturaAberta: aberta ? { link: aberta.linkFatura, valorCentavos: aberta.valorCentavos, vencimento: aberta.vencimento, status: aberta.status } : null,
      historico: c.pagamentosPlano.map((p) => ({ id: p.id, plano: p.plano, valorCentavos: p.valorCentavos, forma: p.forma, vencimento: p.vencimento, status: p.status, pagoEm: p.pagoEm, linkFatura: p.status === 'PAGO' ? p.linkFatura : null })),
    };
  }

  // Assina (ou troca) o plano: cria a cobrança mensal no Asaas e devolve o link da fatura para pagar.
  async assinar(consultoriaId: string, sessao: SessaoUsuario, dto: AssinarDto) {
    const c = await this.prisma.consultoria.findUnique({
      where: { id: consultoriaId },
      include: { usuarios: { where: { papel: 'CONSULTORIA' }, select: { email: true }, orderBy: { createdAt: 'asc' } }, _count: { select: { empresas: true } } },
    });
    if (!c) throw new NotFoundException('Consultoria não encontrada.');
    if (c.usuarios.some((u) => ehAdminPlataforma(u.email))) throw new BadRequestException('Esta conta tem acesso total e não paga plano.');
    const plano = planoPorCodigo(dto.plano)!;
    if (plano.limiteEmpresas !== null && c._count.empresas > plano.limiteEmpresas) {
      throw new BadRequestException(`Você já tem ${c._count.empresas} empresas e o plano ${plano.nome} aceita ${plano.limiteEmpresas}. Escolha um plano maior.`);
    }
    const cpfCnpj = dto.cpfCnpj.replace(/\D/g, '');
    const email = (await this.prisma.usuario.findUnique({ where: { id: sessao.sub }, select: { email: true } }))?.email ?? c.usuarios[0]?.email;

    let clienteId = c.asaasClienteId;
    if (!clienteId) {
      clienteId = (await asaas.criarCliente({ name: c.nome, cpfCnpj, email, externalReference: c.id })).id;
      await this.prisma.consultoria.update({ where: { id: c.id }, data: { asaasClienteId: clienteId } });
    } else {
      await asaas.atualizarCliente(clienteId, { name: c.nome, cpfCnpj, email });
    }

    // Quem já está pago continua usando até o vencimento: a nova cobrança começa no dia seguinte, sem pagar duas vezes.
    const hoje = hojeMeioDia();
    const pagoAte = c.planoPagoAte ? meioDia(c.planoPagoAte) : null;
    const emDia = c.plano !== 'FREE' && !!pagoAte && pagoAte >= hoje;
    const primeiroVencimento = emDia ? somarDias(pagoAte!, 1) : hoje;

    // Troca de plano ou de forma: a cobrança antiga é cancelada no Asaas (as faturas abertas dela somem).
    if (c.asaasAssinaturaId && c.assinaturaStatus !== 'CANCELADA') {
      await asaas.apagarAssinatura(c.asaasAssinaturaId).catch((e) => this.log.warn(`apagar ${c.asaasAssinaturaId}: ${(e as Error).message}`));
    }
    const nova = await asaas.criarAssinatura({
      customer: clienteId,
      billingType: FORMAS[dto.forma],
      value: plano.precoMensal,
      nextDueDate: iso(primeiroVencimento),
      description: `Safety Nexo, plano ${plano.nome} (mensal)`,
      externalReference: c.id,
    });

    await this.prisma.consultoria.update({
      where: { id: c.id },
      data: {
        asaasAssinaturaId: nova.id, assinaturaPlano: plano.codigo, assinaturaForma: dto.forma, pixAutomatico: false,
        assinaturaStatus: emDia ? 'ATIVA' : 'AGUARDANDO', pedidoPlano: null, pedidoPlanoEm: null,
        // Quem está em dia já passa para o plano novo; quem não está passa quando o pagamento cair.
        ...(emDia && c.plano !== plano.codigo ? { plano: plano.codigo, limiteEmpresas: limiteDe(plano.codigo) } : {}),
      },
    });
    const pagamentos = (await asaas.pagamentosDaAssinatura(nova.id)).data ?? [];
    for (const p of pagamentos) await this.guardar(c.id, nova.id, plano.codigo, p, true);
    const primeiro = pagamentos.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    this.push.avisarAdmins({ titulo: 'Plano assinado', corpo: `${c.nome} escolheu o plano ${plano.nome} no ${NOME_FORMA[dto.forma]}.`, url: '/admin', tag: `plano-${c.id}` }, 'plano');
    return { link: primeiro?.invoiceUrl ?? null, vencimento: iso(primeiroVencimento), emDia };
  }

  // Cancela a cobrança automática. O plano continua até o dia que já está pago e depois volta para o Grátis.
  async cancelar(consultoriaId: string) {
    const c = await this.prisma.consultoria.findUnique({ where: { id: consultoriaId } });
    if (!c?.asaasAssinaturaId || c.assinaturaStatus === 'CANCELADA') throw new BadRequestException('Não há cobrança automática ativa.');
    await asaas.apagarAssinatura(c.asaasAssinaturaId);
    await this.prisma.consultoria.update({ where: { id: c.id }, data: { assinaturaStatus: 'CANCELADA', pixAutomatico: false } });
    await this.prisma.pagamentoPlano.updateMany({ where: { assinaturaId: c.asaasAssinaturaId, status: { in: ['PENDENTE', 'ATRASADO'] } }, data: { status: 'CANCELADO' } });
    this.push.avisarAdmins({ titulo: 'Cobrança cancelada', corpo: `${c.nome} cancelou a cobrança automática do plano.`, url: '/admin', tag: `plano-${c.id}` }, 'plano');
    return this.resumo(c.id);
  }

  private async guardar(consultoriaId: string, assinaturaId: string | null, plano: string, p: AsaasPagamento, daAssinatura = false) {
    const status = p.deleted ? 'CANCELADO' : STATUS[p.status] ?? 'PENDENTE';
    const pagoEm = p.clientPaymentDate ?? p.paymentDate ?? p.confirmedDate;
    const dados = {
      valorCentavos: Math.round(p.value * 100), forma: p.billingType, vencimento: meioDia(`${p.dueDate}T12:00:00Z`), status,
      pagoEm: status === 'PAGO' && pagoEm ? meioDia(`${pagoEm}T12:00:00Z`) : null, linkFatura: p.invoiceUrl ?? null,
    };
    const antes = await this.prisma.pagamentoPlano.findUnique({ where: { asaasId: p.id } });
    await this.prisma.pagamentoPlano.upsert({
      where: { asaasId: p.id },
      create: { asaasId: p.id, consultoriaId, assinaturaId, plano, ...dados },
      // Vindo da assinatura recém-criada, corrige o plano (o aviso do Asaas pode ter chegado antes).
      update: daAssinatura ? { ...dados, plano, assinaturaId } : dados,
    });
    return { antes: antes?.status ?? null, depois: status, plano: antes?.plano ?? plano };
  }

  // Aviso do Asaas (webhook): pagamento criado, pago, vencido, estornado; assinatura cancelada; Pix Automático autorizado.
  async aviso(corpo: Record<string, any>) {
    const evento = String(corpo?.event ?? '');
    if (corpo?.payment) return this.avisoPagamento(evento, corpo.payment as AsaasPagamento);
    if (evento.startsWith('SUBSCRIPTION_') && corpo?.subscription?.id) {
      if (/DELETED|INACTIVATED/.test(evento)) {
        await this.prisma.consultoria.updateMany({ where: { asaasAssinaturaId: corpo.subscription.id }, data: { assinaturaStatus: 'CANCELADA', pixAutomatico: false } });
      }
      return { ok: true };
    }
    if (evento.startsWith('PIX_AUTOMATIC_RECURRING_AUTHORIZATION_')) {
      const a = corpo?.authorization ?? {};
      const assinatura = a.subscription?.id ?? a.subscriptionId ?? a.subscription;
      const cliente = a.customer?.id ?? a.customerId ?? a.customer;
      const onde = typeof assinatura === 'string' ? { asaasAssinaturaId: assinatura } : typeof cliente === 'string' ? { asaasClienteId: cliente } : null;
      if (onde) await this.prisma.consultoria.updateMany({ where: onde, data: { pixAutomatico: evento.endsWith('_ACTIVATED') } });
      return { ok: true };
    }
    return { ok: true, ignorado: evento };
  }

  private async avisoPagamento(evento: string, p: AsaasPagamento) {
    const c =
      (p.subscription ? await this.prisma.consultoria.findFirst({ where: { asaasAssinaturaId: p.subscription } }) : null) ??
      (await this.prisma.consultoria.findFirst({ where: { asaasClienteId: p.customer } }));
    if (!c) {
      this.log.warn(`pagamento ${p.id} (${evento}) sem consultoria`);
      return { ok: true, ignorado: 'sem consultoria' };
    }
    if (evento === 'PAYMENT_DELETED') p.deleted = true;
    const antigo = await this.prisma.pagamentoPlano.findUnique({ where: { asaasId: p.id } });
    const plano = antigo?.plano ?? (p.subscription && p.subscription === c.asaasAssinaturaId ? c.assinaturaPlano : null) ?? c.plano;
    const r = await this.guardar(c.id, p.subscription ?? null, plano, p);
    const daAssinaturaAtual = !!p.subscription && p.subscription === c.asaasAssinaturaId;

    if (r.depois === 'PAGO' && r.antes !== 'PAGO') {
      // Pagamento caiu: o mês pago vai do vencimento da fatura até a véspera do mesmo dia no mês seguinte.
      const inicio = meioDia(`${p.dueDate}T12:00:00Z`);
      const fim = fimDoPeriodo(inicio, 1);
      const pagoAte = c.planoPagoAte && meioDia(c.planoPagoAte) > fim ? meioDia(c.planoPagoAte) : fim;
      const trocou = c.plano !== r.plano;
      await this.prisma.consultoria.update({
        where: { id: c.id },
        data: {
          plano: r.plano, limiteEmpresas: limiteDe(r.plano), planoPagoAte: pagoAte,
          planoDesde: trocou || !c.planoDesde || c.plano === 'FREE' ? inicio : c.planoDesde,
          pedidoPlano: null, pedidoPlanoEm: null, avisosPlano: [],
          ...(daAssinaturaAtual ? { assinaturaStatus: 'ATIVA' } : {}),
        },
      });
      this.push.avisarAdmins({ titulo: 'Pagamento recebido', corpo: `${c.nome} pagou R$ ${p.value.toFixed(2).replace('.', ',')} do plano ${planoPorCodigo(r.plano)?.nome ?? r.plano}.`, url: '/admin', tag: `pago-${p.id}` }, 'plano');
      await this.mandarRecibo(c.id, p.id, r.plano, p.value, pagoAte, trocou || c.plano === 'FREE' || !c.planoDesde);
    } else if (r.depois === 'ATRASADO' && daAssinaturaAtual && c.assinaturaStatus === 'ATIVA') {
      await this.prisma.consultoria.update({ where: { id: c.id }, data: { assinaturaStatus: 'ATRASADA' } });
    } else if (r.depois === 'ESTORNADO' && r.antes !== 'ESTORNADO') {
      // Estorno ou contestação no cartão: não tira nada sozinho, só avisa o ADM para decidir.
      this.push.avisarAdmins({ titulo: 'Pagamento estornado', corpo: `${c.nome}: o pagamento de R$ ${p.value.toFixed(2).replace('.', ',')} foi estornado ou contestado. Confira no Painel ADM.`, url: '/admin', tag: `estorno-${p.id}` }, 'plano');
    }
    return { ok: true };
  }

  // E-mail "recebemos o seu pagamento" (ou "seu plano está liberado", no primeiro). Um só por pagamento:
  // a marca reciboEm é gravada antes de mandar, então dois avisos do Asaas ao mesmo tempo não mandam dois e-mails.
  private async mandarRecibo(consultoriaId: string, asaasId: string, plano: string, valor: number, pagoAte: Date, primeiro: boolean) {
    if (!emailLigado()) return;
    const marcou = await this.prisma.pagamentoPlano.updateMany({ where: { asaasId, reciboEm: null }, data: { reciboEm: new Date() } });
    if (!marcou.count) return;
    const usuarios = await this.prisma.usuario.findMany({ where: { consultoriaId, papel: 'CONSULTORIA' }, select: { nome: true, email: true }, orderBy: { createdAt: 'asc' } });
    if (!usuarios.length || usuarios.some((u) => ehAdminPlataforma(u.email))) return;
    const e = emailPlanoConfirmado({ nome: usuarios[0].nome, plano: planoPorCodigo(plano)?.nome ?? plano, valor, pagoAte, primeiro });
    await enviarEmail(usuarios.map((u) => u.email), `Safety Nexo: ${e.assunto.charAt(0).toLowerCase()}${e.assunto.slice(1)}`, e.html)
      .catch(async (erro) => {
        // Não saiu: tira a marca para tentar de novo no próximo aviso do Asaas.
        this.log.error(`recibo ${asaasId}: ${(erro as Error).message}`);
        await this.prisma.pagamentoPlano.updateMany({ where: { asaasId }, data: { reciboEm: null } });
      });
  }

  // Todo dia, para quem está no teste de 14 dias: e-mail 3 dias antes de acabar e outro no dia em que acabou.
  // Cada e-mail sai uma vez só (marca em avisosPlano) e o ADM recebe o aviso no celular junto.
  private async avisosDoTeste() {
    const agora = Date.now();
    const contas = await this.prisma.consultoria.findMany({
      // Teste que acaba nos próximos 4 dias ou que acabou nas últimas 48 horas (não manda para quem acabou faz tempo).
      where: { plano: 'FREE', bloqueada: false, testeAte: { gte: new Date(agora - 2 * DIA), lte: new Date(agora + 4 * DIA) } },
      include: { usuarios: { where: { papel: 'CONSULTORIA' }, select: { nome: true, email: true }, orderBy: { createdAt: 'asc' } } },
    });
    let enviados = 0; let falhas = 0;
    for (const c of contas) {
      if (!c.usuarios.length || c.usuarios.some((u) => ehAdminPlataforma(u.email))) continue;
      const fim = c.testeAte!;
      const dias = diasAteBrasilia(fim);
      const acabou = fim.getTime() <= agora;
      const tipo = acabou ? 'FIM' : dias >= 1 && dias <= 3 ? 'ANTES' : null;
      if (!tipo) continue;
      const marca = `teste:${iso(fim)}:${tipo}`;
      // Quem já recebeu o aviso de "acabou" não precisa mais do "vai acabar".
      if (c.avisosPlano.includes(marca) || (tipo === 'ANTES' && c.avisosPlano.includes(`teste:${iso(fim)}:FIM`))) continue;
      const e: EmailPronto = tipo === 'ANTES' ? emailTesteAcabando(c.usuarios[0].nome, fim, dias) : emailTesteAcabou(c.usuarios[0].nome, fim);
      try {
        await enviarEmail(c.usuarios.map((u) => u.email), e.assunto, e.html);
        await this.prisma.consultoria.update({ where: { id: c.id }, data: { avisosPlano: { push: marca } } });
        enviados++;
        this.push.avisarAdmins({
          titulo: tipo === 'ANTES' ? 'Teste acabando' : 'Teste terminou',
          corpo: tipo === 'ANTES'
            ? `O teste de ${c.nome} acaba em ${dataBrasilia(fim)}. Mandei o e-mail lembrando dos planos para ${c.usuarios[0].email}.`
            : `O teste de ${c.nome} terminou e a conta passou para o Grátis. Mandei o e-mail com os planos para ${c.usuarios[0].email}.`,
          url: '/admin', tag: `teste-${c.id}`,
        }, 'teste');
      } catch (erro) {
        falhas++;
        this.log.error(`aviso do teste ${c.id}: ${(erro as Error).message}`);
      }
    }
    return { enviados, falhas };
  }

  // Painel ADM: manda os e-mails do teste e do plano, como o cliente recebe, só para o e-mail de quem pediu.
  async exemplos(usuarioId: string) {
    if (!emailLigado()) throw new ServiceUnavailableException('Falta a chave RESEND_API_KEY no servidor para mandar e-mails.');
    const u = await this.prisma.usuario.findUnique({ where: { id: usuarioId }, select: { nome: true, email: true } });
    if (!u) throw new NotFoundException('Usuário não encontrado.');
    const daqui = (dias: number) => new Date(Date.now() + dias * DIA);
    const lista = [
      emailTesteAcabando(u.nome, daqui(3), 3),
      emailTesteAcabou(u.nome, daqui(0)),
      emailPlanoConfirmado({ nome: u.nome, plano: 'Profissional', valor: 197, pagoAte: daqui(30), primeiro: true }),
      emailPlanoConfirmado({ nome: u.nome, plano: 'Profissional', valor: 197, pagoAte: daqui(60), primeiro: false }),
    ];
    for (const e of lista) await enviarEmail([u.email], `[Exemplo] ${e.assunto}`, e.html);
    return { enviados: lista.length, para: u.email };
  }

  // Todo dia: e-mail antes de vencer (quem não paga no cartão), logo depois de vencer, na véspera e no dia de ficar só para consulta.
  async avisosDeVencimento() {
    if (!emailLigado()) throw new ServiceUnavailableException('Falta a chave RESEND_API_KEY no servidor para mandar e-mails.');
    const teste = await this.avisosDoTeste();
    const contas = await this.prisma.consultoria.findMany({
      where: { plano: { not: 'FREE' }, planoPagoAte: { not: null }, bloqueada: false },
      include: { usuarios: { where: { papel: 'CONSULTORIA' }, select: { nome: true, email: true } } },
    });
    let enviados = 0; let falhas = 0;
    for (const c of contas) {
      if (c.usuarios.some((u) => ehAdminPlataforma(u.email))) continue;
      const { diasVencido, consultaDesde } = situacaoPlano(c);
      // Cancelou a cobrança automática: ao acabar o período pago, a conta volta para o Grátis (nada é apagado).
      if (c.assinaturaStatus === 'CANCELADA' && diasVencido >= 1) {
        await this.prisma.consultoria.update({ where: { id: c.id }, data: { plano: 'FREE', limiteEmpresas: limiteDe('FREE'), planoDesde: null, planoPagoAte: null, avisosPlano: [] } });
        continue;
      }
      if (!c.usuarios.length) continue;
      const cartao = c.assinaturaForma === 'CARTAO' && c.assinaturaStatus === 'ATIVA';
      const tipo =
        diasVencido >= -3 && diasVencido <= -1 && !cartao ? 'ANTES3'
        : diasVencido >= 1 && diasVencido < TOLERANCIA_DIAS ? 'DEPOIS1'
        : diasVencido === TOLERANCIA_DIAS ? 'VESPERA'
        : diasVencido > TOLERANCIA_DIAS && diasVencido <= TOLERANCIA_DIAS + 3 ? 'CONSULTA'
        : null;
      if (!tipo) continue;
      const marca = `${iso(c.planoPagoAte!)}:${tipo}`;
      if (c.avisosPlano.includes(marca)) continue;
      const venc = dataBr(c.planoPagoAte!);
      const consulta = consultaDesde ? dataBr(consultaDesde) : '';
      const nomePlano = planoPorCodigo(c.plano)?.nome ?? c.plano;
      const textos: Record<string, [string, string]> = {
        ANTES3: [`Seu plano vence em ${venc}`, `O plano ${nomePlano} do Safety Nexo vence em <strong>${venc}</strong>. Para continuar usando sem parar, faça o pagamento em "Meu plano".`],
        DEPOIS1: [`Seu plano venceu em ${venc}`, `Não encontramos o pagamento do plano ${nomePlano}, que venceu em <strong>${venc}</strong>. Está tudo funcionando normalmente até <strong>${consulta}</strong>. Depois disso, a conta fica só para consulta até o pagamento. Se você já pagou, pode ignorar este e-mail.`],
        VESPERA: [`Amanhã sua conta fica só para consulta`, `O plano ${nomePlano} venceu em <strong>${venc}</strong> e ainda não encontramos o pagamento. A partir de amanhã você continua vendo e baixando tudo o que já fez, mas não consegue criar nem mudar nada até pagar. Nada é apagado.`],
        CONSULTA: [`Sua conta está só para consulta`, `Como o plano ${nomePlano} venceu em <strong>${venc}</strong>, a conta ficou só para consulta. Seus documentos e cadastros continuam todos lá. Assim que o pagamento cair, tudo volta a funcionar na hora.`],
      };
      const [assunto, texto] = textos[tipo];
      const html = emailMoldura(assunto, `<p>Olá, ${c.usuarios[0].nome.split(' ')[0]}.</p><p>${texto}</p><p><a href="${WEB()}/plano" style="display:inline-block;background:#0E4A5B;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Abrir Meu plano</a></p>`, 'Dúvidas? Responda este e-mail ou chame no WhatsApp pelo site.');
      try {
        await enviarEmail(c.usuarios.map((u) => u.email), `Safety Nexo: ${assunto.toLowerCase()}`, html);
        await this.prisma.consultoria.update({ where: { id: c.id }, data: { avisosPlano: { push: marca } } });
        enviados++;
        this.push.avisarAdmins({ titulo: 'Aviso de vencimento enviado', corpo: `${c.nome}: mandei o e-mail "${assunto}" para ${c.usuarios[0].email}.`, url: '/admin', tag: `vencimento-${c.id}` }, 'plano');
      } catch (e) {
        falhas++;
        this.log.error(`aviso de vencimento ${c.id}: ${(e as Error).message}`);
      }
    }
    return { enviados: enviados + teste.enviados, falhas: falhas + teste.falhas, teste };
  }
}

@Controller('meu-plano/pagamento')
export class PagamentoPlanoController {
  constructor(private readonly s: PagamentosService) {}
  @Get() resumo(@ConsultoriaId() c: string) { return this.s.resumo(c); }
  @Post('assinar') assinar(@ConsultoriaId() c: string, @Sessao() sessao: SessaoUsuario, @Body() dto: AssinarDto) {
    if (sessao.papel !== 'CONSULTORIA') throw new ForbiddenException('Só a consultoria pode mudar o plano.');
    return this.s.assinar(c, sessao, dto);
  }
  @Post('cancelar') cancelar(@ConsultoriaId() c: string) { return this.s.cancelar(c); }
}

// O Asaas avisa aqui cada mudança de pagamento. Configurar no Asaas: Integrações > Webhooks,
// endereço https://safety-nexo-api.onrender.com/pagamentos/asaas e o mesmo token de ASAAS_WEBHOOK_TOKEN.
@Publica()
@Controller('pagamentos')
export class AvisoAsaasController {
  constructor(private readonly s: PagamentosService) {}
  @Post('asaas') @HttpCode(200)
  aviso(@Headers('asaas-access-token') token: string | undefined, @Body() corpo: Record<string, any>) {
    conferirSegredo(token, process.env.ASAAS_WEBHOOK_TOKEN, 'Falta ASAAS_WEBHOOK_TOKEN no servidor.');
    return this.s.aviso(corpo);
  }
}

@SomenteAdmin()
@Controller('admin/emails-plano')
export class EmailsPlanoController {
  constructor(private readonly s: PagamentosService) {}
  @Post('exemplos') @HttpCode(200)
  exemplos(@Sessao() sessao: SessaoUsuario) { return this.s.exemplos(sessao.sub); }
}

// Chamado todo dia pelo agendador do GitHub (.github/workflows/regua-cobranca.yml).
@Publica()
@Controller('tarefas')
export class AvisosPlanoController {
  constructor(private readonly s: PagamentosService) {}
  @Post('avisos-plano') @HttpCode(200)
  enviar(@Headers('x-tarefa-segredo') segredo?: string) {
    conferirSegredo(segredo, process.env.TAREFAS_SEGREDO, 'Falta TAREFAS_SEGREDO no servidor.');
    return this.s.avisosDeVencimento();
  }
}

@Module({ controllers: [PagamentoPlanoController, AvisoAsaasController, AvisosPlanoController, EmailsPlanoController], providers: [PagamentosService] })
export class PagamentosModule {}
