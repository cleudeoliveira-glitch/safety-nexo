import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { conferirFuncionarios } from '../common/plano';
import { Prisma } from '@prisma/client';
import { cpfValido } from '../esocial/eventos';
import { PrismaService } from '../prisma/prisma.service';
import { alertasInss, fimAtestado, indicadores } from './absenteismo';
import { AtestadoDto, TerceiroDocumentoDto, TerceiroDto, TerceiroTrabalhadorDto } from './dto';
import { lerData, lerPlanilha, normalizarNome, texto } from './planilha';

const dataOuNulo = (v?: string) => (v ? new Date(`${v.slice(0, 10)}T12:00:00Z`) : null);
const digitos = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '');
const formatarCpf = (d: string) => `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
const DIA = 86_400_000;

// Documentos que o cliente costuma pedir da empresa terceirizada antes de liberar a entrada.
export const DOCUMENTOS_TERCEIRO = [
  'PGR da contratada', 'PCMSO da contratada', 'ASOs dos trabalhadores', 'Fichas de entrega de EPI', 'Certificados de treinamento (NRs)',
  'Ordem de serviço de segurança', 'Seguro de vida em grupo', 'Comprovante de regularidade do FGTS (CRF)', 'Certidão de débitos federais (CND)',
  'Contrato de prestação de serviço', 'ART do responsável técnico',
];

@Injectable()
export class ConectoresService {
  constructor(private readonly prisma: PrismaService) {}

  private async empresa(consultoriaId: string, empresaId: string) {
    const empresa = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId } });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    return empresa;
  }

  // ---------- Importação de funcionários (planilha do RH) ----------

  private async planejar(empresaId: string, buffer: Buffer, nome: string) {
    const planilha = await lerPlanilha(buffer, nome);
    const [existentes, ghes] = await Promise.all([
      this.prisma.colaborador.findMany({ where: { empresaId } }),
      this.prisma.ghe.findMany({ where: { empresaId }, select: { id: true, nome: true } }),
    ]);
    const porCpf = new Map(existentes.filter((c) => digitos(c.cpf).length === 11).map((c) => [digitos(c.cpf), c]));
    const porMatricula = new Map(existentes.filter((c) => c.matricula).map((c) => [c.matricula!.trim(), c]));
    const porNome = new Map(existentes.map((c) => [normalizarNome(c.nome), c]));
    const vistos = new Set<string>();
    const linhas = planilha.linhas.map(({ linha, valores }) => {
      const erros: string[] = []; const avisos: string[] = [];
      const nomeColab = texto(valores.nome).replace(/\s+/g, ' ');
      if (nomeColab.length < 2) erros.push('sem nome');
      const cpfD = digitos(texto(valores.cpf));
      let cpf: string | undefined;
      if (cpfD) { const d = cpfD.padStart(11, '0'); if (cpfValido(d)) cpf = formatarCpf(d); else erros.push('CPF inválido'); }
      const adm = lerData(valores.admissao);
      if (adm === 'invalida') erros.push('data de admissão inválida');
      const cboD = digitos(texto(valores.cbo));
      if (cboD && cboD.length !== 6) avisos.push('CBO deve ter 6 números, ficou de fora');
      const matricula = texto(valores.matricula) || undefined;
      const gheTxt = texto(valores.ghe);
      const ghe = gheTxt ? ghes.find((g) => normalizarNome(g.nome) === normalizarNome(gheTxt)) : undefined;
      if (gheTxt && !ghe) avisos.push(`GHE "${gheTxt}" não existe nesta empresa; entra sem GHE`);
      const chave = cpf ? digitos(cpf) : matricula ? `m:${matricula}` : `n:${normalizarNome(nomeColab)}`;
      if (vistos.has(chave)) erros.push('repetido na planilha');
      vistos.add(chave);
      const atual = (cpf && porCpf.get(digitos(cpf))) || (matricula && porMatricula.get(matricula)) || (!cpf && porNome.get(normalizarNome(nomeColab))) || undefined;
      const dados = {
        nome: nomeColab,
        ...(cpf ? { cpf } : {}),
        ...(texto(valores.cargo) ? { cargo: texto(valores.cargo).slice(0, 200) } : {}),
        ...(cboD.length === 6 ? { cbo: cboD } : {}),
        ...(matricula ? { matricula: matricula.slice(0, 30) } : {}),
        ...(adm && adm !== 'invalida' ? { dataAdmissao: adm } : {}),
        ...(ghe ? { gheId: ghe.id } : {}),
      };
      if (!atual && !dados.cargo && !erros.length) avisos.push('sem cargo; entra como "A definir"');
      return { linha, nome: nomeColab, cpf: cpf ?? null, cargo: dados.cargo ?? atual?.cargo ?? null, ghe: ghe?.nome ?? null, acao: erros.length ? 'erro' as const : atual ? 'atualizar' as const : 'novo' as const, colaboradorId: atual?.id ?? null, erros, avisos, dados };
    });
    return { colunas: planilha.colunas, ignoradas: planilha.ignoradas, linhas };
  }

  async previaImportacao(consultoriaId: string, empresaId: string, arquivo?: Express.Multer.File) {
    await this.empresa(consultoriaId, empresaId);
    if (!arquivo) throw new BadRequestException('Escolha a planilha.');
    const p = await this.planejar(empresaId, arquivo.buffer, arquivo.originalname);
    return {
      colunas: p.colunas, ignoradas: p.ignoradas,
      resumo: { novos: p.linhas.filter((l) => l.acao === 'novo').length, atualizar: p.linhas.filter((l) => l.acao === 'atualizar').length, erros: p.linhas.filter((l) => l.acao === 'erro').length },
      linhas: p.linhas.map(({ dados: _d, ...l }) => l),
    };
  }

  async importar(consultoriaId: string, empresaId: string, arquivo?: Express.Multer.File) {
    await this.empresa(consultoriaId, empresaId);
    if (!arquivo) throw new BadRequestException('Escolha a planilha.');
    const p = await this.planejar(empresaId, arquivo.buffer, arquivo.originalname);
    const validas = p.linhas.filter((l) => l.acao !== 'erro');
    conferirFuncionarios(await this.prisma.colaborador.count({ where: { empresaId } }), validas.filter((l) => l.acao === 'novo').length);
    await this.prisma.$transaction(validas.map((l) => l.acao === 'atualizar'
      ? this.prisma.colaborador.update({ where: { id: l.colaboradorId! }, data: l.dados })
      : this.prisma.colaborador.create({ data: { cargo: 'A definir', ...l.dados, empresaId } })));
    return { criados: validas.filter((l) => l.acao === 'novo').length, atualizados: validas.filter((l) => l.acao === 'atualizar').length, ignorados: p.linhas.length - validas.length };
  }

  // ---------- Terceiros ----------

  async listarTerceiros(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    const hoje = Date.now();
    const lista = await this.prisma.terceiro.findMany({
      where: { empresaId }, orderBy: { razaoSocial: 'asc' },
      include: { documentos: { orderBy: { tipo: 'asc' } }, trabalhadores: { orderBy: { nome: 'asc' } } },
    });
    const situacao = (v: Date | null) => (!v ? 'sem-validade' : v.getTime() < hoje ? 'vencido' : v.getTime() - hoje < 30 * DIA ? 'vencendo' : 'ok');
    return lista.map((t) => {
      const docs = t.documentos.map((d) => ({ ...d, situacao: situacao(d.validade) }));
      const trab = t.trabalhadores.map((w) => {
        const treinos = (w.treinamentos as { nome: string; validade?: string }[]).map((x) => ({ ...x, situacao: situacao(x.validade ? new Date(x.validade) : null) }));
        const pend: string[] = [];
        if (!w.asoValidade) pend.push('sem ASO'); else if (situacao(w.asoValidade) === 'vencido') pend.push('ASO vencido');
        if (!w.integracao) pend.push('sem integração');
        for (const x of treinos) if (x.situacao === 'vencido') pend.push(`${x.nome} vencido`);
        return { ...w, treinamentos: treinos, pendencias: pend, liberado: pend.length === 0 };
      });
      const faltando = DOCUMENTOS_TERCEIRO.slice(0, 5).filter((tipo) => !docs.some((d) => d.tipo === tipo));
      const vencidos = docs.filter((d) => d.situacao === 'vencido').map((d) => d.tipo);
      const contratoVencido = t.fim ? t.fim.getTime() < hoje : false;
      return { ...t, documentos: docs, trabalhadores: trab, faltando, vencidos, contratoVencido, liberada: !faltando.length && !vencidos.length && !contratoVencido };
    });
  }

  private async terceiro(consultoriaId: string, empresaId: string, id: string) {
    const t = await this.prisma.terceiro.findFirst({ where: { id, empresaId, empresa: { consultoriaId } } });
    if (!t) throw new NotFoundException('Empresa terceirizada não encontrada');
    return t;
  }

  async salvarTerceiro(consultoriaId: string, empresaId: string, dto: TerceiroDto, id?: string) {
    await this.empresa(consultoriaId, empresaId);
    const data = { ...dto, inicio: dataOuNulo(dto.inicio), fim: dataOuNulo(dto.fim) };
    if (data.inicio && data.fim && data.fim < data.inicio) throw new BadRequestException('O fim do contrato é antes do início.');
    if (id) { await this.terceiro(consultoriaId, empresaId, id); return this.prisma.terceiro.update({ where: { id }, data }); }
    return this.prisma.terceiro.create({ data: { ...data, empresaId } });
  }

  async removerTerceiro(consultoriaId: string, empresaId: string, id: string) {
    await this.terceiro(consultoriaId, empresaId, id);
    await this.prisma.terceiro.delete({ where: { id } });
    return { ok: true };
  }

  async adicionarDocumento(consultoriaId: string, empresaId: string, id: string, dto: TerceiroDocumentoDto) {
    await this.terceiro(consultoriaId, empresaId, id);
    return this.prisma.terceiroDocumento.create({ data: { terceiroId: id, tipo: dto.tipo, validade: dataOuNulo(dto.validade), observacao: dto.observacao } });
  }

  async removerDocumento(consultoriaId: string, empresaId: string, id: string, docId: string) {
    await this.terceiro(consultoriaId, empresaId, id);
    const { count } = await this.prisma.terceiroDocumento.deleteMany({ where: { id: docId, terceiroId: id } });
    if (!count) throw new NotFoundException('Documento não encontrado');
    return { ok: true };
  }

  async salvarTrabalhador(consultoriaId: string, empresaId: string, id: string, dto: TerceiroTrabalhadorDto, trabId?: string) {
    await this.terceiro(consultoriaId, empresaId, id);
    if (dto.cpf && !cpfValido(dto.cpf)) throw new BadRequestException('CPF inválido.');
    const data = {
      nome: dto.nome, cpf: dto.cpf ? formatarCpf(digitos(dto.cpf)) : null, funcao: dto.funcao ?? null,
      asoValidade: dataOuNulo(dto.asoValidade), integracao: dataOuNulo(dto.integracao),
      treinamentos: (dto.treinamentos ?? []).map((t) => ({ nome: t.nome, ...(t.validade ? { validade: t.validade.slice(0, 10) } : {}) })) as Prisma.InputJsonValue,
    };
    if (trabId) {
      const { count } = await this.prisma.terceiroTrabalhador.updateMany({ where: { id: trabId, terceiroId: id }, data });
      if (!count) throw new NotFoundException('Trabalhador não encontrado');
      return this.prisma.terceiroTrabalhador.findUnique({ where: { id: trabId } });
    }
    return this.prisma.terceiroTrabalhador.create({ data: { ...data, terceiroId: id } });
  }

  async removerTrabalhador(consultoriaId: string, empresaId: string, id: string, trabId: string) {
    await this.terceiro(consultoriaId, empresaId, id);
    const { count } = await this.prisma.terceiroTrabalhador.deleteMany({ where: { id: trabId, terceiroId: id } });
    if (!count) throw new NotFoundException('Trabalhador não encontrado');
    return { ok: true };
  }

  // ---------- Atestados e absenteísmo ----------

  async listarAtestados(consultoriaId: string, empresaId: string, ano: number) {
    await this.empresa(consultoriaId, empresaId);
    return this.prisma.atestado.findMany({
      where: { empresaId, inicio: { gte: new Date(Date.UTC(ano - 1, 11, 1)), lt: new Date(Date.UTC(ano + 1, 0, 1)) } },
      orderBy: { inicio: 'desc' }, include: { colaborador: { select: { nome: true } } },
    }).then((l) => l.filter((a) => fimAtestado(a).getUTCFullYear() >= ano && a.inicio.getUTCFullYear() <= ano));
  }

  async criarAtestado(consultoriaId: string, empresaId: string, dto: AtestadoDto) {
    await this.empresa(consultoriaId, empresaId);
    const col = await this.prisma.colaborador.findFirst({ where: { id: dto.colaboradorId, empresaId } });
    if (!col) throw new NotFoundException('Funcionário não encontrado nesta empresa');
    if (!dto.dias && !dto.horas) throw new BadRequestException('Informe os dias ou as horas do atestado.');
    const inicio = dataOuNulo(dto.inicio)!;
    const fim = fimAtestado({ inicio, dias: dto.dias });
    if (dto.dias > 0) {
      const outros = await this.prisma.atestado.findMany({ where: { colaboradorId: col.id, dias: { gt: 0 }, inicio: { lte: fim, gte: new Date(inicio.getTime() - 366 * DIA) } } });
      const choca = outros.find((o) => fimAtestado(o) >= inicio);
      if (choca) throw new BadRequestException(`Já existe atestado de ${col.nome} nesses dias (a partir de ${choca.inicio.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}).`);
    }
    return this.prisma.atestado.create({ data: { ...dto, cid: dto.cid ? dto.cid.toUpperCase() : null, inicio, empresaId } });
  }

  async removerAtestado(consultoriaId: string, empresaId: string, id: string) {
    await this.empresa(consultoriaId, empresaId);
    const { count } = await this.prisma.atestado.deleteMany({ where: { id, empresaId } });
    if (!count) throw new NotFoundException('Atestado não encontrado');
    return { ok: true };
  }

  async absenteismo(consultoriaId: string, empresaId: string, ano: number) {
    const empresa = await this.empresa(consultoriaId, empresaId);
    const [colaboradores, atestados, recentes] = await Promise.all([
      this.prisma.colaborador.findMany({ where: { empresaId }, select: { id: true, nome: true, dataAdmissao: true, ghe: { select: { nome: true } } } }),
      this.listarAtestados(consultoriaId, empresaId, ano),
      this.prisma.atestado.findMany({ where: { empresaId, inicio: { gte: new Date(Date.now() - 180 * DIA) } } }),
    ]);
    const afastados = await this.prisma.afastamento.findMany({ where: { empresaId, fim: null }, select: { colaboradorId: true } });
    const jaAfastado = new Set(afastados.map((a) => a.colaboradorId));
    return {
      ...indicadores(ano, empresa.jornadaDiariaHoras, colaboradores, atestados),
      alertasInss: alertasInss(colaboradores, recentes).map((a) => ({ ...a, jaAfastado: jaAfastado.has(a.colaboradorId) })),
    };
  }

  async salvarJornada(consultoriaId: string, empresaId: string, horas: number) {
    await this.empresa(consultoriaId, empresaId);
    await this.prisma.empresa.update({ where: { id: empresaId }, data: { jornadaDiariaHoras: horas } });
    return { jornadaDiariaHoras: horas };
  }
}
