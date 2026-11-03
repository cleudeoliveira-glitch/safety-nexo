import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'crypto';
import * as QRCode from 'qrcode';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { cifrar, decifrar } from '../esocial/cifra';
import { PrismaService } from '../prisma/prisma.service';
import { registrarEntrega } from '../estoque/baixa';
import { novoCodigo } from '../treinamentos/treinamentos.service';
import { configFacial, descritorValido, menorDistancia, TEXTO_CONSENTIMENTO } from './calculo';
import { CadastrarRostoDto, CapturaDto, EntregaRostoDto } from './dto';
import { comprovanteHtml } from './template';

const WEB = () => process.env.WEB_ORIGIN ?? 'http://localhost:3000';
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
type Origem = { ip: string | null; aparelho: string | null };

@Injectable()
export class RostoService {
  constructor(private readonly prisma: PrismaService, private readonly contexto: ContextoDocumentoService, private readonly pdf: PdfService) {}

  config() {
    return { ...configFacial(), textoConsentimento: TEXTO_CONSENTIMENTO };
  }

  private ativo() {
    if (!configFacial().ativo) throw new BadRequestException('O reconhecimento facial está desligado neste servidor.');
  }

  private async empresa(c: string, e: string) {
    const empresa = await this.prisma.empresa.findFirst({ where: { id: e, consultoriaId: c } });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    return empresa;
  }

  private async colaborador(c: string, e: string, id: string) {
    await this.empresa(c, e);
    const col = await this.prisma.colaborador.findFirst({ where: { id, empresaId: e }, include: { rosto: true } });
    if (!col) throw new NotFoundException('Colaborador não encontrado');
    return col;
  }

  private amostras(cifrado: string): number[][] {
    return JSON.parse(decifrar(cifrado).toString('utf8'));
  }

  async listar(c: string, e: string) {
    await this.empresa(c, e);
    const cols = await this.prisma.colaborador.findMany({ where: { empresaId: e }, select: { id: true, nome: true, cargo: true, rosto: { select: { consentimentoEm: true } } }, orderBy: { nome: 'asc' } });
    return cols.map((x) => ({ id: x.id, nome: x.nome, cargo: x.cargo, cadastrado: !!x.rosto, consentimentoEm: x.rosto?.consentimentoEm ?? null }));
  }

  async status(c: string, e: string, id: string) {
    const col = await this.colaborador(c, e, id);
    return { cadastrado: !!col.rosto, consentimentoEm: col.rosto?.consentimentoEm ?? null, hash: col.rosto?.hash ?? null };
  }

  async cadastrar(c: string, e: string, id: string, dto: CadastrarRostoDto, origem: Origem) {
    this.ativo();
    const cfg = configFacial();
    if (!dto.descritores.every(descritorValido)) throw new BadRequestException('Leitura do rosto inválida. Tente de novo.');
    const col = await this.colaborador(c, e, id);
    // Cadastrar de novo mantém a autorização já dada; o primeiro cadastro exige a autorização.
    if (cfg.consentimentoObrigatorio && !dto.consentimento && !col.rosto) throw new BadRequestException('Marque a autorização do funcionário (LGPD) antes de cadastrar o rosto.');
    // O mesmo rosto não pode ficar em dois funcionários da empresa.
    const outro = await this.melhor(e, dto.descritores[0], id);
    if (outro && outro.distancia < cfg.limiar) throw new ConflictException(`Este rosto já está cadastrado para ${outro.nome}.`);
    const texto = JSON.stringify(dto.descritores.map((d) => d.map((x) => Number(x.toFixed(6)))));
    const rosto = { descritores: cifrar(texto), hash: sha(texto) };
    const consentimento = { consentimentoEm: new Date(), consentimentoTexto: TEXTO_CONSENTIMENTO, consentimentoIp: origem.ip };
    await this.prisma.rostoColaborador.upsert({
      where: { colaboradorId: id },
      create: { colaboradorId: id, ...rosto, ...consentimento },
      update: { ...rosto, ...(dto.consentimento ? consentimento : {}) },
    });
    return this.status(c, e, id);
  }

  async remover(c: string, e: string, id: string) {
    await this.colaborador(c, e, id);
    await this.prisma.rostoColaborador.deleteMany({ where: { colaboradorId: id } });
    return { cadastrado: false };
  }

  // Procura o rosto entre os funcionários cadastrados da empresa.
  private async melhor(empresaId: string, d: number[], exceto?: string) {
    const rostos = await this.prisma.rostoColaborador.findMany({ where: { colaborador: { empresaId }, ...(exceto ? { colaboradorId: { not: exceto } } : {}) }, include: { colaborador: { select: { nome: true, cargo: true, cpf: true } } } });
    let achado: { colaboradorId: string; nome: string; cargo: string; distancia: number } | null = null;
    for (const r of rostos) {
      const dist = menorDistancia(d, this.amostras(r.descritores));
      if (!achado || dist < achado.distancia) achado = { colaboradorId: r.colaboradorId, nome: r.colaborador.nome, cargo: r.colaborador.cargo, distancia: dist };
    }
    return achado;
  }

  async identificar(c: string, e: string, d: number[]) {
    this.ativo();
    await this.empresa(c, e);
    const m = await this.melhor(e, d);
    if (!m || m.distancia >= configFacial().limiar) return { encontrado: false as const };
    return { encontrado: true as const, ...m, distancia: Number(m.distancia.toFixed(4)) };
  }

  // Confere o que vem do aparelho antes de comparar o rosto.
  private captura(dto: CapturaDto) {
    if (configFacial().provaDeVida && !dto.provaDeVida) throw new BadRequestException('Falta a prova de vida: a pessoa precisa piscar os olhos na frente da câmera.');
    if (!dto.capturadoEm) return null;
    const em = new Date(dto.capturadoEm);
    const agora = Date.now();
    if (em.getTime() > agora + 5 * 60_000) throw new BadRequestException('A data da captura está no futuro. Confira o relógio do aparelho.');
    if (em.getTime() < agora - 30 * 86_400_000) throw new BadRequestException('Captura sem internet com mais de 30 dias. Faça de novo.');
    return em;
  }

  private async registrar(empresaId: string, colaboradorId: string, tipo: string, refId: string, dist: number, dto: CapturaDto & { fotoItem?: string }, origem: Origem, item: unknown) {
    const quando = new Date();
    const capturadoEm = dto.capturadoEm ? new Date(dto.capturadoEm) : null;
    const base = { colaboradorId, tipo, refId, item, distancia: Number(dist.toFixed(4)), foto: sha(dto.foto), fotoItem: dto.fotoItem ? sha(dto.fotoItem) : null, latitude: dto.latitude ?? null, longitude: dto.longitude ?? null, provaDeVida: !!dto.provaDeVida, capturadoEm: capturadoEm?.toISOString() ?? null, quando: quando.toISOString() };
    return this.prisma.presencaFacial.create({
      data: {
        codigo: novoCodigo(), empresaId, colaboradorId, tipo, refId, foto: dto.foto, fotoItem: dto.fotoItem ?? null, distancia: base.distancia,
        latitude: dto.latitude ?? null, longitude: dto.longitude ?? null, precisaoM: dto.precisao ?? null, ip: origem.ip, aparelho: origem.aparelho?.slice(0, 300) ?? null,
        hash: sha(JSON.stringify(base)), provaDeVida: !!dto.provaDeVida, capturadoEm, createdAt: quando,
      },
    });
  }

  private conferir(col: { rosto: { descritores: string } | null }, d: number[]) {
    if (!col.rosto) throw new BadRequestException('Este funcionário ainda não tem o rosto cadastrado.');
    const dist = menorDistancia(d, this.amostras(col.rosto.descritores));
    if (dist >= configFacial().limiar) throw new UnprocessableEntityException('O rosto não confere com o cadastro deste funcionário. Tente de novo com boa luz, ou use a assinatura.');
    return dist;
  }

  async entregarEpi(c: string, e: string, id: string, dto: EntregaRostoDto, origem: Origem) {
    this.ativo();
    const capturadoEm = this.captura(dto);
    const col = await this.colaborador(c, e, id);
    const dist = this.conferir(col, dto.descritor);
    const dia = (capturadoEm ?? new Date()).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const entrega = await registrarEntrega(this.prisma, e, {
      colaboradorId: id, estoqueId: dto.estoqueId, epi: dto.epi?.trim(), ca: dto.ca?.trim(), validadeCa: dto.validadeCa ? new Date(dto.validadeCa) : null,
      quantidade: dto.quantidade ?? 1, motivo: dto.motivo, dataEntrega: new Date(`${dia}T00:00:00Z`),
    });
    const p = await this.registrar(e, id, 'EPI', entrega.id, dist, dto, origem, { epi: entrega.epi, ca: entrega.ca, quantidade: entrega.quantidade, motivo: entrega.motivo });
    return { entrega, codigo: p.codigo, distancia: p.distancia };
  }

  async presencaDds(c: string, e: string, ddsId: string, dto: CapturaDto, origem: Origem) {
    this.ativo();
    this.captura(dto);
    await this.empresa(c, e);
    const dds = await this.prisma.dds.findFirst({ where: { id: ddsId, empresaId: e } });
    if (!dds) throw new NotFoundException('DDS não encontrado');
    const m = await this.melhor(e, dto.descritor);
    if (!m || m.distancia >= configFacial().limiar) throw new UnprocessableEntityException('Rosto não reconhecido entre os funcionários cadastrados.');
    const ja = await this.prisma.presencaFacial.findFirst({ where: { tipo: 'DDS', refId: ddsId, colaboradorId: m.colaboradorId } });
    if (ja) return { colaboradorId: m.colaboradorId, nome: m.nome, codigo: ja.codigo, repetido: true };
    if (!dds.participantes.includes(m.colaboradorId)) await this.prisma.dds.update({ where: { id: ddsId }, data: { participantes: { push: m.colaboradorId } } });
    const p = await this.registrar(e, m.colaboradorId, 'DDS', ddsId, m.distancia, dto, origem, { tema: dds.tema, data: dds.data });
    return { colaboradorId: m.colaboradorId, nome: m.nome, codigo: p.codigo, repetido: false };
  }

  async presencaTurma(c: string, e: string, turmaId: string, dto: CapturaDto, origem: Origem) {
    this.ativo();
    this.captura(dto);
    await this.empresa(c, e);
    const turma = await this.prisma.turma.findFirst({ where: { id: turmaId, empresaId: e } });
    if (!turma) throw new NotFoundException('Turma não encontrada');
    const m = await this.melhor(e, dto.descritor);
    if (!m || m.distancia >= configFacial().limiar) throw new UnprocessableEntityException('Rosto não reconhecido entre os funcionários cadastrados.');
    const ja = await this.prisma.presencaFacial.findFirst({ where: { tipo: 'TREINAMENTO', refId: turmaId, colaboradorId: m.colaboradorId } });
    if (ja) return { colaboradorId: m.colaboradorId, nome: m.nome, codigo: ja.codigo, repetido: true };
    await this.prisma.participacao.upsert({ where: { turmaId_colaboradorId: { turmaId, colaboradorId: m.colaboradorId } }, create: { turmaId, colaboradorId: m.colaboradorId, codigo: novoCodigo() }, update: {} });
    const p = await this.registrar(e, m.colaboradorId, 'TREINAMENTO', turmaId, m.distancia, dto, origem, { turma: turma.nome, norma: turma.norma });
    return { colaboradorId: m.colaboradorId, nome: m.nome, codigo: p.codigo, repetido: false };
  }

  async comprovantes(c: string, e: string, tipo: string, refId: string) {
    await this.empresa(c, e);
    const l = await this.prisma.presencaFacial.findMany({ where: { empresaId: e, tipo, refId }, include: { colaborador: { select: { nome: true } } }, orderBy: { createdAt: 'asc' } });
    return l.map((p) => ({ codigo: p.codigo, colaboradorId: p.colaboradorId, nome: p.colaborador.nome, em: p.createdAt }));
  }

  private async item(p: { tipo: string; refId: string }) {
    if (p.tipo === 'EPI') {
      const x = await this.prisma.entregaEpi.findUnique({ where: { id: p.refId } });
      return x ? { titulo: 'entrega de EPI', linhas: [['EPI', x.epi], ['CA', x.ca], ['Validade do CA', x.validadeCa ? x.validadeCa.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'], ['Quantidade', String(x.quantidade)], ['Motivo', ({ ENTREGA_INICIAL: 'Entrega inicial', DESGASTE: 'Troca por desgaste', PERDA: 'Troca por perda', DANO: 'Troca por dano' } as Record<string, string>)[x.motivo] ?? x.motivo]] as [string, string][] } : null;
    }
    if (p.tipo === 'DDS') {
      const x = await this.prisma.dds.findUnique({ where: { id: p.refId } });
      return x ? { titulo: 'presença em DDS', linhas: [['Tema', x.tema], ['Data do DDS', x.data.toLocaleDateString('pt-BR', { timeZone: 'UTC' })], ['Ministrante', x.ministrante]] as [string, string][] } : null;
    }
    const x = await this.prisma.turma.findUnique({ where: { id: p.refId } });
    return x ? { titulo: 'presença em treinamento', linhas: [['Treinamento', x.nome], ['Norma', x.norma ?? '-'], ['Carga horária', `${x.cargaHoraria} h`], ['Instrutor', x.instrutor]] as [string, string][] } : null;
  }

  async pdfComprovante(c: string, e: string, codigo: string) {
    await this.empresa(c, e);
    const p = await this.prisma.presencaFacial.findFirst({ where: { codigo: codigo.toUpperCase(), empresaId: e }, include: { colaborador: true } });
    if (!p) throw new NotFoundException('Comprovante não encontrado');
    const item = await this.item(p);
    const { empresa, logoEmpresa, consultoria } = await this.contexto.carregar(c, e, 'COMPROVANTE_FACIAL');
    const url = `${WEB()}/validar-rosto/${p.codigo}`;
    const titulo = `Comprovante de ${item?.titulo ?? 'registro'} por reconhecimento facial`;
    return this.pdf.render(comprovanteHtml(
      { titulo, logoEmpresa, consultoria, aviso: 'Documento gerado pelo Safety Nexo. Confira a autenticidade pelo QR Code.', infos: [['Empresa', empresa.razaoSocial], ['CNPJ', empresa.cnpj]] },
      { ...p, colaborador: { nome: p.colaborador.nome, cpf: p.colaborador.cpf, cargo: p.colaborador.cargo }, item: item?.linhas ?? [], tipo: p.tipo, limiar: configFacial().limiar, url, qr: await QRCode.toDataURL(url, { margin: 0, width: 200 }) },
    ));
  }

  // Consulta pública do QR Code: confirma o registro sem mostrar a foto.
  async validar(codigo: string) {
    const p = await this.prisma.presencaFacial.findUnique({ where: { codigo: codigo.toUpperCase() }, include: { colaborador: { include: { empresa: true } } } });
    if (!p) throw new NotFoundException('Comprovante não encontrado. Confira o código.');
    const item = await this.item(p);
    const cpf = p.colaborador.cpf?.replace(/\D/g, '');
    return {
      codigo: p.codigo, tipo: p.tipo, titulo: item?.titulo ?? 'registro', itens: item?.linhas ?? [],
      colaborador: p.colaborador.nome, cpf: cpf && cpf.length === 11 ? `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**` : null,
      empresa: p.colaborador.empresa.razaoSocial, em: p.capturadoEm ?? p.createdAt, semInternet: !!p.capturadoEm, provaDeVida: p.provaDeVida, hash: p.hash, comLocal: p.latitude != null,
    };
  }
}
