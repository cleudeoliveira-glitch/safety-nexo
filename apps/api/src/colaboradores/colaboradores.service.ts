import { jaFoiAoEsocial } from '../common/exclusao';
import { registrarEntrega } from '../estoque/baixa';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { Guarda } from '../common/guarda';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { renderAsoHtml } from './aso.template';
import { CreateAsoDto, CreateEntregaEpiDto, DevolucaoEpiDto, EditarColaboradorDto } from './dto';
import { renderFichaEpiHtml } from './ficha-epi.template';
import { renderPppHtml } from './ppp.template';
import { dispensaDemissional, examesDoTipo, NOME_TIPO_ASO, proximoExame, TipoAso } from './regras';

// PDF do ASO feito pela clínica (a consultoria só controla: não agenda exame).
const guardaAso = new Guarda('asos', process.env.ASOS_DIR ?? join(__dirname, '..', '..', 'storage', 'asos'));

const AVISO = 'Feito com o Safety Nexo.';

@Injectable()
export class ColaboradoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
  ) {}

  async detalhar(consultoriaId: string, empresaId: string, colaboradorId: string) {
    const colaborador = await this.prisma.colaborador.findFirst({
      where: { id: colaboradorId, empresaId, empresa: { consultoriaId } },
      include: {
        ghe: { include: { riscos: true, exames: true } },
        asos: { orderBy: { dataExame: 'desc' } },
        entregasEpi: { orderBy: { dataEntrega: 'desc' } },
        presencasFaciais: { where: { tipo: 'EPI' }, select: { refId: true, codigo: true } },
      },
    });
    if (!colaborador) throw new NotFoundException('Colaborador não encontrado');
    return colaborador;
  }

  // Tela do colaborador: inclui, para quem saiu, se o demissional ainda falta ou pode ser dispensado.
  async ficha(consultoriaId: string, empresaId: string, colaboradorId: string) {
    const colaborador = await this.detalhar(consultoriaId, empresaId, colaboradorId);
    const demissional = colaborador.dataDesligamento ? await this.demissional(empresaId, colaborador, colaborador.dataDesligamento) : null;
    return { ...colaborador, demissional };
  }

  // Saída da empresa: o histórico fica guardado, mas a pessoa sai dos alertas e das contagens.
  async desligar(consultoriaId: string, empresaId: string, colaboradorId: string, data: string | null) {
    const colaborador = await this.detalhar(consultoriaId, empresaId, colaboradorId);
    const dataDesligamento = data ? new Date(data) : null;
    if (dataDesligamento && colaborador.dataAdmissao && dataDesligamento < colaborador.dataAdmissao) {
      throw new BadRequestException('A saída não pode ser antes da admissão.');
    }
    await this.prisma.colaborador.update({ where: { id: colaboradorId }, data: { dataDesligamento } });
    return { dataDesligamento, demissional: dataDesligamento ? await this.demissional(empresaId, colaborador, dataDesligamento) : null };
  }

  private async demissional(empresaId: string, colaborador: { asos: { tipo: string; dataExame: Date }[] }, saida: Date) {
    if (colaborador.asos.some((a) => a.tipo === 'DEMISSIONAL')) return { feito: true, dispensa: false, limite: 0, dias: null };
    const empresa = await this.prisma.empresa.findUnique({ where: { id: empresaId }, select: { grauRisco: true } });
    return { feito: false, ...dispensaDemissional(empresa?.grauRisco ?? null, colaborador.asos[0]?.dataExame ?? null, saida) };
  }

  async registrarAso(consultoriaId: string, empresaId: string, colaboradorId: string, dto: CreateAsoDto) {
    const colaborador = await this.detalhar(consultoriaId, empresaId, colaboradorId);
    const programa = colaborador.ghe?.exames ?? [];
    const tipo = dto.tipo as TipoAso;
    const dataExame = new Date(dto.dataExame);

    return this.prisma.aso.create({
      data: {
        ...dto,
        colaboradorId,
        dataExame,
        exames: examesDoTipo(programa, tipo),
        riscos: (colaborador.ghe?.riscos ?? []).map((r) => r.agente),
        proximoExame: proximoExame(programa, tipo, dto.resultado, dataExame, (colaborador.ghe?.riscos.length ?? 0) > 0),
      },
    });
  }

  async registrarEntregaEpi(consultoriaId: string, empresaId: string, colaboradorId: string, dto: CreateEntregaEpiDto) {
    await this.detalhar(consultoriaId, empresaId, colaboradorId);
    return registrarEntrega(this.prisma, empresaId, {
      colaboradorId, estoqueId: dto.estoqueId, epi: dto.epi?.trim(), ca: dto.ca?.trim(), fabricante: dto.fabricante, quantidade: dto.quantidade ?? 1, motivo: dto.motivo,
      dataEntrega: new Date(dto.dataEntrega), validadeCa: dto.validadeCa ? new Date(dto.validadeCa) : null, vidaUtilDias: dto.vidaUtilDias,
    });
  }

  // Devolução de EPI: a entrega continua no histórico (e na ficha), mas sai da conta do que está em uso.
  async devolverEpi(consultoriaId: string, empresaId: string, colaboradorId: string, entregaId: string, dto: DevolucaoEpiDto) {
    const colaborador = await this.detalhar(consultoriaId, empresaId, colaboradorId);
    const entrega = colaborador.entregasEpi.find((e) => e.id === entregaId);
    if (!entrega) throw new NotFoundException('Entrega de EPI não encontrada.');
    if (entrega.devolvidoEm) throw new BadRequestException(`Este EPI já foi devolvido em ${entrega.devolvidoEm.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}.`);
    const data = new Date(dto.data);
    if (data < entrega.dataEntrega) throw new BadRequestException('A devolução não pode ser antes da entrega.');
    const voltar = !!dto.voltaAoEstoque && !!entrega.estoqueId;
    return this.prisma.$transaction(async (tx) => {
      if (voltar) {
        const item = await tx.estoqueEpi.findFirst({ where: { id: entrega.estoqueId!, empresaId } });
        if (item) {
          const atualizado = await tx.estoqueEpi.update({ where: { id: item.id }, data: { quantidade: { increment: entrega.quantidade } } });
          await tx.movimentoEstoque.create({ data: { estoqueId: item.id, tipo: 'ENTRADA', quantidade: entrega.quantidade, saldo: atualizado.quantidade, entregaEpiId: entrega.id, observacao: `Devolvido por ${colaborador.nome}` } });
        }
      }
      return tx.entregaEpi.update({ where: { id: entrega.id }, data: { devolvidoEm: data, motivoDevolucao: dto.motivo } });
    });
  }

  // ASO lançado errado. Se já foi ao eSocial (S-2220), a exclusão tem que ser feita lá primeiro.
  async excluirAso(consultoriaId: string, empresaId: string, colaboradorId: string, asoId: string) {
    await this.detalhar(consultoriaId, empresaId, colaboradorId);
    const aso = await this.prisma.aso.findFirst({ where: { id: asoId, colaboradorId } });
    if (!aso) throw new NotFoundException('Este ASO não foi encontrado. Talvez já tenha sido excluído.');
    if (await jaFoiAoEsocial(this.prisma, empresaId, asoId)) {
      throw new BadRequestException('Este ASO já foi enviado ao eSocial, por isso não dá para apagar daqui. Faça a exclusão no eSocial (S-3000) na tela do eSocial e depois apague aqui.');
    }
    await this.prisma.aso.delete({ where: { id: aso.id } });
    if (aso.arquivoPath) await guardaAso.apagar(aso.arquivoPath).catch(() => undefined);
    return { ok: true };
  }

  // Entrega lançada errado: some da ficha. Se saiu do almoxarifado, a quantidade volta para o estoque.
  async excluirEntregaEpi(consultoriaId: string, empresaId: string, colaboradorId: string, entregaId: string) {
    const colaborador = await this.detalhar(consultoriaId, empresaId, colaboradorId);
    const entrega = await this.prisma.entregaEpi.findFirst({ where: { id: entregaId, colaboradorId } });
    if (!entrega) throw new NotFoundException('Esta entrega de EPI não foi encontrada. Talvez já tenha sido excluída.');
    await this.prisma.$transaction(async (tx) => {
      if (entrega.estoqueId && !entrega.devolvidoEm) {
        const item = await tx.estoqueEpi.findFirst({ where: { id: entrega.estoqueId, empresaId } });
        if (item) {
          const atualizado = await tx.estoqueEpi.update({ where: { id: item.id }, data: { quantidade: { increment: entrega.quantidade } } });
          await tx.movimentoEstoque.create({ data: { estoqueId: item.id, tipo: 'AJUSTE', quantidade: entrega.quantidade, saldo: atualizado.quantidade, observacao: `Entrega para ${colaborador.nome} excluída (lançada errado)` } });
        }
      }
      await tx.presencaFacial.deleteMany({ where: { tipo: 'EPI', refId: entrega.id } });
      await tx.entregaEpi.delete({ where: { id: entrega.id } });
    });
    return { ok: true };
  }

  // Dados do cadastro, editados pela ficha. Campo vazio apaga (menos nome e cargo, que são obrigatórios).
  async editar(consultoriaId: string, empresaId: string, colaboradorId: string, dto: EditarColaboradorDto) {
    await this.detalhar(consultoriaId, empresaId, colaboradorId);
    const limpo = (v?: string) => (v === undefined ? undefined : v.trim() || null);
    const dataOuNulo = (v?: string) => (v === undefined ? undefined : v.trim() ? new Date(v) : null);
    if (dto.gheId) {
      const ghe = await this.prisma.ghe.findFirst({ where: { id: dto.gheId, empresaId }, select: { id: true } });
      if (!ghe) throw new NotFoundException('GHE não encontrado nesta empresa');
    }
    const dataAdmissao = dataOuNulo(dto.dataAdmissao);
    if (dataAdmissao && Number.isNaN(dataAdmissao.getTime())) throw new BadRequestException('Data de admissão inválida.');
    return this.prisma.colaborador.update({
      where: { id: colaboradorId },
      data: {
        ...(dto.nome?.trim() ? { nome: dto.nome.trim() } : {}),
        ...(dto.cargo?.trim() ? { cargo: dto.cargo.trim() } : {}),
        cpf: limpo(dto.cpf),
        cbo: limpo(dto.cbo),
        matricula: limpo(dto.matricula),
        dataAdmissao,
        gheId: dto.gheId === undefined ? undefined : dto.gheId || null,
        cnhCategoria: limpo(dto.cnhCategoria),
        cnhValidade: dataOuNulo(dto.cnhValidade),
      },
    });
  }

  async anexarAso(consultoriaId: string, empresaId: string, colaboradorId: string, asoId: string, arquivo?: { buffer: Buffer; mimetype: string; size: number }) {
    const colaborador = await this.detalhar(consultoriaId, empresaId, colaboradorId);
    if (!colaborador.asos.some((a) => a.id === asoId)) throw new NotFoundException('ASO não encontrado');
    if (!arquivo?.buffer?.length) throw new BadRequestException('Escolha o PDF do ASO.');
    if (arquivo.mimetype !== 'application/pdf' || arquivo.buffer.subarray(0, 4).toString() !== '%PDF') throw new BadRequestException('O arquivo precisa ser um PDF.');
    const caminho = `${empresaId}/${asoId}.pdf`;
    await guardaAso.gravar(caminho, arquivo.buffer, 'application/pdf');
    await this.prisma.aso.update({ where: { id: asoId }, data: { arquivoPath: caminho } });
    return { ok: true };
  }

  async arquivoAso(consultoriaId: string, empresaId: string, colaboradorId: string, asoId: string) {
    const colaborador = await this.detalhar(consultoriaId, empresaId, colaboradorId);
    const aso = colaborador.asos.find((a) => a.id === asoId);
    if (!aso?.arquivoPath) throw new NotFoundException('Este ASO ainda não tem o PDF da clínica.');
    return guardaAso.ler(aso.arquivoPath);
  }

  async pdfAso(consultoriaId: string, empresaId: string, colaboradorId: string, asoId: string) {
    const colaborador = await this.detalhar(consultoriaId, empresaId, colaboradorId);
    const aso = colaborador.asos.find((a) => a.id === asoId);
    if (!aso) throw new NotFoundException('ASO não encontrado');
    const { empresa, logoEmpresa, consultoria } = await this.contexto.carregar(consultoriaId, empresaId, 'ASO');

    const html = renderAsoHtml(
      {
        titulo: 'Atestado de Saúde Ocupacional (ASO)',
        logoEmpresa,
        consultoria,
        infos: [
          ['Empresa', empresa.razaoSocial],
          ['CNPJ', empresa.cnpj],
        ],
        aviso: AVISO,
      },
      {
        colaborador: { nome: colaborador.nome, cpf: colaborador.cpf, cargo: colaborador.cargo, ghe: colaborador.ghe?.nome ?? null },
        tipo: NOME_TIPO_ASO[aso.tipo as TipoAso] ?? aso.tipo,
        dataExame: aso.dataExame,
        resultado: aso.resultado,
        exames: aso.exames,
        riscos: aso.riscos,
        medicoExaminador: { nome: aso.medicoExaminadorNome, crm: aso.medicoExaminadorCrm },
        medicoPcmso: { nome: empresa.medicoPcmsoNome, crm: empresa.medicoPcmsoCrm },
        proximoExame: aso.proximoExame,
        observacoes: aso.observacoes,
      },
    );
    return this.pdf.render(html);
  }

  // Entregas confirmadas pelo rosto levam o código do comprovante na coluna de assinatura.
  private async comConfirmacao<T extends { id: string }>(colaboradorId: string, entregas: T[]) {
    const l = await this.prisma.presencaFacial.findMany({ where: { tipo: 'EPI', colaboradorId }, select: { refId: true, codigo: true } });
    const m = new Map(l.map((p) => [p.refId, p.codigo]));
    return entregas.map((e) => ({ ...e, confirmacao: m.get(e.id) ?? null }));
  }

  async pdfFichaEpi(consultoriaId: string, empresaId: string, colaboradorId: string) {
    const colaborador = await this.detalhar(consultoriaId, empresaId, colaboradorId);
    const { empresa, logoEmpresa, consultoria } = await this.contexto.carregar(consultoriaId, empresaId, 'FICHA_EPI');
    const html = renderFichaEpiHtml(
      {
        titulo: 'Ficha de Controle de EPI',
        logoEmpresa,
        consultoria,
        infos: [
          ['Empresa', empresa.razaoSocial],
          ['CNPJ', empresa.cnpj],
        ],
        aviso: AVISO,
      },
      colaborador,
      await this.comConfirmacao(colaborador.id, [...colaborador.entregasEpi].reverse()),
    );
    return this.pdf.render(html);
  }

  async pdfPpp(consultoriaId: string, empresaId: string, colaboradorId: string) {
    const colaborador = await this.detalhar(consultoriaId, empresaId, colaboradorId);
    const { empresa, logoEmpresa, consultoria, geradoEm } = await this.contexto.carregar(consultoriaId, empresaId, 'PPP');
    const html = renderPppHtml(
      {
        titulo: 'Perfil Profissiográfico Previdenciário (PPP)',
        logoEmpresa,
        consultoria,
        infos: [
          ['Empresa', empresa.razaoSocial],
          ['Trabalhador', colaborador.nome],
        ],
        aviso: AVISO,
      },
      {
        empresa,
        trabalhador: { ...colaborador, ghe: colaborador.ghe?.nome ?? null },
        // Ergonômico e acidente não são agentes nocivos para o PPP.
        agentes: (colaborador.ghe?.riscos ?? []).filter((r) => ['FISICO', 'QUIMICO', 'BIOLOGICO'].includes(r.tipo)),
        asos: [...colaborador.asos].reverse().map((a) => ({ ...a, tipo: NOME_TIPO_ASO[a.tipo as TipoAso] ?? a.tipo })),
        responsavelAmbiental: { nome: empresa.responsavelTecnicoNome, registro: empresa.responsavelTecnicoRegistro },
        medicoPcmso: { nome: empresa.medicoPcmsoNome, crm: empresa.medicoPcmsoCrm },
        representanteLegal: empresa.representanteLegalNome,
        emitidoEm: geradoEm,
      },
    );
    return this.pdf.render(html);
  }
}
