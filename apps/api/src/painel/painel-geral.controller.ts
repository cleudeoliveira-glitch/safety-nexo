import { Controller, Get } from '@nestjs/common';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PainelService } from './painel.service';

// Visão da consultoria: todas as empresas numa tela, da que mais precisa de atenção para a que menos precisa.
@Controller('painel-geral')
export class PainelGeralController {
  constructor(
    private readonly painel: PainelService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async montar(@ConsultoriaId() consultoriaId: string) {
    const empresas = await this.prisma.empresa.findMany({ where: { consultoriaId }, select: { id: true }, orderBy: { razaoSocial: 'asc' } });
    const paineis = await Promise.all(empresas.map((e) => this.painel.montar(consultoriaId, e.id)));
    const linhas = paineis
      .map((p) => ({
        empresa: p.empresa,
        percentual: p.percentual,
        vencidos: p.pendencias.filter((x) => x.nivel === 'vencido').length,
        pendentes: p.pendencias.filter((x) => x.nivel === 'pendente').length,
        principal: p.pendencias[0] ?? null,
        proximoVencimento: p.vencimentos.find((v) => v.dias >= 0) ?? null,
      }))
      .sort((a, b) => b.vencidos - a.vencidos || a.percentual - b.percentual);
    const media = linhas.length ? Math.round(linhas.reduce((t, l) => t + l.percentual, 0) / linhas.length) : 0;
    return {
      totais: {
        empresas: linhas.length,
        saudeMedia: media,
        comVencidos: linhas.filter((l) => l.vencidos > 0).length,
        vencidos: linhas.reduce((t, l) => t + l.vencidos, 0),
        pendentes: linhas.reduce((t, l) => t + l.pendentes, 0),
      },
      empresas: linhas,
    };
  }
}
