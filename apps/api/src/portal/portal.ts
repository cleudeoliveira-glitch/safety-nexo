import { Body, Controller, ForbiddenException, Get, HttpException, HttpStatus, Injectable, Module, NotFoundException, Param, Post } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { IsString, Length } from 'class-validator';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';
import { Publica } from '../auth/publica.decorator';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { linkRelato } from '../prevencao/prevencao.service';
import { validadeDaTurma } from '../treinamentos/treinamentos.service';

class EntrarPortalDto { @IsString() @Length(11, 14, { message: 'Digite o seu CPF completo.' }) cpf!: string; }

const WEB = () => (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');
const digitos = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');
const link = (token: string) => `${WEB()}/meu/${token}`;

// Trava de tentativas erradas de CPF: 5 por hora em cada link.
const erros = new Map<string, number[]>();
function conferirTentativas(token: string) {
  const lista = (erros.get(token) ?? []).filter((t) => Date.now() - t < 3600_000);
  erros.set(token, lista);
  if (lista.length >= 5) throw new HttpException('Muitas tentativas. Tente de novo daqui a uma hora.', HttpStatus.TOO_MANY_REQUESTS);
}

// Espaço do trabalhador: um link pessoal, que pede o CPF, mostra o que é dele (ASO, EPI, treinamentos)
// e o que falta assinar. Não mostra prontuário nem dados de outras pessoas.
@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  async links(consultoriaId: string, empresaId: string, gerarFaltantes: boolean) {
    const e = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId }, select: { id: true } });
    if (!e) throw new NotFoundException('Empresa não encontrada');
    if (gerarFaltantes) {
      const sem = await this.prisma.colaborador.findMany({ where: { empresaId, portalToken: null }, select: { id: true } });
      for (const c of sem) await this.prisma.colaborador.update({ where: { id: c.id }, data: { portalToken: randomBytes(15).toString('base64url') } });
    }
    const lista = await this.prisma.colaborador.findMany({ where: { empresaId }, orderBy: { nome: 'asc' }, select: { id: true, nome: true, cargo: true, cpf: true, portalToken: true } });
    return lista.map((c) => ({ id: c.id, nome: c.nome, cargo: c.cargo, temCpf: digitos(c.cpf).length === 11, link: c.portalToken ? link(c.portalToken) : null }));
  }

  async novoLink(consultoriaId: string, empresaId: string, colaboradorId: string) {
    const c = await this.prisma.colaborador.findFirst({ where: { id: colaboradorId, empresaId, empresa: { consultoriaId } }, select: { id: true } });
    if (!c) throw new NotFoundException('Colaborador não encontrado');
    const token = randomBytes(15).toString('base64url');
    await this.prisma.colaborador.update({ where: { id: c.id }, data: { portalToken: token } });
    return { link: link(token) };
  }

  async abrir(token: string) {
    const c = await this.prisma.colaborador.findUnique({ where: { portalToken: token }, select: { nome: true, empresa: { select: { razaoSocial: true, consultoria: { select: { bloqueada: true } } } } } });
    if (!c || c.empresa.consultoria.bloqueada) throw new NotFoundException('Este link não está mais ativo. Peça um novo à sua empresa.');
    return { primeiroNome: c.nome.split(' ')[0], empresa: c.empresa.razaoSocial };
  }

  async entrar(token: string, cpf: string) {
    conferirTentativas(token);
    const c = await this.prisma.colaborador.findUnique({
      where: { portalToken: token },
      include: {
        empresa: { select: { id: true, razaoSocial: true, relatoToken: true, consultoria: { select: { nome: true, bloqueada: true } } } },
        asos: { orderBy: { dataExame: 'desc' }, select: { tipo: true, dataExame: true, resultado: true, proximoExame: true } },
        entregasEpi: { orderBy: { dataEntrega: 'desc' }, select: { epi: true, ca: true, quantidade: true, dataEntrega: true } },
        treinamentos: { select: { codigo: true, turma: { select: { nome: true, norma: true, fim: true, validadeMeses: true, cargaHoraria: true } } } },
        eleitorCipa: { where: { votou: false }, select: { codigo: true, eleicao: { select: { votacaoInicio: true, votacaoFim: true } } } },
      },
    });
    if (!c || c.empresa.consultoria.bloqueada) throw new NotFoundException('Este link não está mais ativo. Peça um novo à sua empresa.');
    if (digitos(c.cpf).length !== 11) throw new ForbiddenException('Seu CPF ainda não está no cadastro. Peça à sua empresa para incluir.');
    if (digitos(cpf) !== digitos(c.cpf)) {
      erros.set(token, [...(erros.get(token) ?? []), Date.now()]);
      throw new ForbiddenException('O CPF não confere com o cadastro.');
    }
    const hoje = new Date();
    const pendentes = await this.prisma.signatario.findMany({
      where: { cpf: digitos(c.cpf), assinadoEm: null, pedido: { empresaId: c.empresaId, status: 'ABERTO' } },
      select: { token: true, papel: true, pedido: { select: { titulo: true } } },
    });
    return {
      nome: c.nome, cargo: c.cargo, empresa: c.empresa.razaoSocial, consultoria: c.empresa.consultoria.nome,
      asos: c.asos,
      epis: c.entregasEpi,
      treinamentos: c.treinamentos.map((p) => {
        const validade = validadeDaTurma(p.turma);
        return { nome: p.turma.nome, norma: p.turma.norma, cargaHoraria: p.turma.cargaHoraria, concluidoEm: p.turma.fim, validade, vencido: !!validade && validade < hoje, certificado: `${WEB()}/validar/${p.codigo}` };
      }).sort((a, b) => +new Date(b.concluidoEm) - +new Date(a.concluidoEm)),
      assinar: pendentes.map((s) => ({ titulo: s.pedido.titulo, papel: s.papel, link: `${WEB()}/assinar/${s.token}` })),
      votar: c.eleitorCipa.filter((x) => x.eleicao.votacaoInicio && x.eleicao.votacaoFim && x.eleicao.votacaoInicio <= hoje && x.eleicao.votacaoFim > hoje).map((x) => `${WEB()}/votar/${x.codigo}`)[0] ?? null,
      relato: c.empresa.relatoToken ? linkRelato(c.empresa.relatoToken) : null,
    };
  }
}

@PermiteEmpresa()
@Controller('empresas/:empresaId/portal')
export class PortalEmpresaController {
  constructor(private readonly p: PortalService) {}
  @Get() listar(@ConsultoriaId() c: string, @Param('empresaId') e: string) { return this.p.links(c, e, false); }
  @Post('gerar') gerar(@ConsultoriaId() c: string, @Param('empresaId') e: string) { return this.p.links(c, e, true); }
  @Post(':colaboradorId/novo') novo(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('colaboradorId') id: string) { return this.p.novoLink(c, e, id); }
}

@Publica()
@Controller('portal')
export class PortalPublicoController {
  constructor(private readonly p: PortalService) {}
  @Get(':token') abrir(@Param('token') t: string) { return this.p.abrir(t); }
  @Post(':token') entrar(@Param('token') t: string, @Body() d: EntrarPortalDto) { return this.p.entrar(t, d.cpf); }
}

@Module({ controllers: [PortalEmpresaController, PortalPublicoController], providers: [PortalService] })
export class PortalModule {}
