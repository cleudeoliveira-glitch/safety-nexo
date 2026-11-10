import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { join } from 'path';
import * as QRCode from 'qrcode';
import { Guarda } from '../common/guarda';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { analisarFoto } from '../ia/ia';
import { PrismaService } from '../prisma/prisma.service';
import { AcaoDto, AtualizarAcaoDto, InvestigacaoDto, RelatoPublicoDto, TratarRelatoDto } from './dto';
import { cartazHtml, investigacaoHtml, planoAcaoHtml } from './templates';

const guarda = new Guarda('prevencao', process.env.PREVENCAO_DIR ?? join(__dirname, '..', '..', 'storage', 'prevencao'));
const WEB = () => (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');
const FOTOS = ['image/jpeg', 'image/png', 'image/webp'];
const ext = (mime: string) => (mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg');
export const linkRelato = (token: string) => `${WEB()}/relato/${token}`;

// Limite simples contra abuso da página pública: 20 relatos por hora por endereço.
const envios = new Map<string, number[]>();
function limitar(ip: string) {
  const agora = Date.now();
  const lista = (envios.get(ip) ?? []).filter((t) => agora - t < 3600_000);
  if (lista.length >= 20) throw new HttpException('Muitos relatos seguidos deste aparelho. Tente de novo mais tarde.', HttpStatus.TOO_MANY_REQUESTS);
  lista.push(agora);
  envios.set(ip, lista);
}

type Foto = Express.Multer.File | undefined;
function conferirFoto(f: Foto) {
  if (f && !FOTOS.includes(f.mimetype)) throw new BadRequestException('A foto precisa ser JPG, PNG ou WEBP.');
}

@Injectable()
export class PrevencaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
  ) {}

  private async empresa(consultoriaId: string, empresaId: string) {
    const e = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId } });
    if (!e) throw new NotFoundException('Empresa não encontrada');
    return e;
  }

  // ---------- Relatos pelo QR code ----------

  async qr(consultoriaId: string, empresaId: string, novo = false) {
    const e = await this.empresa(consultoriaId, empresaId);
    let token = e.relatoToken;
    if (!token || novo) {
      token = randomBytes(12).toString('base64url');
      await this.prisma.empresa.update({ where: { id: empresaId }, data: { relatoToken: token } });
    }
    const link = linkRelato(token);
    return { link, qr: await QRCode.toDataURL(link, { margin: 1, width: 600 }) };
  }

  async cartaz(consultoriaId: string, empresaId: string) {
    const { link, qr } = await this.qr(consultoriaId, empresaId);
    const { empresa, logoEmpresa, consultoria } = await this.contexto.carregar(consultoriaId, empresaId, 'CARTAZ_RELATO');
    return this.pdf.render(cartazHtml({ empresa: empresa.razaoSocial, logoEmpresa, consultoria, link, qr }));
  }

  private async porToken(token: string) {
    const e = await this.prisma.empresa.findUnique({ where: { relatoToken: token }, select: { id: true, razaoSocial: true, consultoria: { select: { nome: true, bloqueada: true } } } });
    if (!e || e.consultoria.bloqueada) throw new NotFoundException('Este QR code não está mais ativo. Avise a segurança do trabalho.');
    return e;
  }

  async publico(token: string) {
    const e = await this.porToken(token);
    const setores = await this.prisma.ghe.findMany({ where: { empresaId: e.id }, select: { nome: true }, orderBy: { nome: 'asc' } });
    return { empresa: e.razaoSocial, consultoria: e.consultoria.nome, setores: setores.map((s) => s.nome) };
  }

  async relatar(token: string, ip: string, d: RelatoPublicoDto, foto: Foto) {
    limitar(ip);
    conferirFoto(foto);
    const e = await this.porToken(token);
    const relato = await this.prisma.$transaction(async (tx) => {
      const ultimo = await tx.relato.findFirst({ where: { empresaId: e.id }, orderBy: { numero: 'desc' }, select: { numero: true } });
      return tx.relato.create({ data: { empresaId: e.id, numero: (ultimo?.numero ?? 0) + 1, tipo: d.tipo, descricao: d.descricao.trim(), local: d.local?.trim() || null, nome: d.tipo === 'DENUNCIA' ? null : d.nome?.trim() || null } });
    });
    if (foto) {
      const caminho = `relatos/${e.id}/${relato.id}.${ext(foto.mimetype)}`;
      await guarda.gravar(caminho, foto.buffer, foto.mimetype);
      await this.prisma.relato.update({ where: { id: relato.id }, data: { fotoPath: caminho } });
    }
    return { ok: true, numero: relato.numero };
  }

  // A empresa cliente não vê as denúncias: elas podem envolver a própria chefia.
  async relatos(consultoriaId: string, empresaId: string, ehEmpresa = false) {
    await this.empresa(consultoriaId, empresaId);
    const lista = await this.prisma.relato.findMany({ where: { empresaId, ...(ehEmpresa ? { tipo: { not: 'DENUNCIA' } } : {}) }, orderBy: { numero: 'desc' } });
    const acoes = await this.prisma.acaoCorretiva.findMany({ where: { empresaId, origem: 'RELATO' }, select: { origemId: true } });
    const comAcao = new Set(acoes.map((a) => a.origemId));
    return lista.map(({ fotoPath, ...r }) => ({ ...r, temFoto: !!fotoPath, acoes: comAcao.has(r.id) }));
  }

  private async relato(consultoriaId: string, empresaId: string, id: string, ehEmpresa = false) {
    await this.empresa(consultoriaId, empresaId);
    const r = await this.prisma.relato.findFirst({ where: { id, empresaId, ...(ehEmpresa ? { tipo: { not: 'DENUNCIA' } } : {}) } });
    if (!r) throw new NotFoundException('Relato não encontrado');
    return r;
  }

  async fotoRelato(consultoriaId: string, empresaId: string, id: string, ehEmpresa = false) {
    const r = await this.relato(consultoriaId, empresaId, id, ehEmpresa);
    if (!r.fotoPath) throw new NotFoundException('Este relato não tem foto');
    return { dados: await guarda.ler(r.fotoPath), tipo: r.fotoPath.endsWith('.png') ? 'image/png' : r.fotoPath.endsWith('.webp') ? 'image/webp' : 'image/jpeg' };
  }

  async tratar(consultoriaId: string, empresaId: string, id: string, d: TratarRelatoDto, ehEmpresa = false) {
    await this.relato(consultoriaId, empresaId, id, ehEmpresa);
    return this.prisma.relato.update({ where: { id }, data: { status: d.status, resposta: d.resposta?.trim() || null } });
  }

  async analisarRelato(consultoriaId: string, empresaId: string, id: string) {
    const r = await this.relato(consultoriaId, empresaId, id);
    if (!r.fotoPath) throw new BadRequestException('A análise da IA usa a foto, e este relato não tem foto.');
    const foto = await this.fotoRelato(consultoriaId, empresaId, id);
    const analise = await analisarFoto(foto, `${r.tipo.replace('_', ' ').toLowerCase()}: ${r.descricao}${r.local ? ` (local: ${r.local})` : ''}`);
    await this.prisma.relato.update({ where: { id }, data: { analiseIa: analise, status: r.status === 'NOVO' ? 'EM_ANALISE' : r.status } });
    return analise;
  }

  // ---------- Plano de ação ----------

  async acoes(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    const [proprias, psico] = await Promise.all([
      this.prisma.acaoCorretiva.findMany({ where: { empresaId }, orderBy: [{ status: 'asc' }, { prazo: 'asc' }, { criadoEm: 'desc' }] }),
      this.prisma.acaoPsicossocial.findMany({ where: { avaliacao: { empresaId } }, include: { avaliacao: { select: { titulo: true } } } }),
    ]);
    // As ações do psicossocial aparecem juntas, mas continuam sendo cuidadas na tela do psicossocial.
    const dePsico = psico.map((a) => ({
      id: a.id, empresaId, origem: 'PSICOSSOCIAL', origemId: a.avaliacaoId, origemTexto: `Psicossocial: ${a.avaliacao.titulo}`,
      descricao: a.acao, local: a.setor, responsavel: a.responsavel, prazo: a.prazo, prioridade: 'MEDIA', esforco: 'MEDIO',
      status: a.feita ? 'FEITA' : 'ABERTA', feitaEm: null, feitaPor: null, observacao: null, temEvidencia: false, criadoEm: a.criadoEm, somenteLeitura: true,
    }));
    return [...proprias.map(({ evidenciaPath, ...a }) => ({ ...a, temEvidencia: !!evidenciaPath, somenteLeitura: false })), ...dePsico];
  }

  async criarAcao(consultoriaId: string, empresaId: string, d: AcaoDto) {
    await this.empresa(consultoriaId, empresaId);
    return this.prisma.acaoCorretiva.create({
      data: {
        empresaId, descricao: d.descricao.trim(), local: d.local?.trim() || null, responsavel: d.responsavel?.trim() || null,
        prazo: d.prazo ? new Date(d.prazo) : null, prioridade: d.prioridade ?? 'MEDIA', esforco: d.esforco ?? 'MEDIO',
        origem: d.origem ?? 'MANUAL', origemId: d.origemId ?? null, origemTexto: d.origemTexto?.trim() || null,
      },
    });
  }

  private async acao(consultoriaId: string, empresaId: string, id: string) {
    await this.empresa(consultoriaId, empresaId);
    const a = await this.prisma.acaoCorretiva.findFirst({ where: { id, empresaId } });
    if (!a) throw new NotFoundException('Ação não encontrada');
    return a;
  }

  async atualizarAcao(consultoriaId: string, empresaId: string, id: string, quem: string, d: AtualizarAcaoDto) {
    const a = await this.acao(consultoriaId, empresaId, id);
    const fechando = d.status === 'FEITA' && a.status !== 'FEITA';
    const reabrindo = !!d.status && d.status !== 'FEITA' && a.status === 'FEITA';
    return this.prisma.acaoCorretiva.update({
      where: { id },
      data: {
        ...(d.descricao !== undefined ? { descricao: d.descricao.trim() } : {}),
        ...(d.responsavel !== undefined ? { responsavel: d.responsavel.trim() || null } : {}),
        ...(d.prazo !== undefined ? { prazo: d.prazo ? new Date(d.prazo) : null } : {}),
        ...(d.prioridade ? { prioridade: d.prioridade } : {}),
        ...(d.esforco ? { esforco: d.esforco } : {}),
        ...(d.observacao !== undefined ? { observacao: d.observacao.trim() || null } : {}),
        ...(d.status ? { status: d.status } : {}),
        ...(fechando ? { feitaEm: new Date(), feitaPor: quem } : {}),
        ...(reabrindo ? { feitaEm: null, feitaPor: null } : {}),
      },
    });
  }

  async removerAcao(consultoriaId: string, empresaId: string, id: string) {
    const a = await this.acao(consultoriaId, empresaId, id);
    if (a.evidenciaPath) await guarda.apagar(a.evidenciaPath).catch(() => undefined);
    await this.prisma.acaoCorretiva.delete({ where: { id } });
    return { ok: true };
  }

  async evidencia(consultoriaId: string, empresaId: string, id: string, foto: Foto) {
    if (!foto) throw new BadRequestException('Envie a foto de como ficou.');
    conferirFoto(foto);
    const a = await this.acao(consultoriaId, empresaId, id);
    const caminho = `acoes/${empresaId}/${a.id}.${ext(foto.mimetype)}`;
    if (a.evidenciaPath && a.evidenciaPath !== caminho) await guarda.apagar(a.evidenciaPath).catch(() => undefined);
    await guarda.gravar(caminho, foto.buffer, foto.mimetype);
    await this.prisma.acaoCorretiva.update({ where: { id }, data: { evidenciaPath: caminho } });
    return { ok: true };
  }

  async fotoEvidencia(consultoriaId: string, empresaId: string, id: string) {
    const a = await this.acao(consultoriaId, empresaId, id);
    if (!a.evidenciaPath) throw new NotFoundException('Esta ação não tem foto');
    return { dados: await guarda.ler(a.evidenciaPath), tipo: a.evidenciaPath.endsWith('.png') ? 'image/png' : a.evidenciaPath.endsWith('.webp') ? 'image/webp' : 'image/jpeg' };
  }

  // Cada item "não conforme" de uma inspeção vira uma ação (sem repetir as que já existem).
  async acoesDaInspecao(consultoriaId: string, empresaId: string, inspecaoId: string) {
    await this.empresa(consultoriaId, empresaId);
    const i = await this.prisma.inspecao.findFirst({ where: { id: inspecaoId, empresaId } });
    if (!i) throw new NotFoundException('Inspeção não encontrada');
    const ncs = (i.itens as { texto: string; resposta: string; observacao?: string }[]).filter((x) => x.resposta === 'NC');
    if (!ncs.length) throw new BadRequestException('Esta inspeção não tem itens não conformes.');
    const existentes = new Set((await this.prisma.acaoCorretiva.findMany({ where: { empresaId, origem: 'INSPECAO', origemId: inspecaoId }, select: { descricao: true } })).map((a) => a.descricao));
    const origemTexto = `Inspeção ${i.modelo} de ${i.data.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`;
    const novas = ncs.map((n) => `Corrigir: ${n.texto}${n.observacao ? ` (${n.observacao})` : ''}`).filter((t) => !existentes.has(t));
    await this.prisma.acaoCorretiva.createMany({ data: novas.map((descricao) => ({ empresaId, descricao, local: i.local, origem: 'INSPECAO', origemId: inspecaoId, origemTexto, prioridade: 'ALTA' })) });
    return { criadas: novas.length };
  }

  async pdfPlano(consultoriaId: string, empresaId: string) {
    const acoes = await this.acoes(consultoriaId, empresaId);
    const { empresa, logoEmpresa, consultoria } = await this.contexto.carregar(consultoriaId, empresaId, 'PLANO_ACAO');
    return this.pdf.render(planoAcaoHtml({ titulo: 'Plano de Ação', logoEmpresa, consultoria, infos: [['Empresa', empresa.razaoSocial], ['CNPJ', empresa.cnpj], ['Emitido em', new Date().toLocaleDateString('pt-BR')]] }, acoes));
  }

  // ---------- Investigação de acidente ----------

  async investigacoes(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    return this.prisma.investigacao.findMany({ where: { empresaId }, orderBy: { dataOcorrencia: 'desc' } });
  }

  async criarInvestigacao(consultoriaId: string, empresaId: string, d: InvestigacaoDto) {
    await this.empresa(consultoriaId, empresaId);
    if (d.catId && !(await this.prisma.cat.findFirst({ where: { id: d.catId, empresaId }, select: { id: true } }))) throw new BadRequestException('CAT não encontrada');
    if (d.relatoId && !(await this.prisma.relato.findFirst({ where: { id: d.relatoId, empresaId }, select: { id: true } }))) throw new BadRequestException('Relato não encontrado');
    return this.prisma.$transaction(async (tx) => {
      const inv = await tx.investigacao.create({
        data: {
          empresaId, catId: d.catId || null, relatoId: d.relatoId || null, titulo: d.titulo.trim(), dataOcorrencia: new Date(d.dataOcorrencia),
          local: d.local.trim(), descricao: d.descricao.trim(), equipe: d.equipe.trim(),
          porques: d.porques.map((p) => p.trim()).filter(Boolean), causas: d.causas.map((c) => ({ categoria: c.categoria, texto: c.texto.trim() })),
          conclusao: d.conclusao?.trim() || null,
        },
      });
      if (d.medidas.length) {
        await tx.acaoCorretiva.createMany({
          data: d.medidas.map((m) => ({
            empresaId, descricao: m.descricao.trim(), responsavel: m.responsavel?.trim() || null, prazo: m.prazo ? new Date(m.prazo) : null,
            prioridade: m.prioridade ?? 'ALTA', origem: 'INVESTIGACAO', origemId: inv.id, origemTexto: `Investigação: ${inv.titulo}`, local: inv.local,
          })),
        });
      }
      if (d.relatoId) await tx.relato.update({ where: { id: d.relatoId }, data: { status: 'EM_ANALISE' } });
      return inv;
    });
  }

  async removerInvestigacao(consultoriaId: string, empresaId: string, id: string) {
    await this.empresa(consultoriaId, empresaId);
    const inv = await this.prisma.investigacao.findFirst({ where: { id, empresaId } });
    if (!inv) throw new NotFoundException('Investigação não encontrada');
    await this.prisma.investigacao.delete({ where: { id } });
    return { ok: true };
  }

  async pdfInvestigacao(consultoriaId: string, empresaId: string, id: string) {
    await this.empresa(consultoriaId, empresaId);
    const inv = await this.prisma.investigacao.findFirst({ where: { id, empresaId } });
    if (!inv) throw new NotFoundException('Investigação não encontrada');
    const medidas = await this.prisma.acaoCorretiva.findMany({ where: { empresaId, origem: 'INVESTIGACAO', origemId: id }, orderBy: { criadoEm: 'asc' } });
    const cat = inv.catId ? await this.prisma.cat.findFirst({ where: { id: inv.catId }, include: { colaborador: { select: { nome: true } } } }) : null;
    const { empresa, logoEmpresa, consultoria } = await this.contexto.carregar(consultoriaId, empresaId, 'INVESTIGACAO');
    return this.pdf.render(investigacaoHtml(
      { titulo: 'Relatório de Investigação de Acidente', logoEmpresa, consultoria, infos: [['Empresa', empresa.razaoSocial], ['CNPJ', empresa.cnpj]], aviso: 'Esta investigação serve para entender as causas e evitar que aconteça de novo, não para procurar culpados.' },
      { ...inv, causas: inv.causas as { categoria: string; texto: string }[], vitima: cat?.colaborador.nome ?? null },
      medidas,
    ));
  }
}
