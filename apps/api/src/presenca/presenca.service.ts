import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { novoCodigo } from '../treinamentos/treinamentos.service';
import { AssinarPresencaDto } from './dto';

import { TipoLista } from './consulta';
export type { TipoLista } from './consulta';
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const mascarar = (cpf: string | null) => { const d = cpf?.replace(/\D/g, ''); return d && d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : null; };
type Origem = { ip: string | null; aparelho: string | null };

@Injectable()
export class PresencaService {
  constructor(private readonly prisma: PrismaService) {}

  private async empresa(c: string, e: string) {
    const x = await this.prisma.empresa.findFirst({ where: { id: e, consultoriaId: c } });
    if (!x) throw new NotFoundException('Empresa não encontrada');
  }

  // O evento (DDS ou turma) e quem deve assinar.
  private async evento(c: string, e: string, tipo: TipoLista, refId: string) {
    await this.empresa(c, e);
    if (tipo === 'DDS') {
      const d = await this.prisma.dds.findFirst({ where: { id: refId, empresaId: e } });
      if (!d) throw new NotFoundException('DDS não encontrado');
      return { titulo: d.tema, subtitulo: `DDS de ${d.data.toLocaleDateString('pt-BR', { timeZone: 'UTC' })} · ${d.duracaoMin} min`, responsavel: d.ministrante, ids: d.participantes };
    }
    const t = await this.prisma.turma.findFirst({ where: { id: refId, empresaId: e }, include: { participantes: true } });
    if (!t) throw new NotFoundException('Turma não encontrada');
    return { titulo: `${t.norma ? `${t.norma} · ` : ''}${t.nome}`, subtitulo: `${t.cargaHoraria} h · ${t.local}`, responsavel: t.instrutor, ids: t.participantes.map((p) => p.colaboradorId) };
  }

  async lista(c: string, e: string, tipo: TipoLista, refId: string) {
    const ev = await this.evento(c, e, tipo, refId);
    const [cols, assinaturas, todos] = await Promise.all([
      this.prisma.colaborador.findMany({ where: { id: { in: ev.ids }, empresaId: e }, select: { id: true, nome: true, cpf: true, cargo: true, foto: { select: { imagem: true } } }, orderBy: { nome: 'asc' } }),
      this.prisma.assinaturaPresenca.findMany({ where: { tipo, refId }, select: { colaboradorId: true, assinadoEm: true, testemunha: true } }),
      this.prisma.colaborador.count({ where: { empresaId: e } }),
    ]);
    const pessoas = cols.map((p) => {
      const a = assinaturas.find((x) => x.colaboradorId === p.id);
      return { colaboradorId: p.id, nome: p.nome, cargo: p.cargo, cpf: mascarar(p.cpf), foto: p.foto?.imagem ?? null, assinadoEm: a?.assinadoEm ?? null, testemunha: a?.testemunha ?? null };
    });
    return { titulo: ev.titulo, subtitulo: ev.subtitulo, responsavel: ev.responsavel, pessoas, assinadas: assinaturas.length, foraDaLista: todos - pessoas.length };
  }

  // "Marcar todos": coloca todos os funcionários da empresa na lista. Quem não assinar sai como falta.
  async marcarTodos(c: string, e: string, tipo: TipoLista, refId: string) {
    const ev = await this.evento(c, e, tipo, refId);
    const ids = (await this.prisma.colaborador.findMany({ where: { empresaId: e }, select: { id: true } })).map((x) => x.id);
    const novos = ids.filter((id) => !ev.ids.includes(id));
    if (tipo === 'DDS') await this.prisma.dds.update({ where: { id: refId }, data: { participantes: { push: novos } } });
    else await this.prisma.participacao.createMany({ data: novos.map((colaboradorId) => ({ turmaId: refId, colaboradorId, codigo: novoCodigo() })), skipDuplicates: true });
    return this.lista(c, e, tipo, refId);
  }

  async assinar(c: string, e: string, tipo: TipoLista, refId: string, colaboradorId: string, dto: AssinarPresencaDto, origem: Origem) {
    const ev = await this.evento(c, e, tipo, refId);
    if (!ev.ids.includes(colaboradorId)) throw new BadRequestException('Esta pessoa não está na lista. Inclua antes de assinar.');
    const ja = await this.prisma.assinaturaPresenca.findUnique({ where: { tipo_refId_colaboradorId: { tipo, refId, colaboradorId } } });
    if (ja) throw new ConflictException('Esta pessoa já assinou.');
    const assinadoEm = dto.assinadoEm ? new Date(dto.assinadoEm) : new Date();
    if (assinadoEm.getTime() > Date.now() + 5 * 60_000) throw new BadRequestException('A hora da assinatura está no futuro. Confira o relógio do aparelho.');
    if (assinadoEm.getTime() < Date.now() - 30 * 86_400_000) throw new BadRequestException('Assinatura feita sem internet há mais de 30 dias. Peça para assinar de novo.');
    const testemunha = dto.aRogo ? ev.responsavel : null;
    const base = { tipo, refId, colaboradorId, imagem: sha(dto.imagem), foto: dto.foto ? sha(dto.foto) : null, testemunha, latitude: dto.latitude ?? null, longitude: dto.longitude ?? null, assinadoEm: assinadoEm.toISOString(), semInternet: !!dto.assinadoEm };
    await this.prisma.assinaturaPresenca.create({
      data: { tipo, refId, colaboradorId, imagem: dto.imagem, foto: dto.foto ?? null, testemunha, latitude: dto.latitude ?? null, longitude: dto.longitude ?? null, precisaoM: dto.precisao ?? null, ip: origem.ip, aparelho: origem.aparelho?.slice(0, 300) ?? null, hash: sha(JSON.stringify(base)), assinadoEm },
    });
    return this.lista(c, e, tipo, refId);
  }

  async salvarFoto(c: string, e: string, colaboradorId: string, imagem: string) {
    await this.empresa(c, e);
    const col = await this.prisma.colaborador.findFirst({ where: { id: colaboradorId, empresaId: e } });
    if (!col) throw new NotFoundException('Colaborador não encontrado');
    await this.prisma.fotoColaborador.upsert({ where: { colaboradorId }, create: { colaboradorId, imagem }, update: { imagem } });
    return { foto: imagem };
  }

  async apagarFoto(c: string, e: string, colaboradorId: string) {
    await this.empresa(c, e);
    await this.prisma.fotoColaborador.deleteMany({ where: { colaboradorId, colaborador: { empresaId: e } } });
    return { foto: null };
  }

  async foto(c: string, e: string, colaboradorId: string) {
    await this.empresa(c, e);
    const f = await this.prisma.fotoColaborador.findFirst({ where: { colaboradorId, colaborador: { empresaId: e } } });
    return { foto: f?.imagem ?? null };
  }
}

