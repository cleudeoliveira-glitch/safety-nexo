import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';
import { P12Signer } from '@signpdf/signer-p12';
import signpdf from '@signpdf/signpdf';
import { createHash, randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PDFDocument } from 'pdf-lib';
import * as QRCode from 'qrcode';
import { ArquivoService } from '../arquivo/arquivo.service';
import { SessaoUsuario } from '../common/sessao.decorator';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { cpfValido } from '../esocial/eventos';
import { EsocialService } from '../esocial/esocial.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssinarDto, CriarPedidoDto } from './dto';
import { folhaHtml, mascararCpf } from './folha';

const WEB = () => (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');
const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const digitos = (v?: string | null) => (v ?? '').replace(/\D/g, '');
// Código curto para digitar, sem letras que se confundem (0/O, 1/I).
const codigoConferencia = () => Array.from(randomBytes(10), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');

@Injectable()
export class AssinaturasService {
  private readonly log = new Logger('Assinaturas');
  constructor(
    private readonly prisma: PrismaService,
    private readonly arquivo: ArquivoService,
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
    private readonly esocial: EsocialService,
  ) {}

  private async empresa(consultoriaId: string, empresaId: string) {
    const e = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId }, select: { id: true } });
    if (!e) throw new NotFoundException('Empresa não encontrada');
  }

  private linkDe(token: string) { return `${WEB()}/assinar/${token}`; }

  async listar(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    const lista = await this.prisma.pedidoAssinatura.findMany({ where: { empresaId }, orderBy: { criadoEm: 'desc' }, include: { signatarios: { orderBy: { ordem: 'asc' } } } });
    return lista.map((p) => ({
      ...p,
      signatarios: p.signatarios.map(({ imagem: _i, token, ...s }) => ({ ...s, link: p.status === 'ABERTO' && !s.assinadoEm ? this.linkDe(token) : null })),
    }));
  }

  async criar(sessao: SessaoUsuario, empresaId: string, dto: CriarPedidoDto) {
    await this.empresa(sessao.consultoriaId, empresaId);
    const { arquivo, conteudo } = await this.arquivo.lerInterno(empresaId, dto.arquivoId);
    if (arquivo.mime !== 'application/pdf') throw new BadRequestException('Só dá para pedir assinatura de PDF.');
    if (conteudo.includes('/ByteRange')) throw new BadRequestException('Este PDF já tem assinatura digital. Juntar a folha de assinaturas apagaria a assinatura que ele já tem.');
    for (const s of dto.signatarios) if (s.cpf && !cpfValido(s.cpf)) throw new BadRequestException(`CPF inválido de ${s.nome}.`);
    if (dto.icp) await this.esocial.credencial(sessao.consultoriaId); // avisa já se não houver certificado
    const usuario = await this.prisma.usuario.findUnique({ where: { id: sessao.sub }, select: { nome: true } });
    return this.prisma.pedidoAssinatura.create({
      data: {
        empresaId, arquivoId: arquivo.id, titulo: `${arquivo.titulo} (versão ${arquivo.versao})`, codigo: codigoConferencia(), hashOriginal: sha256(conteudo), icp: !!dto.icp,
        criadoPorNome: usuario?.nome ?? '—',
        signatarios: { create: dto.signatarios.map((s, i) => ({ ordem: i + 1, nome: s.nome.trim(), cpf: s.cpf ? digitos(s.cpf) : null, papel: s.papel.trim(), token: randomBytes(24).toString('base64url') })) },
      },
      include: { signatarios: true },
    });
  }

  private async registrar(pedidoId: string, signatarioId: string, dto: AssinarDto, extra: { ip: string | null; navegador: string | null; presencial: boolean }) {
    const { count } = await this.prisma.signatario.updateMany({
      where: { id: signatarioId, pedidoId, assinadoEm: null, pedido: { status: 'ABERTO' } },
      data: { assinadoEm: new Date(), imagem: dto.imagem, latitude: dto.latitude ?? null, longitude: dto.longitude ?? null, precisao: dto.precisao ?? null, ip: extra.ip, navegador: extra.navegador?.slice(0, 300) ?? null, presencial: extra.presencial },
    });
    if (!count) throw new BadRequestException('Esta assinatura já foi feita ou o pedido foi encerrado.');
    const faltam = await this.prisma.signatario.count({ where: { pedidoId, assinadoEm: null } });
    if (!faltam) await this.concluir(pedidoId).catch((e) => this.log.error(`não concluiu ${pedidoId}: ${e.message}`));
    return { ok: true, faltam };
  }

  async assinarPresencial(sessao: SessaoUsuario, empresaId: string, pedidoId: string, signatarioId: string, dto: AssinarDto, ip: string | null, navegador: string | null) {
    await this.empresa(sessao.consultoriaId, empresaId);
    const p = await this.prisma.pedidoAssinatura.findFirst({ where: { id: pedidoId, empresaId } });
    if (!p) throw new NotFoundException('Pedido de assinatura não encontrado');
    return this.registrar(pedidoId, signatarioId, dto, { ip, navegador, presencial: true });
  }

  // ---------- Link público ----------

  private async porToken(token: string) {
    const s = await this.prisma.signatario.findUnique({ where: { token }, include: { pedido: { include: { empresa: { select: { razaoSocial: true, consultoria: { select: { nome: true } } } } } } } });
    if (!s) throw new NotFoundException('Link de assinatura não encontrado. Peça um novo a quem enviou.');
    return s;
  }

  async dadosDoLink(token: string) {
    const s = await this.porToken(token);
    return {
      titulo: s.pedido.titulo, empresa: s.pedido.empresa.razaoSocial, consultoria: s.pedido.empresa.consultoria.nome, status: s.pedido.status,
      nome: s.nome, papel: s.papel, pedeCpf: !!s.cpf, assinadoEm: s.assinadoEm, codigo: s.pedido.codigo,
    };
  }

  async documentoDoLink(token: string) {
    const s = await this.porToken(token);
    if (s.pedido.status === 'CANCELADO') throw new BadRequestException('Este pedido de assinatura foi cancelado.');
    return (await this.arquivo.lerInterno(s.pedido.empresaId, s.pedido.arquivoId)).conteudo;
  }

  async assinarPeloLink(token: string, dto: AssinarDto, ip: string | null, navegador: string | null) {
    const s = await this.porToken(token);
    if (s.cpf && digitos(dto.cpf) !== s.cpf) throw new BadRequestException('O CPF não confere com o de quem deve assinar.');
    return this.registrar(s.pedidoId, s.id, dto, { ip, navegador, presencial: false });
  }

  // ---------- Conclusão: PDF final ----------

  async concluir(pedidoId: string) {
    const p = await this.prisma.pedidoAssinatura.findUnique({ where: { id: pedidoId }, include: { signatarios: { orderBy: { ordem: 'asc' } }, empresa: { select: { consultoriaId: true } } } });
    if (!p || p.status !== 'ABERTO') return;
    if (p.signatarios.some((s) => !s.assinadoEm)) throw new BadRequestException('Ainda falta gente assinar.');
    // Trava: se duas pessoas terminarem juntas, só uma gera o PDF final.
    const { count } = await this.prisma.pedidoAssinatura.updateMany({ where: { id: p.id, status: 'ABERTO' }, data: { status: 'GERANDO' } });
    if (!count) return;
    try {
      await this.gerarFinal(p);
    } catch (e) {
      await this.prisma.pedidoAssinatura.update({ where: { id: p.id }, data: { status: 'ABERTO' } });
      throw e;
    }
  }

  private async gerarFinal(p: Prisma.PedidoAssinaturaGetPayload<{ include: { signatarios: true; empresa: { select: { consultoriaId: true } } } }>) {
    const { arquivo, conteudo } = await this.arquivo.lerInterno(p.empresaId, p.arquivoId);
    const consultoriaId = p.empresa.consultoriaId;
    let credencial: Awaited<ReturnType<EsocialService['credencial']>> | null = null;
    if (p.icp) credencial = await this.esocial.credencial(consultoriaId).catch(() => null);

    const { logoEmpresa, consultoria } = await this.contexto.carregar(consultoriaId, p.empresaId, 'ASSINATURA');
    const urlValidacao = `${WEB()}/assinatura/${p.codigo}`;
    const html = folhaHtml(
      { titulo: 'Folha de assinaturas', logoEmpresa, consultoria, infos: [], aviso: 'Folha gerada pelo Safety Nexo.' },
      { titulo: p.titulo, codigo: p.codigo, hashOriginal: p.hashOriginal, urlValidacao, qr: await QRCode.toDataURL(urlValidacao, { margin: 0, width: 200 }), icp: credencial?.aberto.titular ?? null },
      p.signatarios.map((s) => ({ ...s, assinadoEm: s.assinadoEm!, imagem: s.imagem ?? '' })),
    );
    const folha = await PDFDocument.load(await this.pdf.render(html));
    const doc = await PDFDocument.load(conteudo);
    for (const pg of await doc.copyPages(folha, folha.getPageIndices())) doc.addPage(pg);
    doc.setTitle(p.titulo); doc.setProducer('Safety Nexo');

    let final: Buffer;
    if (credencial) {
      pdflibAddPlaceholder({ pdfDoc: doc, reason: `Assinaturas conferidas. Código ${p.codigo}`, contactInfo: urlValidacao, name: credencial.aberto.titular, location: 'Brasil', signatureLength: 16_000 });
      const semAssinatura = Buffer.from(await doc.save({ useObjectStreams: false }));
      final = await signpdf.sign(semAssinatura, new P12Signer(credencial.pfx, { passphrase: credencial.senha }));
    } else {
      final = Buffer.from(await doc.save());
    }
    const nome = `${arquivo.nomeArquivo.replace(/\.pdf$/i, '')}-assinado.pdf`;
    const guardado = await this.arquivo.guardarAssinado(p.empresaId, p.id, `${arquivo.titulo} (assinado)`, arquivo.categoria, nome, final, 'Assinaturas');
    await this.prisma.pedidoAssinatura.update({ where: { id: p.id }, data: { status: 'CONCLUIDO', concluidoEm: new Date(), arquivoFinalId: guardado.id, hashFinal: sha256(final), icpTitular: credencial?.aberto.titular ?? null } });
  }

  async concluirManual(consultoriaId: string, empresaId: string, pedidoId: string) {
    await this.empresa(consultoriaId, empresaId);
    const p = await this.prisma.pedidoAssinatura.findFirst({ where: { id: pedidoId, empresaId } });
    if (!p) throw new NotFoundException('Pedido de assinatura não encontrado');
    if (p.status !== 'ABERTO') throw new BadRequestException('Este pedido já foi encerrado.');
    await this.concluir(pedidoId);
    return { ok: true };
  }

  async cancelar(consultoriaId: string, empresaId: string, pedidoId: string) {
    await this.empresa(consultoriaId, empresaId);
    const { count } = await this.prisma.pedidoAssinatura.updateMany({ where: { id: pedidoId, empresaId, status: 'ABERTO' }, data: { status: 'CANCELADO' } });
    if (!count) throw new BadRequestException('Só dá para cancelar pedido em aberto.');
    return { ok: true };
  }

  // ---------- Conferência pública ----------

  async conferir(codigo: string) {
    const p = await this.prisma.pedidoAssinatura.findUnique({ where: { codigo: codigo.toUpperCase() }, include: { signatarios: { orderBy: { ordem: 'asc' } }, empresa: { select: { razaoSocial: true, consultoria: { select: { nome: true } } } } } });
    if (!p) throw new NotFoundException('Código não encontrado. Confira se digitou certo.');
    return {
      titulo: p.titulo, empresa: p.empresa.razaoSocial, consultoria: p.empresa.consultoria.nome, status: p.status, criadoEm: p.criadoEm, concluidoEm: p.concluidoEm,
      hashOriginal: p.hashOriginal, hashFinal: p.hashFinal, icpTitular: p.icpTitular,
      signatarios: p.signatarios.map((s) => ({ nome: s.nome, cpf: mascararCpf(s.cpf), papel: s.papel, assinadoEm: s.assinadoEm, presencial: s.presencial, comLocalizacao: s.latitude !== null })),
    };
  }
}
