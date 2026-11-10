import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { LogosService } from '../logos/logos.service';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfiguracaoComercialDto, CriarCobrancaDto, CriarContratoDto, CriarPropostaDto, CriarServicoDto } from './dto';
import { chavePixValida, pixCopiaECola } from './pix';
import { cobrancaHtml, contratoHtml, ItemProposta, propostaHtml, totalItens } from './templates';

const dia = (iso: string) => new Date(iso.slice(0, 10));
const hoje = () => new Date(new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10));
const AVISO = 'Feito com o Safety Nexo.';

@Injectable()
export class ComercialService {
  constructor(private readonly prisma: PrismaService, private readonly pdf: PdfService, private readonly logos: LogosService) {}

  private async consultoria(id: string) {
    const c = await this.prisma.consultoria.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Consultoria não encontrada');
    return c;
  }

  private async empresa(consultoriaId: string, empresaId: string) {
    const e = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId } });
    if (!e) throw new NotFoundException('Empresa não encontrada');
    return e;
  }

  // Próximo número da sequência de cada documento comercial, por consultoria.
  private async proximo(tabela: 'proposta' | 'contrato' | 'servico', consultoriaId: string) {
    const ultimo = await (this.prisma[tabela] as unknown as { findFirst: (a: object) => Promise<{ numero: number } | null> })
      .findFirst({ where: { consultoriaId }, orderBy: { numero: 'desc' }, select: { numero: true } });
    return (ultimo?.numero ?? 0) + 1;
  }

  private async moldura(consultoriaId: string, titulo: string, logoEmpresaPath: string | null) {
    const c = await this.consultoria(consultoriaId);
    return {
      titulo, logoEmpresa: await this.logos.comoDataUri(logoEmpresaPath),
      consultoria: { nome: c.nome, logo: await this.logos.comoDataUri(c.logoPath) }, infos: [], aviso: AVISO,
    };
  }

  // ---------- configuração ----------
  async configuracao(consultoriaId: string) {
    const c = await this.consultoria(consultoriaId);
    return { nome: c.nome, cnpj: c.cnpj, cidade: c.cidade, pixChave: c.pixChave, pixNome: c.pixNome };
  }

  async salvarConfiguracao(consultoriaId: string, dto: ConfiguracaoComercialDto) {
    const limpo = (v?: string) => (v === undefined ? undefined : v.trim() || null);
    let chave = limpo(dto.pixChave);
    if (chave) {
      // E-mail e chave aleatória ficam como estão; CPF, CNPJ e celular (+55) perdem a pontuação.
      const aleatoria = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chave);
      if (chave.includes('@')) chave = chave.toLowerCase();
      else if (!aleatoria) chave = chave.startsWith('+') ? `+${chave.replace(/\D/g, '')}` : chave.replace(/\D/g, '');
      if (!chavePixValida(chave)) throw new BadRequestException('Chave Pix inválida. Use CPF, CNPJ, e-mail, celular com +55 ou a chave aleatória.');
    }
    await this.prisma.consultoria.update({
      where: { id: consultoriaId },
      data: { cnpj: limpo(dto.cnpj), cidade: limpo(dto.cidade), pixChave: chave, pixNome: limpo(dto.pixNome) },
    });
    return this.configuracao(consultoriaId);
  }

  async emailCobranca(consultoriaId: string, empresaId: string, email?: string) {
    await this.empresa(consultoriaId, empresaId);
    const valor = email?.trim().toLowerCase() || null;
    await this.prisma.empresa.update({ where: { id: empresaId }, data: { emailCobranca: valor } });
    return { emailCobranca: valor };
  }

  // ---------- propostas ----------
  async listarPropostas(consultoriaId: string) {
    const lista = await this.prisma.proposta.findMany({ where: { consultoriaId }, orderBy: { numero: 'desc' }, include: { contratos: { select: { id: true, numero: true } } } });
    return lista.map((p) => ({ ...p, total: totalItens(p.itens as ItemProposta[]) }));
  }

  async criarProposta(consultoriaId: string, dto: CriarPropostaDto) {
    let clienteNome = dto.clienteNome?.trim();
    let clienteCnpj = dto.clienteCnpj?.trim() || null;
    if (dto.empresaId) {
      const e = await this.empresa(consultoriaId, dto.empresaId);
      clienteNome = e.razaoSocial; clienteCnpj = e.cnpj;
    }
    if (!clienteNome) throw new BadRequestException('Escolha a empresa ou escreva o nome do cliente.');
    return this.prisma.proposta.create({
      data: {
        consultoriaId, numero: await this.proximo('proposta', consultoriaId), empresaId: dto.empresaId || null, clienteNome, clienteCnpj,
        clienteContato: dto.clienteContato?.trim() || null, data: dia(dto.data), validadeDias: dto.validadeDias ?? 15,
        itens: dto.itens.map((i) => ({ descricao: i.descricao.trim(), quantidade: i.quantidade, valorCentavos: i.valorCentavos })), observacoes: dto.observacoes?.trim() || null,
      },
    });
  }

  async statusProposta(consultoriaId: string, id: string, status: string) {
    const { count } = await this.prisma.proposta.updateMany({ where: { id, consultoriaId }, data: { status } });
    if (!count) throw new NotFoundException('Proposta não encontrada');
    return { ok: true };
  }

  async pdfProposta(consultoriaId: string, id: string) {
    const p = await this.prisma.proposta.findFirst({ where: { id, consultoriaId }, include: { empresa: true } });
    if (!p) throw new NotFoundException('Proposta não encontrada');
    const c = await this.consultoria(consultoriaId);
    const m = await this.moldura(consultoriaId, 'Proposta comercial', p.empresa?.logoPath ?? null);
    return this.pdf.render(propostaHtml(m, { ...p, itens: p.itens as ItemProposta[] }, c));
  }

  // ---------- contratos ----------
  listarContratos(consultoriaId: string) {
    return this.prisma.contrato.findMany({ where: { consultoriaId }, orderBy: { numero: 'desc' }, include: { empresa: { select: { razaoSocial: true } } } });
  }

  async criarContrato(consultoriaId: string, dto: CriarContratoDto) {
    await this.empresa(consultoriaId, dto.empresaId);
    if (dto.propostaId) {
      const p = await this.prisma.proposta.findFirst({ where: { id: dto.propostaId, consultoriaId } });
      if (!p) throw new NotFoundException('Proposta não encontrada');
      if (p.empresaId && p.empresaId !== dto.empresaId) throw new BadRequestException('A proposta é de outra empresa.');
      await this.prisma.proposta.update({ where: { id: p.id }, data: { status: 'ACEITA', empresaId: dto.empresaId } });
    }
    if (dto.valorMensalCentavos && !dto.diaVencimento) throw new BadRequestException('Informe o dia de vencimento da mensalidade.');
    const inicio = dia(dto.inicio);
    const fim = dto.fim ? dia(dto.fim) : null;
    if (fim && fim < inicio) throw new BadRequestException('O fim do contrato não pode ser antes do início.');
    return this.prisma.contrato.create({
      data: {
        consultoriaId, numero: await this.proximo('contrato', consultoriaId), empresaId: dto.empresaId, propostaId: dto.propostaId || null,
        objeto: dto.objeto.trim(), valorMensalCentavos: dto.valorMensalCentavos ?? null, diaVencimento: dto.diaVencimento ?? null,
        inicio, fim, observacoes: dto.observacoes?.trim() || null,
      },
    });
  }

  async encerrarContrato(consultoriaId: string, id: string, data?: string) {
    const { count } = await this.prisma.contrato.updateMany({ where: { id, consultoriaId }, data: { status: 'ENCERRADO', fim: data ? dia(data) : hoje() } });
    if (!count) throw new NotFoundException('Contrato não encontrado');
    return { ok: true };
  }

  async pdfContrato(consultoriaId: string, id: string) {
    const c = await this.prisma.contrato.findFirst({ where: { id, consultoriaId }, include: { empresa: true } });
    if (!c) throw new NotFoundException('Contrato não encontrado');
    const cons = await this.consultoria(consultoriaId);
    const m = await this.moldura(consultoriaId, 'Contrato de prestação de serviços de SST', c.empresa.logoPath);
    return this.pdf.render(contratoHtml(m, c, { consultoria: cons, cliente: { razaoSocial: c.empresa.razaoSocial, cnpj: c.empresa.cnpj, representante: c.empresa.representanteLegalNome } }));
  }

  // Cria as mensalidades do mês para todos os contratos ativos (sem repetir as que já existem).
  async gerarMensalidades(consultoriaId: string, mes: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new BadRequestException('Mês no formato AAAA-MM.');
    const [ano, m] = mes.split('-').map(Number);
    const inicioMes = new Date(Date.UTC(ano, m - 1, 1));
    const fimMes = new Date(Date.UTC(ano, m, 0));
    const contratos = await this.prisma.contrato.findMany({
      where: { consultoriaId, status: 'ATIVO', valorMensalCentavos: { not: null }, inicio: { lte: fimMes }, OR: [{ fim: null }, { fim: { gte: inicioMes } }] },
      include: { empresa: { select: { razaoSocial: true } } },
    });
    let criadas = 0;
    for (const c of contratos) {
      const existe = await this.prisma.cobranca.findFirst({ where: { contratoId: c.id, referencia: mes } });
      if (existe) continue;
      await this.prisma.cobranca.create({
        data: {
          consultoriaId, empresaId: c.empresaId, contratoId: c.id, referencia: mes, valorCentavos: c.valorMensalCentavos!,
          descricao: `Mensalidade ${String(m).padStart(2, '0')}/${ano} - contrato nº ${c.numero}`,
          vencimento: new Date(Date.UTC(ano, m - 1, c.diaVencimento ?? 10)), txid: this.txid(),
        },
      });
      criadas++;
    }
    return { criadas, contratos: contratos.length };
  }

  // ---------- ordens de serviço ----------
  listarServicos(consultoriaId: string) {
    return this.prisma.servico.findMany({ where: { consultoriaId }, orderBy: { numero: 'desc' }, include: { empresa: { select: { razaoSocial: true } }, cobrancas: { select: { id: true, status: true } } } });
  }

  async criarServico(consultoriaId: string, dto: CriarServicoDto) {
    await this.empresa(consultoriaId, dto.empresaId);
    if (dto.contratoId && !(await this.prisma.contrato.findFirst({ where: { id: dto.contratoId, consultoriaId, empresaId: dto.empresaId } }))) {
      throw new NotFoundException('Contrato não encontrado para esta empresa');
    }
    return this.prisma.servico.create({
      data: {
        consultoriaId, numero: await this.proximo('servico', consultoriaId), empresaId: dto.empresaId, contratoId: dto.contratoId || null,
        descricao: dto.descricao.trim(), previsto: dto.previsto ? dia(dto.previsto) : null, responsavel: dto.responsavel?.trim() || null, valorCentavos: dto.valorCentavos ?? null,
      },
    });
  }

  // Concluir a OS com valor avulso já deixa a cobrança pronta.
  async concluirServico(consultoriaId: string, id: string, data?: string) {
    const s = await this.prisma.servico.findFirst({ where: { id, consultoriaId } });
    if (!s) throw new NotFoundException('Ordem de serviço não encontrada');
    const concluidoEm = data ? dia(data) : hoje();
    await this.prisma.servico.update({ where: { id }, data: { status: 'CONCLUIDA', concluidoEm } });
    if (s.valorCentavos && !(await this.prisma.cobranca.findFirst({ where: { servicoId: id } }))) {
      await this.prisma.cobranca.create({
        data: {
          consultoriaId, empresaId: s.empresaId, servicoId: id, descricao: `OS nº ${s.numero}: ${s.descricao}`.slice(0, 200), valorCentavos: s.valorCentavos,
          vencimento: new Date(concluidoEm.getTime() + 10 * 86_400_000), txid: this.txid(),
        },
      });
      return { ok: true, cobranca: true };
    }
    return { ok: true, cobranca: false };
  }

  // ---------- cobranças ----------
  private txid() {
    return `SN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`.slice(0, 25);
  }

  async listarCobrancas(consultoriaId: string) {
    const lista = await this.prisma.cobranca.findMany({ where: { consultoriaId }, orderBy: [{ vencimento: 'desc' }, { createdAt: 'desc' }], include: { empresa: { select: { razaoSocial: true } } } });
    const h = hoje();
    return lista.map((c) => ({ ...c, vencida: c.status === 'ABERTA' && c.vencimento < h }));
  }

  async resumo(consultoriaId: string) {
    const lista = await this.listarCobrancas(consultoriaId);
    const mes = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 7);
    const soma = (f: (c: (typeof lista)[number]) => boolean) => lista.filter(f).reduce((s, c) => s + c.valorCentavos, 0);
    return {
      emAberto: soma((c) => c.status === 'ABERTA' && !c.vencida),
      vencido: soma((c) => c.vencida),
      recebidoNoMes: soma((c) => c.status === 'PAGA' && !!c.pagoEm && c.pagoEm.toISOString().slice(0, 7) === mes),
      contratosAtivos: await this.prisma.contrato.count({ where: { consultoriaId, status: 'ATIVO' } }),
    };
  }

  async criarCobranca(consultoriaId: string, dto: CriarCobrancaDto) {
    await this.empresa(consultoriaId, dto.empresaId);
    return this.prisma.cobranca.create({
      data: { consultoriaId, empresaId: dto.empresaId, servicoId: dto.servicoId || null, descricao: dto.descricao.trim(), valorCentavos: dto.valorCentavos, vencimento: dia(dto.vencimento), txid: this.txid() },
    });
  }

  async marcarPaga(consultoriaId: string, id: string, data?: string) {
    const { count } = await this.prisma.cobranca.updateMany({ where: { id, consultoriaId, status: { not: 'CANCELADA' } }, data: { status: 'PAGA', pagoEm: data ? dia(data) : hoje() } });
    if (!count) throw new NotFoundException('Cobrança não encontrada');
    return { ok: true };
  }

  async cancelarCobranca(consultoriaId: string, id: string) {
    const { count } = await this.prisma.cobranca.updateMany({ where: { id, consultoriaId, status: 'ABERTA' }, data: { status: 'CANCELADA' } });
    if (!count) throw new BadRequestException('Só dá para cancelar cobrança em aberto.');
    return { ok: true };
  }

  async pix(consultoriaId: string, id: string) {
    const c = await this.prisma.cobranca.findFirst({ where: { id, consultoriaId } });
    if (!c) throw new NotFoundException('Cobrança não encontrada');
    const cons = await this.consultoria(consultoriaId);
    if (!cons.pixChave) return null;
    const copiaECola = pixCopiaECola({ chave: cons.pixChave, nome: cons.pixNome || cons.nome, cidade: cons.cidade || 'BRASIL', valorCentavos: c.valorCentavos, txid: c.txid });
    return { copiaECola, qr: await QRCode.toDataURL(copiaECola, { margin: 1, width: 340 }), recebedor: cons.pixNome || cons.nome };
  }

  async pdfCobranca(consultoriaId: string, id: string) {
    const c = await this.prisma.cobranca.findFirst({ where: { id, consultoriaId }, include: { empresa: true } });
    if (!c) throw new NotFoundException('Cobrança não encontrada');
    const m = await this.moldura(consultoriaId, 'Cobrança', c.empresa.logoPath);
    return this.pdf.render(cobrancaHtml(m, c, c.empresa, await this.pix(consultoriaId, id)));
  }
}
