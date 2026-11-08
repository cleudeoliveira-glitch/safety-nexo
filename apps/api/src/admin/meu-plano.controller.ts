import { Body, Controller, Get, NotFoundException, Post } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { Sessao, SessaoUsuario } from '../common/sessao.decorator';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ehAdminPlataforma } from './admin-plataforma';
import { ILIMITADO, PLANOS, planoPorCodigo } from './planos';

class PedidoPlanoDto {
  @IsIn(PLANOS.map((p) => p.codigo)) plano!: string;
}

// "Meu plano": a consultoria vê o plano dela, quantas empresas já usa e pede a troca.
// A troca é feita pelo dono da plataforma no painel ADM (não há cobrança automática do SaaS).
@Controller('meu-plano')
export class MeuPlanoController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async ver(@ConsultoriaId() consultoriaId: string, @Sessao() sessao?: SessaoUsuario) {
    const c = await this.prisma.consultoria.findUnique({
      where: { id: consultoriaId },
      include: { _count: { select: { empresas: true } }, usuarios: { select: { email: true } } },
    });
    if (!c) throw new NotFoundException('Consultoria não encontrada.');
    // A consultoria do dono da plataforma usa tudo, sem plano e sem limite (mesma regra de empresas.service.ts).
    const acessoTotal = c.usuarios.some((u) => ehAdminPlataforma(u.email));
    return {
      plano: c.plano,
      nomePlano: planoPorCodigo(c.plano)?.nome ?? c.plano,
      limiteEmpresas: acessoTotal || c.limiteEmpresas >= ILIMITADO ? null : c.limiteEmpresas,
      empresas: c._count.empresas,
      acessoTotal,
      pedidoPlano: c.pedidoPlano,
      pedidoPlanoEm: c.pedidoPlanoEm,
      // O que o plano libera agora (o teste de 14 dias libera o Profissional).
      emTeste: sessao?.plano?.emTeste ?? false,
      testeAte: sessao?.plano?.testeAte ?? null,
      recursos: sessao?.plano?.recursos ?? [],
      limites: sessao?.plano?.limites ?? null,
    };
  }

  // O que o plano libera, para o site mostrar o cadeado (vale também para o login da empresa cliente).
  @PermiteEmpresa()
  @Get('recursos')
  recursos(@Sessao() s: SessaoUsuario) {
    return { codigo: s.plano?.codigo ?? 'FREE', nome: s.plano?.nome ?? 'Grátis', emTeste: s.plano?.emTeste ?? false, testeAte: s.plano?.testeAte ?? null, recursos: s.plano?.recursos ?? [], limites: s.plano?.limites ?? null };
  }

  @Post('pedido')
  async pedir(@ConsultoriaId() consultoriaId: string, @Body() dto: PedidoPlanoDto, @Sessao() sessao: SessaoUsuario) {
    await this.prisma.consultoria.update({ where: { id: consultoriaId }, data: { pedidoPlano: dto.plano, pedidoPlanoEm: new Date() } });
    return this.ver(consultoriaId, sessao);
  }
}
