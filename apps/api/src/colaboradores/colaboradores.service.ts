import { registrarEntrega } from '../estoque/baixa';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { Guarda } from '../common/guarda';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { renderAsoHtml } from './aso.template';
import { CreateAsoDto, CreateEntregaEpiDto } from './dto';
import { renderFichaEpiHtml } from './ficha-epi.template';
import { renderPppHtml } from './ppp.template';
import { examesDoTipo, NOME_TIPO_ASO, proximoExame, TipoAso } from './regras';

// PDF do ASO feito pela clínica (a consultoria só controla: não agenda exame).
const guardaAso = new Guarda('asos', process.env.ASOS_DIR ?? join(__dirname, '..', '..', 'storage', 'asos'));

const AVISO = 'Documento gerado pelo Safety Nexo. Deve ser conferido e assinado pelos responsáveis.';

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
        proximoExame: proximoExame(programa, tipo, dto.resultado, dataExame),
      },
    });
  }

  async registrarEntregaEpi(consultoriaId: string, empresaId: string, colaboradorId: string, dto: CreateEntregaEpiDto) {
    await this.detalhar(consultoriaId, empresaId, colaboradorId);
    return registrarEntrega(this.prisma, empresaId, {
      colaboradorId, estoqueId: dto.estoqueId, epi: dto.epi?.trim(), ca: dto.ca?.trim(), quantidade: dto.quantidade ?? 1, motivo: dto.motivo,
      dataEntrega: new Date(dto.dataEntrega), validadeCa: dto.validadeCa ? new Date(dto.validadeCa) : null,
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
