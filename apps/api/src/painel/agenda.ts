import { BadRequestException, Controller, Get, Injectable, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PainelService } from './painel.service';

// Calendário do mês e planilha de pendências: tudo o que tem data, de todas as empresas da consultoria.
// rota segue o botão Resolver do painel ("/x" dentro da empresa, "@/x" tela fora da empresa).
export type ItemAgenda = { data: string; tipo: 'Documento' | 'ASO' | 'Ação do plano' | 'Treinamento'; titulo: string; empresaId: string; empresa: string; rota: string };

const DIA = 86_400_000;
const dia = (d: Date) => d.toISOString().slice(0, 10);
const somarMeses = (d: Date, m: number) => { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + m); return x; };

@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService, private readonly painel: PainelService) {}

  async itens(consultoriaId: string, de: Date, ate: Date): Promise<ItemAgenda[]> {
    const daConsultoria = { empresa: { consultoriaId } };
    const [docs, colaboradores, acoes, turmas] = await Promise.all([
      this.prisma.documento.findMany({ where: { ...daConsultoria, vencimento: { not: null } }, select: { empresaId: true, tipo: true, versao: true, vencimento: true, empresa: { select: { razaoSocial: true } } }, orderBy: { versao: 'desc' } }),
      this.prisma.colaborador.findMany({
        where: { ...daConsultoria, dataDesligamento: null },
        select: { nome: true, empresaId: true, empresa: { select: { razaoSocial: true } }, asos: { select: { proximoExame: true }, orderBy: { dataExame: 'desc' }, take: 1 } },
      }),
      this.prisma.acaoCorretiva.findMany({ where: { ...daConsultoria, status: { not: 'FEITA' }, prazo: { gte: de, lte: ate } }, select: { empresaId: true, descricao: true, prazo: true, responsavel: true, empresa: { select: { razaoSocial: true } } } }),
      this.prisma.turma.findMany({ where: { ...daConsultoria, validadeMeses: { not: null } }, select: { empresaId: true, nome: true, norma: true, fim: true, validadeMeses: true, empresa: { select: { razaoSocial: true } } }, orderBy: { fim: 'desc' } }),
    ]);
    const dentro = (d: Date | null | undefined): d is Date => !!d && d >= de && d <= ate;
    const itens: ItemAgenda[] = [];
    // Documento: só a última versão de cada tipo vale.
    const vistos = new Set<string>();
    for (const d of docs) {
      const chave = `${d.empresaId}|${d.tipo}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      if (dentro(d.vencimento)) itens.push({ data: dia(d.vencimento), tipo: 'Documento', titulo: `${d.tipo} vence (versão ${d.versao})`, empresaId: d.empresaId, empresa: d.empresa.razaoSocial, rota: '@/emitir' });
    }
    for (const c of colaboradores) {
      const p = c.asos[0]?.proximoExame;
      if (dentro(p)) itens.push({ data: dia(p), tipo: 'ASO', titulo: `Exame de ${c.nome}`, empresaId: c.empresaId, empresa: c.empresa.razaoSocial, rota: '/colaboradores' });
    }
    for (const a of acoes) {
      itens.push({ data: dia(a.prazo!), tipo: 'Ação do plano', titulo: `${a.descricao.slice(0, 90)}${a.responsavel ? ` (${a.responsavel})` : ''}`, empresaId: a.empresaId, empresa: a.empresa.razaoSocial, rota: '/prevencao#acoes' });
    }
    // Treinamento: a turma mais recente de cada curso define quando reciclar.
    const cursos = new Set<string>();
    for (const t of turmas) {
      const chave = `${t.empresaId}|${(t.norma ?? '').toLowerCase()}|${t.nome.toLowerCase()}`;
      if (cursos.has(chave)) continue;
      cursos.add(chave);
      const vence = somarMeses(t.fim, t.validadeMeses!);
      if (dentro(vence)) itens.push({ data: dia(vence), tipo: 'Treinamento', titulo: `Reciclagem: ${t.nome}${t.norma ? ` (${t.norma})` : ''}`, empresaId: t.empresaId, empresa: t.empresa.razaoSocial, rota: '/treinamentos' });
    }
    return itens.sort((a, b) => a.data.localeCompare(b.data) || a.empresa.localeCompare(b.empresa));
  }

  // Planilha: pendências de hoje de cada empresa + o que vence nos próximos 12 meses.
  async planilha(consultoriaId: string, hoje = new Date()) {
    const empresas = await this.prisma.empresa.findMany({ where: { consultoriaId }, select: { id: true }, orderBy: { razaoSocial: 'asc' } });
    const paineis = await Promise.all(empresas.map((e) => this.painel.montar(consultoriaId, e.id, hoje)));
    const linhas: string[][] = [['Empresa', 'CNPJ', 'Situação', 'O que fazer', 'Detalhe', 'Data']];
    const cnpj = new Map(paineis.map((p) => [p.empresa.id, p.empresa.cnpj ?? '']));
    for (const p of paineis) {
      for (const x of p.pendencias) {
        if (x.nivel === 'em-dia') continue;
        linhas.push([p.empresa.razaoSocial, p.empresa.cnpj ?? '', x.nivel === 'vencido' ? 'Vencido' : 'Pendente', x.titulo, x.detalhe, '']);
      }
    }
    const inicio = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
    for (const i of await this.itens(consultoriaId, new Date(inicio.getTime() - 365 * DIA), new Date(inicio.getTime() + 365 * DIA))) {
      const atrasado = i.data < dia(inicio);
      if (atrasado && i.tipo !== 'Ação do plano') continue; // vencido já aparece nas pendências
      linhas.push([i.empresa, cnpj.get(i.empresaId) ?? '', atrasado ? 'Atrasado' : 'Vence', `${i.tipo}: ${i.titulo}`, '', i.data.split('-').reverse().join('/')]);
    }
    return paraCsv(linhas);
  }
}

// CSV que o Excel em português abre certo: ponto e vírgula e marca de UTF-8 (acentos).
export function paraCsv(linhas: string[][]) {
  const celula = (v: string) => {
    const t = /^[=+\-@]/.test(v) ? `'${v}` : v; // evita fórmula escondida na planilha
    return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return '﻿' + linhas.map((l) => l.map(celula).join(';')).join('\r\n') + '\r\n';
}

@Controller('agenda')
export class AgendaController {
  constructor(private readonly agenda: AgendaService) {}

  @Get()
  listar(@ConsultoriaId() c: string, @Query('de') de?: string, @Query('ate') ate?: string) {
    const ini = new Date(`${de ?? ''}T00:00:00Z`), fim = new Date(`${ate ?? ''}T23:59:59Z`);
    if (Number.isNaN(ini.getTime()) || Number.isNaN(fim.getTime()) || fim < ini || fim.getTime() - ini.getTime() > 400 * DIA) throw new BadRequestException('Escolha um período de até um ano.');
    return this.agenda.itens(c, ini, fim);
  }

  @Get('planilha')
  async planilha(@ConsultoriaId() c: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pendencias-${dia(new Date())}.csv"`);
    res.send(await this.agenda.planilha(c));
  }
}
