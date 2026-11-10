import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { calendarioCipa, dimensionarCipa } from './dimensionamento';
import { AtualizarEleicaoDto, AtualizarMembroDto, CriarEleicaoDto, CriarMembroDto } from './dto';
import { apurar, cargaHoraria, conferirPrazos, participacao } from './eleicao';
import * as modelos from './eleicao.templates';

const DOCUMENTOS = {
  edital: { render: modelos.editalHtml, arquivo: 'Edital-CIPA' },
  inscricao: { render: modelos.fichaInscricaoHtml, arquivo: 'Ficha-inscricao-CIPA' },
  inscritos: { render: modelos.inscritosHtml, arquivo: 'Inscritos-CIPA' },
  cedulas: { render: modelos.cedulasHtml, arquivo: 'Cedulas-CIPA' },
  'ata-eleicao': { render: modelos.ataEleicaoHtml, arquivo: 'Ata-eleicao-CIPA' },
  'ata-posse': { render: modelos.ataPosseHtml, arquivo: 'Ata-posse-CIPA' },
  certificados: { render: modelos.certificadosHtml, arquivo: 'Certificados-CIPA' },
} as const;
export type DocumentoEleicao = keyof typeof DOCUMENTOS;
export const ehDocumentoEleicao = (doc: string): doc is DocumentoEleicao => doc in DOCUMENTOS;

const data = (iso?: string) => (iso === undefined ? undefined : new Date(iso));
const AVISO = 'Feito com o Safety Nexo. Segue a NR-05.';

@Injectable()
export class EleicaoCipaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
  ) {}

  private async empresa(consultoriaId: string, empresaId: string) {
    const empresa = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId } });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    return empresa;
  }

  private async eleicao(consultoriaId: string, empresaId: string, eleicaoId: string) {
    const eleicao = await this.prisma.cipaEleicao.findFirst({
      where: { id: eleicaoId, empresaId, empresa: { consultoriaId } },
      include: { empresa: true, membros: { include: { colaborador: true }, orderBy: { createdAt: 'asc' } } },
    });
    if (!eleicao) throw new NotFoundException('Eleição não encontrada');
    return eleicao;
  }

  // Monta a visão da eleição: vagas, apuração, participação e avisos de prazo.
  private resumir(eleicao: Awaited<ReturnType<EleicaoCipaService['eleicao']>>) {
    const { empresa } = eleicao;
    const d = dimensionarCipa(empresa.grauRisco, empresa.numFuncionarios);
    const vagas = d.situacao === 'CIPA' ? { efetivos: d.efetivos, suplentes: d.suplentes } : { efetivos: 0, suplentes: 0 };
    const pessoa = (m: (typeof eleicao.membros)[number]) => ({
      membroId: m.id,
      colaboradorId: m.colaboradorId,
      nome: m.colaborador.nome,
      cpf: m.colaborador.cpf,
      cargo: m.colaborador.cargo,
    });
    const candidatos = apurar(
      eleicao.membros
        .filter((m) => m.representacao === 'EMPREGADOS')
        .map((m) => ({ ...pessoa(m), id: m.id, votos: m.votos, vice: m.vice, dataAdmissao: m.colaborador.dataAdmissao })),
      vagas.efetivos,
      vagas.suplentes,
    );
    const indicados = eleicao.membros
      .filter((m) => m.representacao === 'ORGANIZACAO')
      .map((m) => ({ ...pessoa(m), titular: m.titular, presidente: m.presidente }));
    const { empresa: _e, membros: _m, ...dados } = eleicao;
    return {
      ...dados,
      vagas,
      candidatos,
      indicados,
      participacao: participacao(eleicao.votantes, empresa.numFuncionarios),
      cargaHoraria: cargaHoraria(empresa.grauRisco),
      fimMandato: eleicao.posseEm ? calendarioCipa(eleicao.posseEm).fimMandato : null,
      avisos: conferirPrazos(eleicao, empresa.cipaInicioMandato),
    };
  }

  async listar(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    const ids = await this.prisma.cipaEleicao.findMany({ where: { empresaId }, orderBy: { eleicaoEm: 'desc' }, select: { id: true } });
    return Promise.all(ids.map(async ({ id }) => this.resumir(await this.eleicao(consultoriaId, empresaId, id))));
  }

  async criar(consultoriaId: string, empresaId: string, dto: CriarEleicaoDto) {
    const empresa = await this.empresa(consultoriaId, empresaId);
    if (dimensionarCipa(empresa.grauRisco, empresa.numFuncionarios).situacao !== 'CIPA') {
      throw new BadRequestException('Esta empresa não precisa de CIPA pelo Quadro I da NR-05. Confira o grau de risco e o número de funcionários.');
    }
    const eleicao = await this.prisma.cipaEleicao.create({
      data: {
        empresaId,
        editalEm: new Date(dto.editalEm),
        inscricaoInicio: new Date(dto.inscricaoInicio),
        inscricaoFim: new Date(dto.inscricaoFim),
        eleicaoEm: new Date(dto.eleicaoEm),
        localVotacao: dto.localVotacao.trim(),
        horarioVotacao: dto.horarioVotacao.trim(),
      },
    });
    return this.resumir(await this.eleicao(consultoriaId, empresaId, eleicao.id));
  }

  async atualizar(consultoriaId: string, empresaId: string, eleicaoId: string, dto: AtualizarEleicaoDto) {
    await this.eleicao(consultoriaId, empresaId, eleicaoId);
    const posseEm = data(dto.posseEm);
    await this.prisma.cipaEleicao.update({
      where: { id: eleicaoId },
      data: {
        votantes: dto.votantes,
        posseEm,
        treinamentoInicio: data(dto.treinamentoInicio),
        treinamentoFim: data(dto.treinamentoFim),
        instrutor: dto.instrutor?.trim(),
      },
    });
    // A posse abre o novo mandato: o calendário da CIPA e os avisos do painel passam a contar dela.
    if (posseEm) await this.prisma.empresa.update({ where: { id: empresaId }, data: { cipaInicioMandato: posseEm } });
    return this.resumir(await this.eleicao(consultoriaId, empresaId, eleicaoId));
  }

  async adicionarMembro(consultoriaId: string, empresaId: string, eleicaoId: string, dto: CriarMembroDto) {
    const eleicao = await this.eleicao(consultoriaId, empresaId, eleicaoId);
    const colaborador = await this.prisma.colaborador.findFirst({ where: { id: dto.colaboradorId, empresaId } });
    if (!colaborador) throw new NotFoundException('Colaborador não encontrado nesta empresa');
    if (eleicao.membros.some((m) => m.colaboradorId === dto.colaboradorId)) {
      throw new BadRequestException(`${colaborador.nome} já está nesta eleição.`);
    }
    await this.prisma.cipaMembro.create({
      data: { eleicaoId, colaboradorId: dto.colaboradorId, representacao: dto.representacao, titular: dto.titular ?? true },
    });
    return this.resumir(await this.eleicao(consultoriaId, empresaId, eleicaoId));
  }

  async atualizarMembro(consultoriaId: string, empresaId: string, eleicaoId: string, membroId: string, dto: AtualizarMembroDto) {
    const eleicao = await this.eleicao(consultoriaId, empresaId, eleicaoId);
    const membro = eleicao.membros.find((m) => m.id === membroId);
    if (!membro) throw new NotFoundException('Membro não encontrado');
    // Só um presidente e um vice por gestão.
    if (dto.presidente) await this.prisma.cipaMembro.updateMany({ where: { eleicaoId }, data: { presidente: false } });
    if (dto.vice) await this.prisma.cipaMembro.updateMany({ where: { eleicaoId }, data: { vice: false } });
    await this.prisma.cipaMembro.update({ where: { id: membroId }, data: dto });
    return this.resumir(await this.eleicao(consultoriaId, empresaId, eleicaoId));
  }

  async removerMembro(consultoriaId: string, empresaId: string, eleicaoId: string, membroId: string) {
    const eleicao = await this.eleicao(consultoriaId, empresaId, eleicaoId);
    if (!eleicao.membros.some((m) => m.id === membroId)) throw new NotFoundException('Membro não encontrado');
    await this.prisma.cipaMembro.delete({ where: { id: membroId } });
    return this.resumir(await this.eleicao(consultoriaId, empresaId, eleicaoId));
  }

  async gerarPdf(consultoriaId: string, empresaId: string, eleicaoId: string, documento: DocumentoEleicao) {
    const resumo = this.resumir(await this.eleicao(consultoriaId, empresaId, eleicaoId));
    const { empresa, logoEmpresa, consultoria } = await this.contexto.carregar(consultoriaId, empresaId, 'CIPA');
    const html = DOCUMENTOS[documento].render({
      moldura: {
        logoEmpresa,
        consultoria,
        infos: [
          ['Empresa', empresa.razaoSocial],
          ['CNPJ', empresa.cnpj],
        ],
        aviso: AVISO,
      },
      razaoSocial: empresa.razaoSocial,
      ...resumo,
      eleicao: resumo,
    });
    return { pdf: await this.pdf.render(html), arquivo: `${DOCUMENTOS[documento].arquivo}.pdf` };
  }
}
