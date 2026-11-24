import { lerFuncoes } from '../empresas/ghe-ambiente';
import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SessaoUsuario } from '../common/sessao.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { grau5, nivelRisco, Nivel } from '../documentos/nivel-risco';
import { AcaoDto, CriarAvaliacaoDto, LevarPgrDto, ResponderDto, TecnicaDto } from './dto';
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

// Média de 0 a 4 vira probabilidade: abaixo de 1 o fator não foi identificado.
export function probabilidadeDe(media: number | null): 'BAIXA' | 'MEDIA' | 'ALTA' | null {
  if (media === null || media < 1) return null;
  return media < 2 ? 'BAIXA' : media < 3 ? 'MEDIA' : 'ALTA';
}

// Questionário (peso 1) e avaliação técnica (peso 2), como no modelo de AEP psicossocial.
export function combinar(questionario: number | null, tecnica: number | null) {
  if (questionario === null && tecnica === null) return null;
  if (questionario === null) return tecnica;
  if (tecnica === null) return questionario;
  return Math.round(((questionario + 2 * tecnica) / 3) * 100) / 100;
}

export type CelulaMatriz = { questionario: number | null; tecnica: number | null; final: number | null; probabilidade: string | null; severidade: string; nivel: Nivel | null };
const NIVEIS_PGR: Nivel[] = ['MODERADO', 'ALTO', 'CRITICO'];

// "Produção · Padeiro, Ajudante": como a pessoa reconhece o próprio setor na lista.
function rotuloGhe(g: { nome: string; setor: string | null; funcoes: unknown }) {
  const funcoes = lerFuncoes(g.funcoes).map((f) => f.nome);
  const base = g.setor?.trim() && g.setor.trim() !== g.nome ? `${g.nome} (${g.setor.trim()})` : g.nome;
  return funcoes.length ? `${base} · ${funcoes.slice(0, 4).join(', ')}${funcoes.length > 4 ? '…' : ''}` : base;
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
    const lista = await this.prisma.avaliacaoPsicossocial.findMany({ where: { empresaId }, orderBy: { criadoEm: 'desc' }, include: { _count: { select: { respostas: true } } } });
    // As ações ficam no plano de ação único da empresa: conta por avaliação.
    const contagem = await this.prisma.acaoCorretiva.groupBy({ by: ['origemId'], where: { empresaId, origem: 'PSICOSSOCIAL' }, _count: { _all: true } });
    const acoesDe = (id: string) => contagem.find((c) => c.origemId === id)?._count._all ?? 0;
    return lista.map((a) => ({ ...a, _count: { ...a._count, acoes: acoesDe(a.id) }, link: `${WEB()}/psicossocial/${a.token}`, sigla: questionario(a.questionario)?.sigla ?? a.questionario }));
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
    const [respostas, doPlano] = await Promise.all([
      this.prisma.respostaPsicossocial.findMany({ where: { avaliacaoId: id }, select: { setor: true, valores: true } }),
      this.prisma.acaoCorretiva.findMany({ where: { empresaId, origem: 'PSICOSSOCIAL', origemId: id }, orderBy: { criadoEm: 'asc' } }),
    ]);
    // Mesmo formato de antes para a tela: a ação mora no plano de ação da empresa.
    const acoes = doPlano.map((x) => ({ id: x.id, setor: x.local, dimensao: x.tema ?? '', acao: x.descricao, responsavel: x.responsavel, prazo: x.prazo, feita: x.status === 'FEITA', status: x.status }));
    const porSetor = new Map<string, Record<string, number>[]>();
    for (const r of respostas) porSetor.set(r.setor, [...(porSetor.get(r.setor) ?? []), r.valores as Record<string, number>]);
    const comPgr = q.dimensoes.some((d) => d.pgr);
    const tecnica = (a.avaliacaoTecnica ?? {}) as Record<string, Record<string, number | null>>;
    // Matriz por tema: questionário + avaliação técnica, probabilidade, severidade e nível (NR-01).
    const matriz = (setor: string, valores: Record<string, number | null> | null) => !comPgr ? null : Object.fromEntries(q.dimensoes.map((d) => {
      const qv = valores?.[d.id] ?? null; const tv = tecnica[setor]?.[d.id] ?? null;
      const final = combinar(qv, tv); const prob = probabilidadeDe(final); const sev = d.pgr?.severidade ?? 'MEDIA';
      return [d.id, { questionario: qv, tecnica: tv, final, probabilidade: prob, severidade: sev, nivel: prob ? nivelRisco(sev, prob) : null } satisfies CelulaMatriz];
    })) as Record<string, CelulaMatriz>;
    const linha = (setor: string, lista: Record<string, number>[]) => {
      const oculto = lista.length < a.minimoGrupo; const valores = oculto ? null : calcular(q, lista);
      return { setor, respostas: lista.length, oculto, valores, matriz: matriz(setor, valores), tecnica: tecnica[setor] ?? null };
    };
    // Na triagem de fatores, todos os GHEs aparecem: dá para lançar a avaliação técnica mesmo sem respostas.
    // Setores e funções vêm do cadastro de GHEs: não precisa digitar de novo.
    const ghes = await this.prisma.ghe.findMany({ where: { empresaId }, select: { nome: true, setor: true, funcoes: true }, orderBy: { nome: 'asc' } });
    if (comPgr) for (const g of ghes) if (!porSetor.has(g.nome)) porSetor.set(g.nome, []);
    const setores = [...porSetor.entries()].sort((x, y) => x[0].localeCompare(y[0])).map(([s, l]) => linha(s, l));
    return {
      avaliacao: { ...a, link: `${WEB()}/psicossocial/${a.token}` },
      questionario: { id: q.id, sigla: q.sigla, nome: q.nome, fonte: q.fonte, dimensoes: q.dimensoes, escala: q.escala, validado: q.validado, comPgr },
      total: linha(TODOS, respostas.map((r) => r.valores as Record<string, number>)),
      setores,
      ghes: ghes.map((g) => ({ nome: g.nome, setor: g.setor, funcoes: lerFuncoes(g.funcoes).map((f) => f.nome) })),
      acoes,
    };
  }

  // As ações do psicossocial são gravadas direto no plano de ação único da empresa (o mesmo do PGR).
  async criarAcao(consultoriaId: string, empresaId: string, id: string, dto: AcaoDto) {
    const a = await this.avaliacao(consultoriaId, empresaId, id);
    const nomeTema = questionario(a.questionario)?.dimensoes.find((d) => d.id === dto.dimensao)?.nome;
    return this.prisma.acaoCorretiva.create({
      data: {
        empresaId, origem: 'PSICOSSOCIAL', origemId: id, origemTexto: `Avaliação psicossocial "${a.titulo}"${nomeTema ? ` · ${nomeTema}` : ''}`,
        tema: dto.dimensao, hierarquia: 'ADMINISTRATIVA', descricao: dto.acao, local: dto.setor || null, responsavel: dto.responsavel || null,
        prazo: dto.prazo ? new Date(`${dto.prazo.slice(0, 10)}T12:00:00Z`) : null,
      },
    });
  }

  async marcarAcao(consultoriaId: string, empresaId: string, id: string, acaoId: string, feita: boolean) {
    await this.avaliacao(consultoriaId, empresaId, id);
    const { count } = await this.prisma.acaoCorretiva.updateMany({ where: { id: acaoId, empresaId, origem: 'PSICOSSOCIAL', origemId: id }, data: feita ? { status: 'FEITA', feitaEm: new Date() } : { status: 'ABERTA', feitaEm: null, feitaPor: null } });
    if (!count) throw new NotFoundException('Ação não encontrada');
    return { ok: true };
  }

  // Apaga a avaliação com as respostas e o plano de ação. O que já foi levado ao PGR continua lá.
  async excluir(consultoriaId: string, empresaId: string, id: string) {
    await this.avaliacao(consultoriaId, empresaId, id);
    await this.prisma.avaliacaoPsicossocial.delete({ where: { id } });
    // As ações ainda abertas saem do plano de ação; as feitas ficam como histórico.
    await this.prisma.acaoCorretiva.deleteMany({ where: { empresaId, origem: 'PSICOSSOCIAL', origemId: id, status: { not: 'FEITA' } } });
    return { ok: true };
  }

  async removerAcao(consultoriaId: string, empresaId: string, id: string, acaoId: string) {
    await this.avaliacao(consultoriaId, empresaId, id);
    const { count } = await this.prisma.acaoCorretiva.deleteMany({ where: { id: acaoId, empresaId, origem: 'PSICOSSOCIAL', origemId: id } });
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
      tipo: 'ERGONOMICO', agente, severidade: grau5(dto.severidade), tipoAvaliacao: 'QUALITATIVA',
      fonteGeradora: `Organização do trabalho. Avaliação "${r.avaliacao.titulo}": ${dim.rotuloResultado} = ${linha.valores[dim.id]}${dim.tipo === 'casos' ? '%' : ''} (${linha.respostas} respostas)`,
      medidasControle: medidas || null,
    };
    return existente ? this.prisma.gheRisco.update({ where: { id: existente.id }, data: dados }) : this.prisma.gheRisco.create({ data: { ...dados, gheId: ghe.id } });
  }

  // Avaliação técnica do responsável (peso 2) para um setor.
  async salvarTecnica(consultoriaId: string, empresaId: string, id: string, dto: TecnicaDto) {
    const a = await this.avaliacao(consultoriaId, empresaId, id);
    const q = questionario(a.questionario);
    if (!q?.dimensoes.some((d) => d.pgr)) throw new BadRequestException('A avaliação técnica é da triagem de fatores do trabalho.');
    if (!(await this.prisma.ghe.findFirst({ where: { empresaId, nome: dto.setor }, select: { id: true } }))) throw new BadRequestException(`Não existe GHE "${dto.setor}" nesta empresa.`);
    const notas: Record<string, number | null> = {};
    for (const d of q.dimensoes) {
      const v = dto.valores[d.id];
      if (v === null || v === undefined) { notas[d.id] = null; continue; }
      if (typeof v !== 'number' || v < 0 || v > 4) throw new BadRequestException(`A nota de "${d.nome}" vai de 0 a 4.`);
      notas[d.id] = v;
    }
    const atual = (a.avaliacaoTecnica ?? {}) as Record<string, Record<string, number | null>>;
    await this.prisma.avaliacaoPsicossocial.update({ where: { id }, data: { avaliacaoTecnica: { ...atual, [dto.setor]: notas } } });
    return { ok: true };
  }

  // Leva ao PGR todos os fatores moderados ou acima: entram no inventário do GHE do setor
  // e viram ações no plano de ação único da empresa (NR-01, 1.5.3.1.4 e 1.5.5.2).
  async enviarAoPgr(consultoriaId: string, empresaId: string, id: string) {
    const r = await this.resultado(consultoriaId, empresaId, id);
    if (!r.questionario.comPgr) throw new BadRequestException('Este questionário mede sintomas das pessoas. Para o PGR, use a triagem de fatores do trabalho.');
    const ghes = await this.prisma.ghe.findMany({ where: { empresaId }, select: { id: true, nome: true } });
    const chave = (descricao: string, local: string | null) => `${descricao}|${local ?? ''}`;
    const existentes = new Set((await this.prisma.acaoCorretiva.findMany({ where: { empresaId, origem: 'PSICOSSOCIAL', origemId: id }, select: { descricao: true, local: true } })).map((x) => chave(x.descricao, x.local)));
    const origemTexto = `Avaliação psicossocial "${r.avaliacao.titulo}"`;
    let riscos = 0; let acoes = 0; let removidos = 0;
    for (const s of r.setores) {
      const ghe = ghes.find((g) => g.nome === s.setor);
      if (!ghe || !s.matriz) continue;
      for (const d of r.questionario.dimensoes) {
        const c = s.matriz[d.id]; const pgr = d.pgr; if (!pgr) continue;
        const agente = `Fatores psicossociais: ${d.nome.toLowerCase()}`;
        const existente = await this.prisma.gheRisco.findFirst({ where: { gheId: ghe.id, agente } });
        if (!c?.nivel || !NIVEIS_PGR.includes(c.nivel)) {
          // Se caiu para baixo numa nova avaliação, sai do inventário (o histórico fica nas avaliações).
          if (existente && existente.fonteGeradora.includes('Avaliação psicossocial')) { await this.prisma.gheRisco.delete({ where: { id: existente.id } }); removidos++; }
          continue;
        }
        const medidasPlano = r.acoes.filter((x) => x.dimensao === d.id && (!x.setor || x.setor === s.setor)).map((x) => x.acao);
        const br = (n: number) => n.toFixed(1).replace('.', ',');
        const partes = [c.questionario !== null ? `${s.respostas} respostas no questionário, média ${br(c.questionario)}` : '', c.tecnica !== null ? `avaliação técnica ${br(c.tecnica)}` : ''].filter(Boolean).join('; ');
        const dados = {
          tipo: 'ERGONOMICO', agente, tipoAvaliacao: 'QUALITATIVA',
          severidade: grau5(c.severidade), probabilidade: grau5(c.probabilidade ?? 'MEDIA'),
          fonteGeradora: `${pgr.fonte}. Avaliação psicossocial "${r.avaliacao.titulo}": nota ${br(c.final ?? 0)} de 4, com ${partes}.`,
          possiveisLesoes: pgr.consequencias,
          medidasControle: (medidasPlano.length ? medidasPlano : [pgr.medida]).join('; '),
        };
        if (existente) await this.prisma.gheRisco.update({ where: { id: existente.id }, data: dados });
        else await this.prisma.gheRisco.create({ data: { ...dados, gheId: ghe.id } });
        riscos++;
        // As ações do psicossocial já estão no plano de ação da empresa (o que sai no PGR).
        // Sem nenhuma ação para o tema, entra a medida sugerida, ligada ao risco do inventário.
        if (!medidasPlano.length && !existentes.has(chave(pgr.medida, s.setor))) {
          const risco = await this.prisma.gheRisco.findFirst({ where: { gheId: ghe.id, agente }, select: { id: true, severidade: true, probabilidade: true } });
          await this.prisma.acaoCorretiva.create({ data: {
            empresaId, origem: 'PSICOSSOCIAL', origemId: id, origemTexto: `${origemTexto} · ${d.nome}`, descricao: pgr.medida, local: s.setor, tema: d.id,
            hierarquia: 'ADMINISTRATIVA', prioridade: c.nivel === 'MODERADO' ? 'MEDIA' : 'ALTA',
            riscoId: risco?.id ?? null, nivelAntes: risco ? `${grau5(risco.severidade)}x${grau5(risco.probabilidade)}` : null,
          } });
          existentes.add(chave(pgr.medida, s.setor)); acoes++;
        }
      }
    }
    await this.prisma.avaliacaoPsicossocial.update({ where: { id }, data: { enviadoPgrEm: new Date() } });
    return { riscos, acoes, removidos };
  }

  // ---------- Link público (anônimo) ----------

  private async porToken(token: string) {
    const a = await this.prisma.avaliacaoPsicossocial.findUnique({ where: { token }, include: { empresa: { select: { razaoSocial: true, ghes: { select: { nome: true, setor: true, funcoes: true }, orderBy: { nome: 'asc' } }, consultoria: { select: { nome: true } } } } } });
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
      // A pessoa nem sempre sabe o nome do GHE, mas sabe a própria função: a lista mostra setor e funções.
      opcoes: a.empresa.ghes.map((g) => ({ valor: g.nome, rotulo: rotuloGhe(g) })),
      questionario: { sigla: q.sigla, nome: q.nome, descricao: q.descricao, instrucao: q.instrucao ?? null, escala: q.escala, itens: q.itens.map(({ n, texto }) => ({ n, texto })), aviso: q.aviso ?? null },
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
