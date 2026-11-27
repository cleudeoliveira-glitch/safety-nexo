import {
  BadRequestException, CallHandler, Controller, Delete, ExecutionContext, Get, Injectable, Logger, Module,
  NestInterceptor, NotFoundException, Param, Post,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Observable, from, mergeMap } from 'rxjs';
import { SoDono } from '../auth/so-dono.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { ArquivoGuardado, caixaPlano } from '../common/plano';
import { Guarda } from '../common/guarda';
import { PrismaService } from '../prisma/prisma.service';
import { Arvore, contar, devolver, nomeDoTipo, rotulo } from './arvore';

// Lixeira de 30 dias: tudo o que o usuário exclui fica guardado aqui e pode voltar. Depois de 30 dias sai de vez.
// O botão "Excluir" continua em tudo (regra do Rodrigo); a Lixeira só dá uma chance de desfazer.
// NR-01 (1.5.7.3.3) pede guardar o histórico do inventário por 20 anos e a NR-07 pede guardar o prontuário
// por 20 anos depois do desligamento: a Lixeira evita perder isso por um clique errado.
export const DIAS_LIXEIRA = 30;
const DIA = 86_400_000;
const log = new Logger('Lixeira');

async function apagarArquivos(arquivos: ArquivoGuardado[]) {
  for (const a of arquivos) await new Guarda(a.prefixo, a.pastaLocal).apagarDeVez(a.caminho).catch(() => undefined);
}

// Depois de uma exclusão que deu certo, grava o que saiu como um item da Lixeira.
@Injectable()
export class LixeiraInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    const caixa = caixaPlano.getStore()?.lixeira;
    if (req.method !== 'DELETE' || !caixa || !req.sessao?.consultoriaId) return next.handle();
    return next.handle().pipe(mergeMap((resposta) => from(this.guardar(req, caixa.arvores as Arvore[], caixa.arquivos).then(() => resposta, (e) => {
      log.warn(`não gravou o item da Lixeira: ${(e as Error).message}`);
      return resposta;
    }))));
  }

  private async guardar(req: { sessao: { sub: string; consultoriaId: string }; params?: Record<string, string> }, arvores: Arvore[], arquivos: ArquivoGuardado[]) {
    if (!arvores.length) { await apagarArquivos(arquivos); return; } // nada guardado: o arquivo sai na hora, como antes
    // O último apagado é o item principal (antes dele saem as partes, como as listas de presença).
    const principal = arvores[arvores.length - 1];
    const acao = nomeDoTipo(principal.m);
    const nome = rotulo(principal);
    const usuario = await this.prisma.usuario.findUnique({ where: { id: req.sessao.sub }, select: { nome: true } });
    await this.prisma.lixeira.create({
      data: {
        consultoriaId: req.sessao.consultoriaId, empresaId: req.params?.empresaId ?? req.params?.e ?? null,
        descricao: nome ? `${acao}: ${nome}` : acao, quem: usuario?.nome ?? '—', itens: contar(arvores),
        dados: arvores as unknown as Prisma.InputJsonValue, arquivos: arquivos as unknown as Prisma.InputJsonValue,
      },
    });
    await esvaziarAntigos(this.prisma);
  }
}

// O que passou de 30 dias sai de vez (com os arquivos). Roda a cada exclusão e a cada vez que a Lixeira abre.
export async function esvaziarAntigos(prisma: PrismaService) {
  const velhos = await prisma.lixeira.findMany({ where: { criadoEm: { lt: new Date(Date.now() - DIAS_LIXEIRA * DIA) } }, select: { id: true, arquivos: true } });
  for (const v of velhos) {
    await apagarArquivos(v.arquivos as unknown as ArquivoGuardado[]);
    await prisma.lixeira.delete({ where: { id: v.id } }).catch(() => undefined);
  }
}

// Só a consultoria (sem @PermiteEmpresa): o login da empresa cliente não apaga nem restaura.
@Controller('lixeira')
export class LixeiraController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listar(@ConsultoriaId() c: string) {
    await esvaziarAntigos(this.prisma);
    const itens = await this.prisma.lixeira.findMany({
      where: { consultoriaId: c }, orderBy: { criadoEm: 'desc' }, take: 300,
      select: { id: true, empresaId: true, descricao: true, quem: true, itens: true, criadoEm: true },
    });
    const ids = [...new Set(itens.map((i) => i.empresaId).filter(Boolean))] as string[];
    const empresas = new Map((await this.prisma.empresa.findMany({ where: { id: { in: ids }, consultoriaId: c }, select: { id: true, razaoSocial: true } })).map((e) => [e.id, e.razaoSocial]));
    return itens.map((i) => ({ ...i, empresa: i.empresaId ? empresas.get(i.empresaId) ?? null : null, saiDeVezEm: new Date(i.criadoEm.getTime() + DIAS_LIXEIRA * DIA) }));
  }

  @Post(':id/restaurar')
  async restaurar(@ConsultoriaId() c: string, @Param('id') id: string) {
    const item = await this.prisma.lixeira.findFirst({ where: { id, consultoriaId: c } });
    if (!item) throw new NotFoundException('Item não encontrado na Lixeira.');
    if (item.empresaId && !(await this.prisma.empresa.findFirst({ where: { id: item.empresaId, consultoriaId: c }, select: { id: true } }))) {
      throw new BadRequestException('A empresa deste item foi excluída, então ele não pode voltar.');
    }
    const arvores = item.dados as unknown as Arvore[];
    try {
      // Volta na ordem contrária à da exclusão: quem foi apagado por último (o "pai") volta primeiro.
      await this.prisma.$transaction(async (tx) => { for (const a of [...arvores].reverse()) await devolver(tx, a); }, { timeout: 30_000 });
    } catch (e) {
      const codigo = (e as { code?: string }).code;
      if (codigo === 'P2003') throw new BadRequestException('Não deu para restaurar: algo ligado a este item também foi excluído. Restaure esse outro item primeiro (ele está mais abaixo na Lixeira).');
      if (codigo === 'P2002') throw new BadRequestException('Não deu para restaurar: já existe outro registro com o mesmo número ou código.');
      throw e;
    }
    await this.prisma.lixeira.delete({ where: { id } });
    return { ok: true, descricao: item.descricao };
  }

  @SoDono()
  @Delete(':id')
  async apagarDeVez(@ConsultoriaId() c: string, @Param('id') id: string) {
    const item = await this.prisma.lixeira.findFirst({ where: { id, consultoriaId: c }, select: { id: true, arquivos: true } });
    if (!item) throw new NotFoundException('Item não encontrado na Lixeira.');
    await apagarArquivos(item.arquivos as unknown as ArquivoGuardado[]);
    await this.prisma.lixeira.delete({ where: { id } });
    return { ok: true };
  }
}

@Module({ controllers: [LixeiraController], providers: [{ provide: APP_INTERCEPTOR, useClass: LixeiraInterceptor }] })
export class LixeiraModule {}
