import { BadRequestException, Controller, Delete, Get, Injectable, Module, NotFoundException, Param } from '@nestjs/common';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { empresaDaConsultoria } from '../common/exclusao';
import { PrismaService } from '../prisma/prisma.service';

// Exclusões que faltavam: colaborador, exame do GHE, emissão de documento (versão do PGR, PCMSO...) e item do almoxarifado.
// Rotas só da consultoria (sem @PermiteEmpresa): o login da empresa cliente não apaga nada.

const TIPO_DOC: Record<string, string> = {
  PGR: 'PGR', PCMSO: 'PCMSO', LTCAT: 'LTCAT', LIP: 'Laudo de insalubridade e periculosidade', LPP: 'Laudo de periculosidade', PGRTR: 'PGRTR', PCA: 'PCA', PPR: 'PPR',
};

@Injectable()
export class ExclusoesService {
  constructor(private readonly prisma: PrismaService) {}

  private async colaborador(c: string, e: string, id: string) {
    await empresaDaConsultoria(this.prisma, c, e);
    const col = await this.prisma.colaborador.findFirst({
      where: { id, empresaId: e },
      select: {
        id: true, nome: true, dataDesligamento: true,
        asos: { select: { id: true } }, cats: { select: { id: true } }, afastamentos: { select: { id: true } }, toxicologicos: { select: { id: true } },
        _count: { select: { asos: true, entregasEpi: true, treinamentos: true, cats: true, afastamentos: true, atestados: true, registrosSaude: true, cipa: true, toxicologicos: true, assinaturasPresenca: true } },
      },
    });
    if (!col) throw new NotFoundException('Colaborador não encontrado');
    return col;
  }

  // O que sai junto, para a tela mostrar antes de confirmar.
  async oQueSaiColaborador(c: string, e: string, id: string) {
    const col = await this.colaborador(c, e, id);
    const n = col._count;
    const itens = [
      [n.asos, 'ASO', 'ASOs'], [n.entregasEpi, 'entrega de EPI', 'entregas de EPI'], [n.treinamentos, 'participação em treinamento', 'participações em treinamento'],
      [n.cats, 'CAT', 'CATs'], [n.afastamentos, 'afastamento', 'afastamentos'], [n.atestados, 'atestado', 'atestados'],
      [n.registrosSaude, 'registro do prontuário (vacina ou exame)', 'registros do prontuário (vacinas e exames)'], [n.toxicologicos, 'exame toxicológico', 'exames toxicológicos'],
      [n.cipa, 'cargo na CIPA', 'cargos na CIPA'], [n.assinaturasPresenca, 'assinatura em lista de presença', 'assinaturas em listas de presença'],
    ].filter(([q]) => (q as number) > 0).map(([q, um, varios]) => `${q} ${q === 1 ? um : varios}`);
    const noEsocial = await this.noEsocial(e, col);
    return { nome: col.nome, saiu: !!col.dataDesligamento, itens, noEsocial };
  }

  private async noEsocial(e: string, col: { id: string; asos: { id: string }[]; cats: { id: string }[]; afastamentos: { id: string }[]; toxicologicos: { id: string }[] }) {
    const refs = [col.id, ...col.asos.map((x) => x.id), ...col.cats.map((x) => x.id), ...col.afastamentos.flatMap((x) => [x.id, `${x.id}:fim`]), ...col.toxicologicos.map((x) => x.id)];
    return this.prisma.eventoEsocial.count({ where: { empresaId: e, referenciaId: { in: refs }, status: { in: ['ENVIADO', 'PROCESSADO'] } } });
  }

  async excluirColaborador(c: string, e: string, id: string) {
    const col = await this.colaborador(c, e, id);
    if (await this.noEsocial(e, col)) {
      throw new BadRequestException(`${col.nome} tem evento já enviado ao eSocial. Para não deixar o governo com informação que sumiu daqui, use "Registrar saída" em vez de excluir (o histórico fica guardado, como pede a NR-07).`);
    }
    await this.prisma.colaborador.delete({ where: { id } });
    return { ok: true, nome: col.nome };
  }

  async excluirExame(c: string, e: string, gheId: string, exameId: string) {
    await empresaDaConsultoria(this.prisma, c, e);
    const { count } = await this.prisma.exameGhe.deleteMany({ where: { id: exameId, gheId, ghe: { empresaId: e } } });
    if (!count) throw new NotFoundException('Exame não encontrado');
    return { ok: true };
  }

  // Emissões dos programas e laudos: cada vez que um PDF é autorizado vira uma versão no histórico de revisões.
  async emissoes(c: string, e: string) {
    await empresaDaConsultoria(this.prisma, c, e);
    const lista = await this.prisma.documento.findMany({ where: { empresaId: e }, orderBy: [{ tipo: 'asc' }, { versao: 'desc' }], select: { id: true, tipo: true, versao: true, geradoEm: true, vencimento: true, mudancas: true } });
    return lista.map((d) => ({ ...d, nome: TIPO_DOC[d.tipo] ?? d.tipo }));
  }

  async excluirEmissao(c: string, e: string, id: string) {
    await empresaDaConsultoria(this.prisma, c, e);
    const { count } = await this.prisma.documento.deleteMany({ where: { id, empresaId: e } });
    if (!count) throw new NotFoundException('Emissão não encontrada');
    return { ok: true };
  }

  // Item do almoxarifado: sai com as entradas e saídas dele. As entregas já feitas continuam na ficha de cada pessoa.
  async excluirItemEstoque(c: string, e: string, id: string) {
    await empresaDaConsultoria(this.prisma, c, e);
    const { count } = await this.prisma.estoqueEpi.deleteMany({ where: { id, empresaId: e } });
    if (!count) throw new NotFoundException('Item não encontrado');
    return { ok: true };
  }
}

@Controller('empresas/:empresaId')
export class ExclusoesController {
  constructor(private readonly x: ExclusoesService) {}
  @Get('colaboradores/:id/exclusao') oQueSai(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.x.oQueSaiColaborador(c, e, id); }
  @Delete('colaboradores/:id') colaborador(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.x.excluirColaborador(c, e, id); }
  @Delete('ghes/:gheId/exames/:exameId') exame(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('gheId') g: string, @Param('exameId') x: string) { return this.x.excluirExame(c, e, g, x); }
  @Get('emissoes') emissoes(@ConsultoriaId() c: string, @Param('empresaId') e: string) { return this.x.emissoes(c, e); }
  @Delete('emissoes/:id') emissao(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.x.excluirEmissao(c, e, id); }
  @Delete('estoque-epi/:id') estoque(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.x.excluirItemEstoque(c, e, id); }
}

@Module({ controllers: [ExclusoesController], providers: [ExclusoesService] })
export class ExclusoesModule {}
