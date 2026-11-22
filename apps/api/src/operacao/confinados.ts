import { BadRequestException, Body, Controller, Delete, Get, Injectable, NotFoundException, Param, Post, Put, Res } from '@nestjs/common';
import { CSS_SECOES, p as par, secoesNumeradas, tabelaDuasColunas, tabelaReferencias } from '../documentos/secoes';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsOptional, IsString, Length, MaxLength, ValidateNested } from 'class-validator';
import { Response } from 'express';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { identificacao } from '../documentos/capa';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { enviarPdf } from '../documentos/documentos.controller';
import { documentoHtml, escape, Moldura } from '../documentos/layout';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { RISCOS_CONFINADO, TIPOS_ESPACO } from './conteudo';

// Inventário de espaços confinados (NR-33) e planos de resgate (NR-33 e NR-35), com PDF de cada um.

export class EspacoDto {
  @IsString() @Length(1, 20, { message: 'Dê um código ao espaço (ex.: EC-01).' }) codigo!: string;
  @IsString() @Length(2, 200, { message: 'Escreva o nome do espaço (ex.: Tanque de água).' }) nome!: string;
  @IsString() @Length(2, 200, { message: 'Informe onde fica o espaço.' }) local!: string;
  @IsIn(Object.keys(TIPOS_ESPACO), { message: 'Escolha o tipo de espaço.' }) tipo!: string;
  @IsOptional() @IsString() @MaxLength(2000) descricao?: string;
  @IsOptional() @IsString() @MaxLength(500) acessos?: string;
  @IsOptional() @IsString() @MaxLength(500) produtos?: string;
  @IsArray() @IsIn(Object.keys(RISCOS_CONFINADO), { each: true, message: 'Perigo inválido.' }) riscos!: string[];
  @IsOptional() @IsString() @MaxLength(3000) medidasControle?: string;
  @IsBoolean() sinalizado!: boolean;
  @IsBoolean() isolado!: boolean;
  @IsOptional() @IsBoolean() ativo?: boolean;
}

export class TelefoneDto {
  @IsString() @Length(1, 80) nome!: string;
  @IsString() @Length(3, 30) numero!: string;
}

export class PlanoResgateDto {
  @IsIn(['ALTURA', 'ESPACO_CONFINADO'], { message: 'Escolha se o plano é para altura ou espaço confinado.' }) tipo!: string;
  @IsString() @Length(2, 200, { message: 'Dê um nome ao plano (ex.: Resgate no telhado do galpão).' }) titulo!: string;
  @IsString() @Length(2, 200, { message: 'Informe o local.' }) local!: string;
  @IsOptional() @IsString() espacoId?: string;
  @IsString() @Length(2, 5000, { message: 'Descreva o que pode dar errado.' }) cenarios!: string;
  @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) equipe!: string[];
  @IsOptional() @IsString() @MaxLength(500) equipeExterna?: string;
  @IsArray() @ArrayMaxSize(40) @IsString({ each: true }) equipamentos!: string[];
  @IsString() @Length(10, 10000, { message: 'Escreva o passo a passo do resgate.' }) procedimento!: string;
  @IsOptional() @IsString() @MaxLength(3000) primeirosSocorros?: string;
  @IsArray() @ArrayMaxSize(15) @ValidateNested({ each: true }) @Type(() => TelefoneDto) telefones!: TelefoneDto[];
  @IsOptional() @IsString() @MaxLength(500) hospital?: string;
  @IsOptional() @IsDateString({}, { message: 'Data do simulado inválida.' }) ultimoSimulado?: string;
}

const DIA_MS = 86_400_000;
const texto = (v?: string) => v?.trim() || null;

@Injectable()
export class ConfinadosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
  ) {}

  private async empresa(c: string, e: string) {
    const x = await this.prisma.empresa.findFirst({ where: { id: e, consultoriaId: c }, select: { id: true } });
    if (!x) throw new NotFoundException('Empresa não encontrada');
  }

  private async moldura(c: string, e: string, titulo: string): Promise<Moldura> {
    const { empresa, logoEmpresa, consultoria } = await this.contexto.carregar(c, e, 'CONFINADOS');
    return { titulo, logoEmpresa, consultoria, infos: identificacao(empresa), aviso: 'Feito com o Safety Nexo.' };
  }

  // ---- Espaços confinados
  async listarEspacos(c: string, e: string) {
    await this.empresa(c, e);
    return this.prisma.espacoConfinado.findMany({ where: { empresaId: e }, orderBy: [{ ativo: 'desc' }, { codigo: 'asc' }] });
  }

  private dadosEspaco(dto: EspacoDto) {
    return {
      codigo: dto.codigo.trim().toUpperCase(), nome: dto.nome.trim(), local: dto.local.trim(), tipo: dto.tipo,
      descricao: texto(dto.descricao), acessos: texto(dto.acessos), produtos: texto(dto.produtos), riscos: [...new Set(dto.riscos)],
      medidasControle: texto(dto.medidasControle), sinalizado: dto.sinalizado, isolado: dto.isolado, ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
    };
  }

  async criarEspaco(c: string, e: string, dto: EspacoDto) {
    await this.empresa(c, e);
    const dados = this.dadosEspaco(dto);
    if (await this.prisma.espacoConfinado.findFirst({ where: { empresaId: e, codigo: dados.codigo } })) throw new BadRequestException(`Já existe um espaço com o código ${dados.codigo}.`);
    return this.prisma.espacoConfinado.create({ data: { empresaId: e, ...dados } });
  }

  async editarEspaco(c: string, e: string, id: string, dto: EspacoDto) {
    await this.empresa(c, e);
    if (!(await this.prisma.espacoConfinado.findFirst({ where: { id, empresaId: e } }))) throw new NotFoundException('Espaço não encontrado');
    const dados = this.dadosEspaco(dto);
    if (await this.prisma.espacoConfinado.findFirst({ where: { empresaId: e, codigo: dados.codigo, NOT: { id } } })) throw new BadRequestException(`Já existe um espaço com o código ${dados.codigo}.`);
    return this.prisma.espacoConfinado.update({ where: { id }, data: dados });
  }

  async excluirEspaco(c: string, e: string, id: string) {
    await this.empresa(c, e);
    const { count } = await this.prisma.espacoConfinado.deleteMany({ where: { id, empresaId: e } });
    if (!count) throw new NotFoundException('Espaço não encontrado');
    return { ok: true };
  }

  async pdfInventario(c: string, e: string) {
    const espacos = (await this.listarEspacos(c, e)).filter((x) => x.ativo);
    const moldura = await this.moldura(c, e, 'Cadastro de espaços confinados');
    return this.pdf.render(inventarioHtml(moldura, espacos));
  }

  // ---- Planos de resgate
  async listarPlanos(c: string, e: string) {
    await this.empresa(c, e);
    const planos = await this.prisma.planoResgate.findMany({ where: { empresaId: e }, orderBy: { numero: 'desc' }, include: { espaco: { select: { codigo: true, nome: true } } } });
    const hoje = Date.now();
    return planos.map((p) => ({ ...p, simuladoVencido: !p.ultimoSimulado || hoje - p.ultimoSimulado.getTime() > 365 * DIA_MS }));
  }

  private async dadosPlano(e: string, dto: PlanoResgateDto) {
    if (dto.espacoId && !(await this.prisma.espacoConfinado.findFirst({ where: { id: dto.espacoId, empresaId: e } }))) throw new NotFoundException('Espaço confinado não encontrado nesta empresa');
    const equipe = [...new Set(dto.equipe)];
    if (equipe.length && (await this.prisma.colaborador.count({ where: { empresaId: e, id: { in: equipe } } })) !== equipe.length) {
      throw new BadRequestException('Há pessoas na equipe que não são desta empresa.');
    }
    if (!equipe.length && !dto.equipeExterna?.trim()) throw new BadRequestException('Indique quem faz o resgate: pessoas da empresa ou uma equipe de fora.');
    return {
      tipo: dto.tipo, titulo: dto.titulo.trim(), local: dto.local.trim(), espacoId: dto.tipo === 'ESPACO_CONFINADO' ? dto.espacoId || null : null,
      cenarios: dto.cenarios.trim(), equipe, equipeExterna: texto(dto.equipeExterna),
      equipamentos: [...new Set(dto.equipamentos.map((x) => x.trim()).filter(Boolean))], procedimento: dto.procedimento.trim(),
      primeirosSocorros: texto(dto.primeirosSocorros),
      telefones: dto.telefones.map((t) => ({ nome: t.nome.trim(), numero: t.numero.trim() })).filter((t) => t.nome && t.numero),
      hospital: texto(dto.hospital), ultimoSimulado: dto.ultimoSimulado ? new Date(dto.ultimoSimulado) : null,
    };
  }

  async criarPlano(c: string, e: string, dto: PlanoResgateDto) {
    await this.empresa(c, e);
    const dados = await this.dadosPlano(e, dto);
    for (let tentativa = 0; ; tentativa++) {
      const ultimo = await this.prisma.planoResgate.findFirst({ where: { empresaId: e }, orderBy: { numero: 'desc' }, select: { numero: true } });
      try {
        return await this.prisma.planoResgate.create({ data: { empresaId: e, numero: (ultimo?.numero ?? 0) + 1, ...dados } });
      } catch (erro) {
        if (tentativa >= 2 || (erro as { code?: string }).code !== 'P2002') throw erro;
      }
    }
  }

  async editarPlano(c: string, e: string, id: string, dto: PlanoResgateDto) {
    await this.empresa(c, e);
    if (!(await this.prisma.planoResgate.findFirst({ where: { id, empresaId: e } }))) throw new NotFoundException('Plano não encontrado');
    return this.prisma.planoResgate.update({ where: { id }, data: await this.dadosPlano(e, dto) });
  }

  async excluirPlano(c: string, e: string, id: string) {
    await this.empresa(c, e);
    const { count } = await this.prisma.planoResgate.deleteMany({ where: { id, empresaId: e } });
    if (!count) throw new NotFoundException('Plano não encontrado');
    return { ok: true };
  }

  async pdfPlano(c: string, e: string, id: string) {
    await this.empresa(c, e);
    const p = await this.prisma.planoResgate.findFirst({ where: { id, empresaId: e }, include: { espaco: true } });
    if (!p) throw new NotFoundException('Plano não encontrado');
    const lista = await this.prisma.colaborador.findMany({ where: { id: { in: p.equipe } }, select: { id: true, nome: true, cargo: true } });
    const equipe = p.equipe.map((x) => lista.find((l) => l.id === x)).filter((x): x is NonNullable<typeof x> => !!x);
    const moldura = await this.moldura(c, e, `Plano de resgate nº ${p.numero}`);
    return this.pdf.render(planoHtml(moldura, { ...p, telefones: Array.isArray(p.telefones) ? (p.telefones as { nome: string; numero: string }[]) : [] }, equipe));
  }
}

// ---- PDFs
const data = (d: Date | null) => (d ? d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const paragrafos = (t: string | null) => (t ?? '').split(/\n+/).map((x) => x.trim()).filter(Boolean).map((x) => `<p>${escape(x)}</p>`).join('');
const simNao = (b: boolean) => (b ? 'Sim' : '<strong style="color:#b91c1c">Não</strong>');

type Espaco = { codigo: string; nome: string; local: string; tipo: string; descricao: string | null; acessos: string | null; produtos: string | null; riscos: string[]; medidasControle: string | null; sinalizado: boolean; isolado: boolean };

export function inventarioHtml(moldura: Moldura, espacos: Espaco[]) {
  const nomeTipo = (t: string) => TIPOS_ESPACO[t as keyof typeof TIPOS_ESPACO] ?? t;
  const nomeRisco = (r: string) => RISCOS_CONFINADO[r as keyof typeof RISCOS_CONFINADO] ?? r;
  const ficha = (x: Espaco) => `
    <section class="espaco">
      <h2>${escape(x.codigo)} · ${escape(x.nome)}</h2>
      <table>
        <tbody>
          <tr><th style="width:28%">Tipo</th><td>${escape(nomeTipo(x.tipo))}</td></tr>
          <tr><th>Onde fica</th><td>${escape(x.local)}</td></tr>
          ${x.descricao ? `<tr><th>Descrição</th><td>${escape(x.descricao)}</td></tr>` : ''}
          <tr><th>Acessos</th><td>${escape(x.acessos) || '—'}</td></tr>
          <tr><th>O que tem ou já teve dentro</th><td>${escape(x.produtos) || '—'}</td></tr>
          <tr><th>Perigos</th><td>${x.riscos.length ? x.riscos.map((r) => escape(nomeRisco(r))).join('; ') : '—'}</td></tr>
          <tr><th>Medidas de controle</th><td>${escape(x.medidasControle) || '—'}</td></tr>
          <tr><th>Sinalizado</th><td>${simNao(x.sinalizado)}</td></tr>
          <tr><th>Entrada impedida a quem não é autorizado</th><td>${simNao(x.isolado)}</td></tr>
        </tbody>
      </table>
    </section>`;
  return documentoHtml(
    moldura,
    `
    <p>Cadastro dos espaços confinados da empresa, como pede a NR-33. Ninguém entra em nenhum deles sem Permissão de Entrada e Trabalho (PET),
    com trabalhadores e vigia treinados, atmosfera medida e plano de resgate pronto.</p>
    <h2>Resumo</h2>
    <table>
      <thead><tr><th>Código</th><th>Espaço</th><th>Local</th><th class="c">Sinalizado</th><th class="c">Isolado</th></tr></thead>
      <tbody>${espacos.map((x) => `<tr><td>${escape(x.codigo)}</td><td>${escape(x.nome)}</td><td>${escape(x.local)}</td><td class="c">${simNao(x.sinalizado)}</td><td class="c">${simNao(x.isolado)}</td></tr>`).join('') || '<tr><td colspan="5">Nenhum espaço cadastrado.</td></tr>'}</tbody>
    </table>
    ${espacos.map(ficha).join('')}
    <div class="assinaturas"><div class="assinatura">&nbsp;<span>Responsável técnico pelos espaços confinados</span></div><div class="assinatura">&nbsp;<span>Responsável pela empresa</span></div></div>`,
    '.c { text-align: center; } .espaco { break-inside: avoid; margin-top: 18px; } th { text-align: left; }',
  );
}

type Plano = {
  numero: number; tipo: string; titulo: string; local: string; espaco: { codigo: string; nome: string } | null; cenarios: string; equipeExterna: string | null;
  equipamentos: string[]; procedimento: string; primeirosSocorros: string | null; telefones: { nome: string; numero: string }[]; hospital: string | null; ultimoSimulado: Date | null;
};

export function planoHtml(moldura: Moldura, p: Plano, equipe: { nome: string; cargo: string }[]) {
  const altura = p.tipo === 'ALTURA';
  const norma = altura ? 'NR-35' : 'NR-33';
  const secoes = secoesNumeradas([
    {
      titulo: 'Objetivo',
      html: par(
        `Este plano diz como resgatar com rapidez e segurança alguém que passe mal ou se acidente ${altura ? 'durante um trabalho em altura' : 'dentro de um espaço confinado'}.
        Ele precisa estar pronto antes de o trabalho começar, porque nesse tipo de situação cada minuto conta e quem entra para socorrer sem preparo
        costuma virar a segunda vítima.`,
      ),
    },
    {
      titulo: 'Identificação',
      html: `<table><tbody>
        <tr><th>Plano</th><td>Nº ${p.numero} · ${escape(p.titulo)}</td></tr>
        <tr><th>Tipo</th><td>${altura ? 'Trabalho em altura (NR-35)' : 'Espaço confinado (NR-33)'}</td></tr>
        <tr><th>Local</th><td>${escape(p.local)}${p.espaco ? ` · ${escape(p.espaco.codigo)} · ${escape(p.espaco.nome)}` : ''}</td></tr>
        <tr><th>Último simulado</th><td>${p.ultimoSimulado ? data(p.ultimoSimulado) : 'ainda não feito'}</td></tr>
      </tbody></table>`,
    },
    {
      titulo: 'Referências normativas',
      html: tabelaReferencias(
        altura
          ? [['NR-35', 'Trabalho em altura, itens de emergência e salvamento'], ['NR-01, item 1.5.6', 'Preparação para emergências']]
          : [['NR-33', 'Espaços confinados, itens de emergência e salvamento'], ['NR-01, item 1.5.6', 'Preparação para emergências'], ['ABNT NBR 16577', 'Espaço confinado: prevenção de acidentes, procedimentos e medidas de proteção']],
      ),
    },
    {
      titulo: 'Responsabilidades',
      html: tabelaDuasColunas(['Quem', 'O que faz'], [
        ['Empresa', 'Garantir a equipe treinada, os equipamentos de resgate no local e o simulado pelo menos uma vez por ano.'],
        ['Equipe de resgate', 'Fazer o resgate seguindo este plano, sem entrar ou subir sem proteção.'],
        [altura ? 'Supervisor do trabalho' : 'Supervisor de entrada', 'Confirmar, antes de liberar o trabalho, que a equipe e os equipamentos de resgate estão disponíveis.'],
        ['Trabalhadores', 'Conhecer o plano, avisar na hora qualquer problema e nunca tentar um resgate sozinho.'],
      ]),
    },
    {
      titulo: 'Telefones de emergência',
      html: `<table class="telefones"><tbody>
        ${p.telefones.map((t) => `<tr><th style="width:45%">${escape(t.nome)}</th><td><strong>${escape(t.numero)}</strong></td></tr>`).join('')}
        ${p.hospital ? `<tr><th>Hospital mais próximo</th><td>${escape(p.hospital)}</td></tr>` : ''}
      </tbody></table>`,
    },
    { titulo: 'O que pode dar errado', html: paragrafos(p.cenarios) },
    {
      titulo: 'Equipe de resgate',
      html: `${equipe.length ? `<table><thead><tr><th>Nome</th><th>Função</th><th style="width:35%">Ciente</th></tr></thead><tbody>${equipe.map((x) => `<tr><td>${escape(x.nome)}</td><td>${escape(x.cargo)}</td><td></td></tr>`).join('')}</tbody></table>` : '<p class="falta">Equipe não cadastrada.</p>'}
        ${p.equipeExterna ? `<p><strong>Equipe de fora:</strong> ${escape(p.equipeExterna)}</p>` : ''}`,
    },
    { titulo: 'Equipamentos de resgate no local', html: p.equipamentos.length ? `<ul>${p.equipamentos.map((x) => `<li>${escape(x)}</li>`).join('')}</ul>` : '<p>—</p>' },
    { titulo: 'Passo a passo do resgate', html: paragrafos(p.procedimento) },
    p.primeirosSocorros ? { titulo: 'Primeiros socorros', html: paragrafos(p.primeirosSocorros) } : null,
    {
      titulo: 'Simulados e revisão',
      html: par(`O plano é treinado em simulado pelo menos uma vez por ano (${norma}), com registro de quem participou, do tempo de resposta e do que precisa melhorar. Ele deve ser revisto depois de cada simulado, de qualquer emergência real e sempre que mudar o local, a atividade ou a equipe.`),
    },
  ], { sumario: false });
  return documentoHtml(
    moldura,
    `${secoes}<div class="assinaturas"><div class="assinatura">&nbsp;<span>Responsável pelo plano</span></div><div class="assinatura">&nbsp;<span>Responsável pela empresa</span></div></div>`,
    `${CSS_SECOES} .telefones td, .telefones th { font-size: 13px; } th { text-align: left; }`,
  );
}

@PermiteEmpresa()
@Controller('empresas/:empresaId')
export class ConfinadosController {
  constructor(private readonly s: ConfinadosService) {}

  @Get('espacos-confinados') listarEspacos(@ConsultoriaId() c: string, @Param('empresaId') e: string) { return this.s.listarEspacos(c, e); }
  @Post('espacos-confinados') criarEspaco(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: EspacoDto) { return this.s.criarEspaco(c, e, dto); }
  @Post('espacos-confinados/pdf') async pdfInventario(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Res() res: Response) {
    enviarPdf(res, await this.s.pdfInventario(c, e), 'Cadastro-espacos-confinados.pdf');
  }
  @Put('espacos-confinados/:id') editarEspaco(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Body() dto: EspacoDto) { return this.s.editarEspaco(c, e, id, dto); }
  @Delete('espacos-confinados/:id') excluirEspaco(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.s.excluirEspaco(c, e, id); }

  @Get('planos-resgate') listarPlanos(@ConsultoriaId() c: string, @Param('empresaId') e: string) { return this.s.listarPlanos(c, e); }
  @Post('planos-resgate') criarPlano(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Body() dto: PlanoResgateDto) { return this.s.criarPlano(c, e, dto); }
  @Put('planos-resgate/:id') editarPlano(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Body() dto: PlanoResgateDto) { return this.s.editarPlano(c, e, id, dto); }
  @Delete('planos-resgate/:id') excluirPlano(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string) { return this.s.excluirPlano(c, e, id); }
  @Post('planos-resgate/:id/pdf') async pdfPlano(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('id') id: string, @Res() res: Response) {
    enviarPdf(res, await this.s.pdfPlano(c, e, id), 'Plano-de-resgate.pdf');
  }
}
