import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SessaoUsuario } from '../common/sessao.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AcaoDto, CriarAvaliacaoDto, LevarPgrDto, ResponderDto } from './dto';
import { questionario, QUESTIONARIOS, Questionario } from './questionarios';

const WEB = () => (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');
const TODOS = 'Empresa toda';

// Resultado de um grupo de respostas em cada dimensão do questionário.
export function calcular(q: Questionario, respostas: Record<string, number>[]) {
  const maxEscala = Math.max(...q.escala.map((o) => o.valor)); const minEscala = Math.min(...q.escala.map((o) => o.valor));
  return Object.fromEntries(q.dimensoes.map((d) => {
    const itens = q.itens.filter((i) => i.dimensao === d.id);
    const valor = (r: Record<string, number>, i: (typeof itens)[number]) => (i.invertido ? maxEscala + minEscala - r[i.n] : r[i.n]);
    if (d.tipo === 'casos') {
      const casos = respostas.filter((r) => itens.reduce((s, i) => s + valor(r, i), 0) >= (d.corte ?? 0)).length;
      return [d.id, respostas.length ? Math.round((casos / respostas.length) * 1000) / 10 : null];
    }
    const medias = respostas.map((r) => itens.reduce((s, i) => s + valor(r, i), 0) / itens.length);
    return [d.id, medias.length ? Math.round((medias.reduce((a, b) => a + b, 0) / medias.length) * 100) / 100 : null];
  })) as Record<string, number | null>;
}

@Injectable()
export class PsicossocialService {
  constructor(private readonly prisma: PrismaService) {}

  questionarios() { return QUESTIONARIOS.map(({ itens, ...q }) => ({ ...q, totalItens: itens.length })); }

  private async empresa(consultoriaId: string, empresaId: string) {
    const e = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId }, select: { id: true } });
    if (!e) throw new NotFoundException('Empresa não encontrada');
  }

  private async avaliacao(consultoriaId: string, empresaId: string, id: string) {
    await this.empresa(consultoriaId, empresaId);
    const a = await this.prisma.avaliacaoPsicossocial.findFirst({ where: { id, empresaId } });
    if (!a) throw new NotFoundException('Avaliação não encontrada');
    return a;
  }

  async listar(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    const lista = await this.prisma.avaliacaoPsicossocial.findMany({ where: { empresaId }, orderBy: { criadoEm: 'desc' }, include: { _count: { select: { respostas: true, acoes: true } } } });
    return lista.map((a) => ({ ...a, link: `${WEB()}/psicossocial/${a.token}`, sigla: questionario(a.questionario)?.sigla ?? a.questionario }));
  }

  async criar(sessao: SessaoUsuario, empresaId: string, dto: CriarAvaliacaoDto) {
    await this.empresa(sessao.consultoriaId, empresaId);
    const ghes = await this.prisma.ghe.count({ where: { empresaId } });
    if (!ghes) throw new BadRequestException('Cadastre os GHEs (setores) da empresa antes: cada pessoa escolhe o seu setor ao responder.');
    // Pesquisas por mês conforme o plano (somando todas as empresas da consultoria).
    const limite = sessao.plano?.limites.psicossocialMes;
    if (limite != null) {
      const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
      const feitas = await this.prisma.avaliacaoPsicossocial.count({ where: { empresa: { consultoriaId: sessao.consultoriaId }, criadoEm: { gte: inicioMes } } });
      if (feitas >= limite) {
        throw new ForbiddenException(limite === 0
          ? 'A pesquisa psicossocial faz parte dos planos pagos. No Grátis você vê a demonstração. Abra "Meu plano" no menu para liberar.'
          : `Seu plano inclui ${limite} pesquisa(s) psicossocial(is) por mês e este mês já foram ${feitas}. Abra "Meu plano" no menu para aumentar.`);
      }
    }
    const usuario = await this.prisma.usuario.findUnique({ where: { id: sessao.sub }, select: { nome: true } });
    return this.prisma.avaliacaoPsicossocial.create({ data: { empresaId, questionario: dto.questionario, titulo: dto.titulo, minimoGrupo: dto.minimoGrupo ?? 5, token: randomBytes(18).toString('base64url'), criadoPorNome: usuario?.nome ?? '—' } });
  }

  async mudarStatus(consultoriaId: string, empresaId: string, id: string, aberta: boolean) {
    await this.avaliacao(consultoriaId, empresaId, id);
    return this.prisma.avaliacaoPsicossocial.update({ where: { id }, data: { status: aberta ? 'ABERTA' : 'ENCERRADA', encerradaEm: aberta ? null : new Date() } });
  }

  async resultado(consultoriaId: string, empresaId: string, id: string) {
    const a = await this.avaliacao(consultoriaId, empresaId, id);
    const q = questionario(a.questionario);
    if (!q) throw new BadRequestException('Questionário desconhecido.');
    const [respostas, acoes] = await Promise.all([
      this.prisma.respostaPsicossocial.findMany({ where: { avaliacaoId: id }, select: { setor: true, valores: true } }),
      this.prisma.acaoPsicossocial.findMany({ where: { avaliacaoId: id }, orderBy: { criadoEm: 'asc' } }),
    ]);
    const porSetor = new Map<string, Record<string, number>[]>();
    for (const r of respostas) porSetor.set(r.setor, [...(porSetor.get(r.setor) ?? []), r.valores as Record<string, number>]);
    const linha = (setor: string, lista: Record<string, number>[]) => ({ setor, respostas: lista.length, oculto: lista.length < a.minimoGrupo, valores: lista.length < a.minimoGrupo ? null : calcular(q, lista) });
    const setores = [...porSetor.entries()].sort((x, y) => x[0].localeCompare(y[0])).map(([s, l]) => linha(s, l));
    return {
      avaliacao: { ...a, link: `${WEB()}/psicossocial/${a.token}` },
      questionario: { id: q.id, sigla: q.sigla, nome: q.nome, fonte: q.fonte, dimensoes: q.dimensoes, escala: q.escala },
      total: linha(TODOS, respostas.map((r) => r.valores as Record<string, number>)),
      setores,
      acoes,
    };
  }

  async criarAcao(consultoriaId: string, empresaId: string, id: string, dto: AcaoDto) {
    await this.avaliacao(consultoriaId, empresaId, id);
    return this.prisma.acaoPsicossocial.create({ data: { avaliacaoId: id, setor: dto.setor || null, dimensao: dto.dimensao, acao: dto.acao, responsavel: dto.responsavel || null, prazo: dto.prazo ? new Date(`${dto.prazo.slice(0, 10)}T12:00:00Z`) : null } });
  }

  async marcarAcao(consultoriaId: string, empresaId: string, id: string, acaoId: string, feita: boolean) {
    await this.avaliacao(consultoriaId, empresaId, id);
    const { count } = await this.prisma.acaoPsicossocial.updateMany({ where: { id: acaoId, avaliacaoId: id }, data: { feita } });
    if (!count) throw new NotFoundException('Ação não encontrada');
    return { ok: true };
  }

  async removerAcao(consultoriaId: string, empresaId: string, id: string, acaoId: string) {
    await this.avaliacao(consultoriaId, empresaId, id);
    const { count } = await this.prisma.acaoPsicossocial.deleteMany({ where: { id: acaoId, avaliacaoId: id } });
    if (!count) throw new NotFoundException('Ação não encontrada');
    return { ok: true };
  }

  // Leva o resultado de um setor ao inventário de riscos do PGR (GHE com o mesmo nome do setor).
  async levarAoPgr(consultoriaId: string, empresaId: string, id: string, dto: LevarPgrDto) {
    const r = await this.resultado(consultoriaId, empresaId, id);
    const ghe = await this.prisma.ghe.findFirst({ where: { empresaId, nome: dto.setor } });
    if (!ghe) throw new BadRequestException(`Não existe GHE "${dto.setor}" nesta empresa.`);
    const linha = r.setores.find((s) => s.setor === dto.setor);
    const dim = r.questionario.dimensoes.find((d) => d.id === dto.dimensao);
    if (!linha || linha.oculto || !linha.valores || !dim) throw new BadRequestException('Este setor ainda não tem respostas suficientes.');
    const medidas = r.acoes.filter((x) => x.dimensao === dim.id && (!x.setor || x.setor === dto.setor)).map((x) => x.acao).join('; ');
    const agente = `Fatores psicossociais: ${dim.nome.toLowerCase()} (${r.questionario.sigla})`;
    const existente = await this.prisma.gheRisco.findFirst({ where: { gheId: ghe.id, agente } });
    const dados = {
      tipo: 'ERGONOMICO', agente, severidade: dto.severidade, tipoAvaliacao: 'QUALITATIVA',
      fonteGeradora: `Organização do trabalho. Avaliação "${r.avaliacao.titulo}": ${dim.rotuloResultado} = ${linha.valores[dim.id]}${dim.tipo === 'casos' ? '%' : ''} (${linha.respostas} respostas)`,
      medidasControle: medidas || null,
    };
    return existente ? this.prisma.gheRisco.update({ where: { id: existente.id }, data: dados }) : this.prisma.gheRisco.create({ data: { ...dados, gheId: ghe.id } });
  }

  // ---------- Link público (anônimo) ----------

  private async porToken(token: string) {
    const a = await this.prisma.avaliacaoPsicossocial.findUnique({ where: { token }, include: { empresa: { select: { razaoSocial: true, ghes: { select: { nome: true }, orderBy: { nome: 'asc' } }, consultoria: { select: { nome: true } } } } } });
    if (!a) throw new NotFoundException('Link não encontrado. Peça um novo a quem enviou.');
    return a;
  }

  async publico(token: string) {
    const a = await this.porToken(token);
    const q = questionario(a.questionario);
    if (!q) throw new BadRequestException('Questionário desconhecido.');
    return {
      titulo: a.titulo, empresa: a.empresa.razaoSocial, consultoria: a.empresa.consultoria.nome, aberta: a.status === 'ABERTA',
      setores: a.empresa.ghes.map((g) => g.nome),
      questionario: { sigla: q.sigla, nome: q.nome, descricao: q.descricao, escala: q.escala, itens: q.itens.map(({ n, texto }) => ({ n, texto })), aviso: q.aviso ?? null },
    };
  }

  async responder(token: string, dto: ResponderDto) {
    const a = await this.porToken(token);
    if (a.status !== 'ABERTA') throw new BadRequestException('Esta avaliação já foi encerrada.');
    const q = questionario(a.questionario)!;
    if (!a.empresa.ghes.some((g) => g.nome === dto.setor)) throw new BadRequestException('Escolha o seu setor.');
    const validos = new Set(q.escala.map((o) => o.valor));
    const valores: Record<string, number> = {};
    for (const i of q.itens) {
      const v = dto.valores[String(i.n)];
      if (typeof v !== 'number' || !validos.has(v)) throw new BadRequestException(`Responda a pergunta ${i.n}.`);
      valores[String(i.n)] = v;
    }
    const hoje = new Date(); hoje.setUTCHours(12, 0, 0, 0);
    await this.prisma.respostaPsicossocial.create({ data: { avaliacaoId: a.id, setor: dto.setor, valores, dia: hoje } });
    return { ok: true, aviso: q.aviso ?? null };
  }
}
