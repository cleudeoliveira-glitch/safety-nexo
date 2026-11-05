import { BadRequestException, Body, Controller, ForbiddenException, Get, Injectable, NotFoundException, Param, Post, Res } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Response } from 'express';
import { IsDateString, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import * as QRCode from 'qrcode';
import { Publica } from '../auth/publica.decorator';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { enviarPdf } from '../documentos/documentos.controller';
import { escape, folhaHtml } from '../documentos/layout';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';

export class AbrirVotacaoDto {
  @IsDateString({}, { message: 'Informe o início da votação.' }) inicio!: string;
  @IsDateString({}, { message: 'Informe o fim da votação.' }) fim!: string;
}
export class VotoDto {
  @IsString() @Length(1, 40) escolha!: string; // id do candidato, BRANCO ou NULO
  @IsOptional() @IsString() @MaxLength(3) cpfInicio?: string;
}

const WEB = () => (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');
const linkVoto = (codigo: string) => `${WEB()}/votar/${codigo}`;
// Código curto, sem letras que confundem (0/O, 1/I/L).
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const novoCodigo = () => Array.from(randomBytes(10), (b) => ALFABETO[b % ALFABETO.length]).join('');
const digitos = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');

// Votação da CIPA pelo celular (NR-05, 5.5.3): voto secreto, um voto por eleitor, apuração ao final.
// O sistema guarda só SE a pessoa votou (para não votar duas vezes); o voto vai para o contador
// do candidato, sem nenhuma ligação com quem votou.
@Injectable()
export class VotacaoCipaService {
  constructor(private readonly prisma: PrismaService, private readonly contexto: ContextoDocumentoService, private readonly pdf: PdfService) {}

  private async eleicao(consultoriaId: string, empresaId: string, id: string) {
    const e = await this.prisma.cipaEleicao.findFirst({ where: { id, empresaId, empresa: { consultoriaId } }, include: { membros: { where: { representacao: 'EMPREGADOS' }, include: { colaborador: { select: { nome: true } } } } } });
    if (!e) throw new NotFoundException('Eleição não encontrada');
    return e;
  }

  async situacao(consultoriaId: string, empresaId: string, id: string) {
    const e = await this.eleicao(consultoriaId, empresaId, id);
    const eleitores = await this.prisma.cipaEleitor.findMany({ where: { eleicaoId: id }, include: { colaborador: { select: { nome: true, cargo: true } } }, orderBy: { colaborador: { nome: 'asc' } } });
    const agora = new Date();
    const encerrada = !!e.votacaoFim && e.votacaoFim <= agora;
    return {
      inicio: e.votacaoInicio, fim: e.votacaoFim, apuradaEm: e.apuradaEm,
      estado: !e.votacaoInicio ? 'NAO_ABERTA' : e.apuradaEm ? 'APURADA' : encerrada ? 'ENCERRADA' : e.votacaoInicio > agora ? 'AGENDADA' : 'ABERTA',
      total: eleitores.length,
      votaram: eleitores.filter((x) => x.votou).length,
      eleitores: eleitores.map((x) => ({ nome: x.colaborador.nome, cargo: x.colaborador.cargo, codigo: x.codigo, link: linkVoto(x.codigo), votou: x.votou })),
      // Resultado só depois do fim, para não influenciar quem ainda vai votar.
      resultado: encerrada ? {
        candidatos: e.membros.map((m) => ({ nome: m.colaborador.nome, votos: m.votosOnline })).sort((a, b) => b.votos - a.votos),
        brancos: e.votosBrancoOnline, nulos: e.votosNuloOnline,
      } : null,
    };
  }

  async abrir(consultoriaId: string, empresaId: string, id: string, d: AbrirVotacaoDto) {
    const e = await this.eleicao(consultoriaId, empresaId, id);
    const inicio = new Date(d.inicio); const fim = new Date(d.fim);
    if (fim <= inicio) throw new BadRequestException('O fim da votação precisa ser depois do início.');
    if (!e.membros.length) throw new BadRequestException('Cadastre os candidatos dos empregados antes de abrir a votação.');
    if (e.apuradaEm) throw new BadRequestException('Esta votação já foi apurada.');
    const jaVotaram = await this.prisma.cipaEleitor.count({ where: { eleicaoId: id, votou: true } });
    if (jaVotaram && e.votacaoInicio && inicio.getTime() !== e.votacaoInicio.getTime()) throw new BadRequestException('Já tem gente que votou: só dá para mudar o horário de fim.');
    // Todos os empregados da empresa votam (NR-05, 5.5.3).
    const colaboradores = await this.prisma.colaborador.findMany({ where: { empresaId }, select: { id: true } });
    const existentes = new Set((await this.prisma.cipaEleitor.findMany({ where: { eleicaoId: id }, select: { colaboradorId: true } })).map((x) => x.colaboradorId));
    await this.prisma.cipaEleitor.createMany({ data: colaboradores.filter((c) => !existentes.has(c.id)).map((c) => ({ eleicaoId: id, colaboradorId: c.id, codigo: novoCodigo() })) });
    await this.prisma.cipaEleicao.update({ where: { id }, data: { votacaoInicio: inicio, votacaoFim: fim } });
    return this.situacao(consultoriaId, empresaId, id);
  }

  async encerrarAgora(consultoriaId: string, empresaId: string, id: string) {
    const e = await this.eleicao(consultoriaId, empresaId, id);
    if (!e.votacaoInicio) throw new BadRequestException('A votação não foi aberta.');
    await this.prisma.cipaEleicao.update({ where: { id }, data: { votacaoFim: new Date() } });
    return this.situacao(consultoriaId, empresaId, id);
  }

  // Leva o resultado para a eleição: votos de cada candidato e número de votantes (participação, 5.5.4).
  async apurar(consultoriaId: string, empresaId: string, id: string) {
    const e = await this.eleicao(consultoriaId, empresaId, id);
    if (!e.votacaoFim || e.votacaoFim > new Date()) throw new BadRequestException('Só dá para apurar depois do fim da votação.');
    if (e.apuradaEm) throw new BadRequestException('Esta votação já foi apurada.');
    const votantes = await this.prisma.cipaEleitor.count({ where: { eleicaoId: id, votou: true } });
    await this.prisma.$transaction([
      ...e.membros.map((m) => this.prisma.cipaMembro.update({ where: { id: m.id }, data: { votos: m.votosOnline } })),
      this.prisma.cipaEleicao.update({ where: { id }, data: { votantes, apuradaEm: new Date() } }),
    ]);
    return this.situacao(consultoriaId, empresaId, id);
  }

  // Tirinhas com o código e o QR de cada eleitor, para quem prefere receber no papel.
  async tirinhas(consultoriaId: string, empresaId: string, id: string) {
    const s = await this.situacao(consultoriaId, empresaId, id);
    if (!s.eleitores.length) throw new BadRequestException('Abra a votação primeiro.');
    const { empresa } = await this.contexto.carregar(consultoriaId, empresaId, 'CIPA_VOTACAO');
    const fmt = (d: Date | null) => (d ? d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—');
    const itens = await Promise.all(s.eleitores.map(async (x) => `<div class="tira"><img src="${await QRCode.toDataURL(x.link, { margin: 0, width: 160 })}"/><div><strong>${escape(x.nome)}</strong><br/>Eleição da CIPA · ${escape(empresa.razaoSocial)}<br/>Vote de ${fmt(s.inicio)} até ${fmt(s.fim)}<br/>Aponte a câmera para o código ou acesse:<br/><span class="link">${escape(x.link)}</span><br/>Seu código: <strong>${x.codigo}</strong> · <em>pessoal, não empreste</em></div></div>`));
    return this.pdf.render(folhaHtml(itens.join(''), `.tira { display: flex; gap: 14px; align-items: center; border: 1px dashed #9ca3af; padding: 10px; margin-bottom: 8px; page-break-inside: avoid; } .tira img { width: 90px; } .link { font-size: 10px; color: #6b7280; }`));
  }

  // ---------- Página pública do eleitor ----------

  private async eleitor(codigo: string) {
    const x = await this.prisma.cipaEleitor.findUnique({
      where: { codigo: codigo.toUpperCase() },
      include: { colaborador: { select: { nome: true, cpf: true } }, eleicao: { include: { empresa: { select: { razaoSocial: true } }, membros: { where: { representacao: 'EMPREGADOS' }, include: { colaborador: { select: { nome: true, cargo: true } } }, orderBy: { colaborador: { nome: 'asc' } } } } } },
    });
    if (!x) throw new NotFoundException('Código de votação não encontrado. Confira com a comissão eleitoral.');
    return x;
  }

  async cedula(codigo: string) {
    const x = await this.eleitor(codigo);
    const { eleicao: e } = x;
    const agora = new Date();
    const aberta = !!e.votacaoInicio && !!e.votacaoFim && e.votacaoInicio <= agora && e.votacaoFim > agora;
    return {
      empresa: e.empresa.razaoSocial, primeiroNome: x.colaborador.nome.split(' ')[0], inicio: e.votacaoInicio, fim: e.votacaoFim,
      votou: x.votou, aberta, pedeCpf: digitos(x.colaborador.cpf).length === 11,
      candidatos: e.membros.map((m) => ({ id: m.id, nome: m.colaborador.nome, cargo: m.colaborador.cargo })),
    };
  }

  async votar(codigo: string, d: VotoDto) {
    const x = await this.eleitor(codigo);
    const { eleicao: e } = x;
    const agora = new Date();
    if (!e.votacaoInicio || !e.votacaoFim || e.votacaoInicio > agora || e.votacaoFim <= agora) throw new ForbiddenException('A votação não está aberta agora.');
    const cpf = digitos(x.colaborador.cpf);
    if (cpf.length === 11 && digitos(d.cpfInicio) !== cpf.slice(0, 3)) throw new ForbiddenException('Os 3 primeiros números do CPF não conferem.');
    const candidato = e.membros.find((m) => m.id === d.escolha);
    if (!candidato && d.escolha !== 'BRANCO' && d.escolha !== 'NULO') throw new BadRequestException('Escolha um candidato ou vote em branco.');
    await this.prisma.$transaction(async (tx) => {
      // Marca "votou" só se ainda não tinha votado: dois cliques não viram dois votos.
      const marcado = await tx.cipaEleitor.updateMany({ where: { id: x.id, votou: false }, data: { votou: true } });
      if (marcado.count !== 1) throw new ForbiddenException('Este código já foi usado para votar.');
      if (candidato) await tx.cipaMembro.update({ where: { id: candidato.id }, data: { votosOnline: { increment: 1 } } });
      else await tx.cipaEleicao.update({ where: { id: e.id }, data: d.escolha === 'BRANCO' ? { votosBrancoOnline: { increment: 1 } } : { votosNuloOnline: { increment: 1 } } });
    });
    return { ok: true };
  }
}

@Controller('empresas/:empresaId/cipa/eleicoes/:eleicaoId/votacao')
export class VotacaoCipaController {
  constructor(private readonly v: VotacaoCipaService) {}
  @PermiteEmpresa() @Get() situacao(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('eleicaoId') id: string) { return this.v.situacao(c, e, id); }
  @Post() abrir(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('eleicaoId') id: string, @Body() d: AbrirVotacaoDto) { return this.v.abrir(c, e, id, d); }
  @Post('encerrar') encerrar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('eleicaoId') id: string) { return this.v.encerrarAgora(c, e, id); }
  @Post('apurar') apurar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('eleicaoId') id: string) { return this.v.apurar(c, e, id); }
  @PermiteEmpresa() @Post('tirinhas') async tirinhas(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('eleicaoId') id: string, @Res() res: Response) { enviarPdf(res, await this.v.tirinhas(c, e, id), 'Codigos-votacao-CIPA.pdf'); }
}

@Publica()
@Controller('cipa-voto')
export class VotoPublicoController {
  constructor(private readonly v: VotacaoCipaService) {}
  @Get(':codigo') cedula(@Param('codigo') c: string) { return this.v.cedula(c); }
  @Post(':codigo') votar(@Param('codigo') c: string, @Body() d: VotoDto) { return this.v.votar(c, d); }
}
