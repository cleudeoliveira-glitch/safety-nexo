import { SoDono } from '../auth/so-dono.decorator';
import { BadRequestException, Body, Controller, Get, NotFoundException, Post, Put } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsIn, IsString } from 'class-validator';
import { empresasAtivas, proximaTroca } from '../common/empresas-ativas';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { Sessao, SessaoUsuario } from '../common/sessao.decorator';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push';
import { ehAdminPlataforma } from './admin-plataforma';
import { ILIMITADO, PLANOS, planoPorCodigo } from './planos';

class PedidoPlanoDto {
  @IsIn(PLANOS.map((p) => p.codigo)) plano!: string;
}

class EmpresasAtivasDto {
  @IsArray() @ArrayMaxSize(1000) @IsString({ each: true }) ids!: string[];
}

const dataBr = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });

// "Meu plano": a consultoria vê o plano dela, quantas empresas já usa e pede a troca.
// Com a cobrança automática ligada (ASAAS_API_KEY), o pagamento é feito em pagamentos/; sem ela, a troca é feita pelo ADM.
@Controller('meu-plano')
export class MeuPlanoController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  @Get()
  async ver(@ConsultoriaId() consultoriaId: string, @Sessao() sessao?: SessaoUsuario) {
    const c = await this.prisma.consultoria.findUnique({
      where: { id: consultoriaId },
      include: { _count: { select: { empresas: true } }, usuarios: { select: { email: true } } },
    });
    if (!c) throw new NotFoundException('Consultoria não encontrada.');
    // A consultoria do dono da plataforma usa tudo, sem plano e sem limite (mesma regra de empresas.service.ts).
    const acessoTotal = c.usuarios.some((u) => ehAdminPlataforma(u.email));
    // Mais empresas do que o plano permite: quais ficam ativas e quando dá para trocar a escolha.
    const ativas = acessoTotal ? null : await empresasAtivas(this.prisma, c);
    return {
      ativas: ativas ? { acima: true, ids: [...ativas], escolhidas: c.empresasAtivas.length > 0, proximaTroca: proximaTroca(c.empresasAtivasEm) } : { acima: false, ids: [], escolhidas: false, proximaTroca: null },
      plano: c.plano,
      nomePlano: planoPorCodigo(c.plano)?.nome ?? c.plano,
      limiteEmpresas: acessoTotal || c.limiteEmpresas >= ILIMITADO ? null : c.limiteEmpresas,
      empresas: c._count.empresas,
      acessoTotal,
      pedidoPlano: c.pedidoPlano,
      pedidoPlanoEm: c.pedidoPlanoEm,
      // Vigência do plano pago (de quando começou e até quando está pago) e a data do cadastro (início do teste).
      planoDesde: c.planoDesde,
      planoPagoAte: c.planoPagoAte,
      criadaEm: c.createdAt,
      // O que o plano libera agora (o teste de 14 dias libera o Profissional).
      emTeste: sessao?.plano?.emTeste ?? false,
      testeAte: sessao?.plano?.testeAte ?? null,
      recursos: sessao?.plano?.recursos ?? [],
      limites: sessao?.plano?.limites ?? null,
      situacao: sessao?.plano?.situacao ?? 'EM_DIA',
      consultaDesde: sessao?.plano?.consultaDesde ?? null,
    };
  }

  // O que o plano libera, para o site mostrar o cadeado (vale também para o login da empresa cliente).
  @PermiteEmpresa()
  @Get('recursos')
  async recursos(@Sessao() s: SessaoUsuario) {
    const c = s.plano?.dono ? null : await this.prisma.consultoria.findUnique({ where: { id: s.consultoriaId }, select: { id: true, limiteEmpresas: true, empresasAtivas: true } });
    const ativas = c ? await empresasAtivas(this.prisma, c) : null;
    const foraDoPlano = ativas
      ? (await this.prisma.empresa.findMany({ where: { consultoriaId: s.consultoriaId, ...(s.empresaId ? { id: s.empresaId } : {}) }, select: { id: true } })).map((e) => e.id).filter((id) => !ativas.has(id))
      : [];
    return {
      foraDoPlano,
      codigo: s.plano?.codigo ?? 'FREE', nome: s.plano?.nome ?? 'Grátis', emTeste: s.plano?.emTeste ?? false, testeAte: s.plano?.testeAte ?? null, recursos: s.plano?.recursos ?? [], limites: s.plano?.limites ?? null,
      // Pagamento em dia, na tolerância (aviso) ou só para consulta (o site mostra a faixa no alto).
      situacao: s.plano?.situacao ?? 'EM_DIA', pagoAte: s.plano?.pagoAte ?? null, consultaDesde: s.plano?.consultaDesde ?? null,
    };
  }

  // O dono escolhe as empresas que ficam ativas (até o limite do plano). Pode trocar uma vez a cada 30 dias.
  @SoDono()
  @Put('empresas-ativas')
  async escolherAtivas(@ConsultoriaId() consultoriaId: string, @Body() dto: EmpresasAtivasDto, @Sessao() sessao: SessaoUsuario) {
    const c = await this.prisma.consultoria.findUnique({ where: { id: consultoriaId }, select: { limiteEmpresas: true, empresasAtivasEm: true, empresasAtivas: true } });
    if (!c) throw new NotFoundException('Consultoria não encontrada.');
    const ids = [...new Set(dto.ids)];
    if (!ids.length) throw new BadRequestException('Escolha pelo menos uma empresa.');
    if (ids.length > c.limiteEmpresas) throw new BadRequestException(`Seu plano permite ${c.limiteEmpresas} empresa${c.limiteEmpresas === 1 ? '' : 's'} ativa${c.limiteEmpresas === 1 ? '' : 's'}. Desmarque ${ids.length - c.limiteEmpresas}.`);
    const daConta = await this.prisma.empresa.count({ where: { consultoriaId, id: { in: ids } } });
    if (daConta !== ids.length) throw new BadRequestException('Alguma empresa escolhida não é desta conta. Recarregue a página e tente de novo.');
    const libera = c.empresasAtivas.length ? proximaTroca(c.empresasAtivasEm) : null;
    if (libera) throw new BadRequestException(`A escolha das empresas ativas pode ser trocada uma vez por mês. A próxima troca fica liberada em ${dataBr(libera)}.`);
    await this.prisma.consultoria.update({ where: { id: consultoriaId }, data: { empresasAtivas: ids, empresasAtivasEm: new Date() } });
    return this.ver(consultoriaId, sessao);
  }

  @SoDono()
  @Post('pedido')
  async pedir(@ConsultoriaId() consultoriaId: string, @Body() dto: PedidoPlanoDto, @Sessao() sessao: SessaoUsuario) {
    const c = await this.prisma.consultoria.update({ where: { id: consultoriaId }, data: { pedidoPlano: dto.plano, pedidoPlanoEm: new Date() } });
    const plano = planoPorCodigo(dto.plano);
    const preco = plano?.precoMensal ? ` (R$ ${plano.precoMensal}/mês)` : '';
    this.push.avisarAdmins({ titulo: 'Novo pedido de plano', corpo: `${c.nome} pediu o plano ${plano?.nome ?? dto.plano}${preco}. Confira no Painel ADM.`, url: '/admin', tag: `plano-${consultoriaId}` }, 'plano');
    return this.ver(consultoriaId, sessao);
  }
}
