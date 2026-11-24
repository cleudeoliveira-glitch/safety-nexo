import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Req } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { AuthService } from '../auth/auth.service';
import { emailLigado, enviarEmail, WEB } from '../common/email';
import { emailPlanoConfirmado } from '../pagamentos/emails-plano';
import { PrismaService } from '../prisma/prisma.service';
import { ehAdminPlataforma, SomenteAdmin } from './admin-plataforma';
import { ILIMITADO, PLANOS, planoPorCodigo } from './planos';
import { fimDoPeriodo, hojeMeioDia, meioDia, somarDias } from './vigencia';

class AtualizarConsultoriaDto {
  @IsOptional() @IsIn(PLANOS.map((p) => p.codigo)) plano?: string;
  @IsOptional() @IsInt() @Min(0) @Max(ILIMITADO) limiteEmpresas?: number;
  @IsOptional() @IsBoolean() bloqueada?: boolean;
  @IsOptional() @IsString() @MaxLength(500) motivoBloqueio?: string;
  @IsOptional() @IsString() @MaxLength(2000) observacaoAdm?: string;
  // Pagamento recebido: estende o vencimento em 1 mês (mensal) ou 12 meses (anual).
  @IsOptional() @IsIn([1, 12]) renovarMeses?: number;
  // Acerto manual do vencimento (AAAA-MM-DD). Vazio apaga a data.
  @IsOptional() @IsString() @Matches(/^(\d{4}-\d{2}-\d{2})?$/, { message: 'Data inválida.' }) pagoAte?: string;
}

type Contagem = { consultoriaId: string; total: bigint };
const mapa = (linhas: Contagem[]) => new Map(linhas.map((l) => [l.consultoriaId, Number(l.total)]));

// Painel ADM: o dono da plataforma vê todas as consultorias que contrataram o Safety Nexo.
@SomenteAdmin()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  // Link de cadastro para mandar a quem vai testar como cliente.
  @Get('convites')
  convites() {
    const link = `${WEB()}/cadastro`;
    return { link, whatsapp: `https://wa.me/?text=${encodeURIComponent(`Olá! Crie a sua conta no Safety Nexo, gestão inteligente de SST, por este link. São 14 dias com tudo liberado, sem cartão: ${link}`)}` };
  }

  // Senha esquecida sem e-mail funcionando: o ADM gera o link e manda por WhatsApp.
  @Post('usuarios/:id/link-senha')
  async linkSenha(@Param('id') id: string) {
    const u = await this.prisma.usuario.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('Usuário não encontrado.');
    const link = this.auth.linkSenha(u, 'convite');
    return { link, whatsapp: `https://wa.me/?text=${encodeURIComponent(`Olá, ${u.nome.split(' ')[0]}! Crie uma senha nova do Safety Nexo por este link (vale 7 dias): ${link}`)}` };
  }

  @Get('consultorias')
  async listar() {
    const [consultorias, colaboradores, documentos, arquivos, acessos] = await Promise.all([
      this.prisma.consultoria.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { empresas: true, usuarios: true } },
          usuarios: { where: { papel: 'CONSULTORIA' }, orderBy: { createdAt: 'asc' }, select: { nome: true, email: true } },
        },
      }),
      this.prisma.$queryRaw<Contagem[]>(Prisma.sql`
        SELECT e."consultoriaId", COUNT(c.id) AS total FROM "Colaborador" c JOIN "Empresa" e ON e.id = c."empresaId" GROUP BY 1`),
      this.prisma.$queryRaw<Contagem[]>(Prisma.sql`
        SELECT e."consultoriaId", COUNT(d.id) AS total FROM "Documento" d JOIN "Empresa" e ON e.id = d."empresaId" GROUP BY 1`),
      this.prisma.$queryRaw<Contagem[]>(Prisma.sql`
        SELECT e."consultoriaId", COUNT(a.id) AS total FROM "Arquivo" a JOIN "Empresa" e ON e.id = a."empresaId" GROUP BY 1`),
      this.prisma.usuario.groupBy({ by: ['consultoriaId'], _max: { ultimoAcesso: true } }),
    ]);
    const nColab = mapa(colaboradores);
    const nDoc = mapa(documentos);
    const nArq = mapa(arquivos);
    const ultimo = new Map(acessos.map((a) => [a.consultoriaId, a._max.ultimoAcesso]));

    const linhas = consultorias.map((c) => ({
      id: c.id,
      nome: c.nome,
      cnpj: c.cnpj,
      cidade: c.cidade,
      plano: c.plano,
      limiteEmpresas: c.limiteEmpresas,
      bloqueada: c.bloqueada,
      motivoBloqueio: c.motivoBloqueio,
      observacaoAdm: c.observacaoAdm,
      pedidoPlano: c.pedidoPlano,
      pedidoPlanoEm: c.pedidoPlanoEm,
      planoDesde: c.planoDesde,
      planoPagoAte: c.planoPagoAte,
      // Cobrança automática (Asaas): forma, situação e se o Pix Automático foi autorizado.
      assinatura: c.asaasAssinaturaId && c.assinaturaStatus !== 'CANCELADA' ? { forma: c.assinaturaForma, status: c.assinaturaStatus, plano: c.assinaturaPlano, pixAutomatico: c.pixAutomatico } : null,
      // Consultoria do dono da plataforma: acesso total, não paga plano e não entra na receita.
      dono: c.usuarios.some((u) => ehAdminPlataforma(u.email)),
      criadaEm: c.createdAt,
      responsavel: c.usuarios[0] ?? null,
      empresas: c._count.empresas,
      usuarios: c._count.usuarios,
      colaboradores: nColab.get(c.id) ?? 0,
      documentos: (nDoc.get(c.id) ?? 0) + (nArq.get(c.id) ?? 0),
      ultimoAcesso: ultimo.get(c.id) ?? null,
    }));

    const inicioMes = new Date();
    inicioMes.setUTCDate(1);
    inicioMes.setUTCHours(0, 0, 0, 0);
    const trintaDias = Date.now() - 30 * 24 * 3600 * 1000;
    const ativas = linhas.filter((l) => !l.bloqueada);
    const cobradas = ativas.filter((l) => !l.dono);
    return {
      planos: PLANOS,
      totais: {
        consultorias: linhas.length,
        ativas: ativas.length,
        bloqueadas: linhas.length - ativas.length,
        novasNoMes: linhas.filter((l) => l.criadaEm >= inicioMes).length,
        usaramEm30Dias: linhas.filter((l) => l.ultimoAcesso && l.ultimoAcesso.getTime() >= trintaDias).length,
        pagantes: cobradas.filter((l) => (planoPorCodigo(l.plano)?.precoMensal ?? 0) > 0).length,
        receitaMensal: cobradas.reduce((t, l) => t + (planoPorCodigo(l.plano)?.precoMensal ?? 0), 0),
        porPlano: PLANOS.map((p) => ({ codigo: p.codigo, nome: p.nome, total: ativas.filter((l) => l.plano === p.codigo).length })),
      },
      consultorias: linhas,
    };
  }

  @Get('consultorias/:id')
  async detalhe(@Param('id') id: string) {
    const c = await this.prisma.consultoria.findUnique({
      where: { id },
      include: {
        usuarios: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, nome: true, email: true, papel: true, createdAt: true, ultimoAcesso: true, empresa: { select: { razaoSocial: true } } },
        },
        empresas: {
          orderBy: { razaoSocial: 'asc' },
          select: { id: true, razaoSocial: true, cnpj: true, createdAt: true, _count: { select: { colaboradores: true, documentos: true, arquivos: true } } },
        },
      },
    });
    if (!c) throw new NotFoundException('Consultoria não encontrada.');
    return c;
  }

  @Patch('consultorias/:id')
  async atualizar(@Param('id') id: string, @Body() dto: AtualizarConsultoriaDto, @Req() req: { sessao: { consultoriaId: string } }) {
    const atual = await this.prisma.consultoria.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException('Consultoria não encontrada.');
    if (dto.bloqueada && id === req.sessao.consultoriaId) {
      throw new ForbiddenException('Você não pode bloquear a sua própria consultoria.');
    }
    const dados: Prisma.ConsultoriaUpdateInput = {};
    if (dto.plano !== undefined) {
      const plano = planoPorCodigo(dto.plano);
      if (!plano) throw new BadRequestException('Plano desconhecido.');
      dados.plano = plano.codigo;
      dados.limiteEmpresas = plano.limiteEmpresas ?? ILIMITADO;
      // Plano trocado: o pedido feito em "Meu plano" foi atendido.
      dados.pedidoPlano = null;
      dados.pedidoPlanoEm = null;
      if (plano.precoMensal === 0) {
        // Voltou para o Grátis: não há vigência paga.
        dados.planoDesde = null;
        dados.planoPagoAte = null;
      } else if (!atual.planoPagoAte || atual.plano === 'FREE') {
        // Primeiro plano pago: o primeiro mês começa hoje.
        const hoje = hojeMeioDia();
        dados.planoDesde = hoje;
        dados.planoPagoAte = fimDoPeriodo(hoje, 1);
      }
      // Troca entre planos pagos mantém as datas que já estavam pagas.
    }
    if (dto.renovarMeses) {
      const hoje = hojeMeioDia();
      const pagoAte = atual.planoPagoAte ? meioDia(atual.planoPagoAte) : null;
      // Renovação em dia continua do vencimento; atrasada recomeça hoje.
      const emDia = !!pagoAte && !!atual.planoDesde && pagoAte >= somarDias(hoje, -1);
      if (emDia) {
        // Conta os meses a partir do início, para o vencimento cair sempre no mesmo dia do mês.
        const desde = meioDia(atual.planoDesde!);
        let meses = 1;
        while (fimDoPeriodo(desde, meses) < pagoAte! && meses < 600) meses++;
        dados.planoPagoAte = fimDoPeriodo(desde, meses + dto.renovarMeses);
      } else {
        dados.planoDesde = hoje;
        dados.planoPagoAte = fimDoPeriodo(hoje, dto.renovarMeses);
      }
    }
    if (dto.pagoAte !== undefined) {
      dados.planoPagoAte = dto.pagoAte ? meioDia(`${dto.pagoAte}T12:00:00Z`) : null;
      if (dto.pagoAte && !atual.planoDesde) dados.planoDesde = hojeMeioDia();
    }
    if (dto.limiteEmpresas !== undefined) dados.limiteEmpresas = dto.limiteEmpresas;
    if (dto.bloqueada !== undefined) {
      dados.bloqueada = dto.bloqueada;
      dados.bloqueadaEm = dto.bloqueada ? new Date() : null;
      dados.motivoBloqueio = dto.bloqueada ? (dto.motivoBloqueio?.trim() || null) : null;
    }
    if (dto.observacaoAdm !== undefined) dados.observacaoAdm = dto.observacaoAdm.trim() || null;
    const salva = await this.prisma.consultoria.update({ where: { id }, data: dados });
    // Plano pago liberado à mão por quem saiu do Grátis: o cliente recebe o e-mail avisando que já pode usar.
    const novo = dto.plano ? planoPorCodigo(dto.plano) : null;
    if (novo && novo.precoMensal > 0 && atual.plano === 'FREE' && emailLigado()) {
      const usuarios = await this.prisma.usuario.findMany({ where: { consultoriaId: id, papel: 'CONSULTORIA' }, select: { nome: true, email: true }, orderBy: { createdAt: 'asc' } });
      if (usuarios.length && !usuarios.some((u) => ehAdminPlataforma(u.email))) {
        const e = emailPlanoConfirmado({ nome: usuarios[0].nome, plano: novo.nome, valor: null, pagoAte: salva.planoPagoAte, primeiro: true });
        await enviarEmail(usuarios.map((u) => u.email), `Safety Nexo: ${e.assunto.charAt(0).toLowerCase()}${e.assunto.slice(1)}`, e.html).catch(() => undefined);
      }
    }
    return salva;
  }
}
