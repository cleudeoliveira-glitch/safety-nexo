import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as QRCode from 'qrcode';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { CATALOGO } from './catalogo';
import { CriarTurmaDto } from './dto';
import { certificadosHtml, listaPresencaHtml } from './templates';

const AVISO = 'Documento gerado pelo Safety Nexo. Deve ser conferido e assinado pelos responsáveis.';
const WEB = () => process.env.WEB_ORIGIN ?? 'http://localhost:3000';

// Código curto e difícil de adivinhar, sem letras que se confundem (0/O, 1/I).
export function novoCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return [...randomBytes(10)].map((b) => letras[b % letras.length]).join('').replace(/(.{5})/, '$1-');
}

export function validadeDaTurma(turma: { fim: Date; validadeMeses: number | null }) {
  if (!turma.validadeMeses) return null;
  const validade = new Date(turma.fim);
  validade.setUTCMonth(validade.getUTCMonth() + turma.validadeMeses);
  return validade;
}

@Injectable()
export class TreinamentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexto: ContextoDocumentoService,
    private readonly pdf: PdfService,
  ) {}

  catalogo() {
    return CATALOGO;
  }

  private async empresa(consultoriaId: string, empresaId: string) {
    const empresa = await this.prisma.empresa.findFirst({ where: { id: empresaId, consultoriaId } });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    return empresa;
  }

  private async turma(consultoriaId: string, empresaId: string, turmaId: string) {
    await this.empresa(consultoriaId, empresaId);
    const turma = await this.prisma.turma.findFirst({
      where: { id: turmaId, empresaId },
      include: { participantes: { include: { colaborador: true }, orderBy: { colaborador: { nome: 'asc' } } } },
    });
    if (!turma) throw new NotFoundException('Turma não encontrada');
    return turma;
  }

  private resumo(turma: Awaited<ReturnType<TreinamentosService['turma']>>) {
    return {
      ...turma,
      validade: validadeDaTurma(turma),
      participantes: turma.participantes.map((p) => ({ id: p.id, codigo: p.codigo, colaboradorId: p.colaboradorId, nome: p.colaborador.nome, cargo: p.colaborador.cargo })),
    };
  }

  async listar(consultoriaId: string, empresaId: string) {
    await this.empresa(consultoriaId, empresaId);
    const turmas = await this.prisma.turma.findMany({
      where: { empresaId },
      orderBy: { inicio: 'desc' },
      include: { participantes: { include: { colaborador: true }, orderBy: { colaborador: { nome: 'asc' } } } },
    });
    return turmas.map((t) => this.resumo(t));
  }

  async criar(consultoriaId: string, empresaId: string, dto: CriarTurmaDto) {
    await this.empresa(consultoriaId, empresaId);
    const inicio = new Date(dto.inicio);
    const fim = new Date(dto.fim);
    if (fim < inicio) throw new BadRequestException('O fim do treinamento precisa ser no mesmo dia ou depois do início.');
    const turma = await this.prisma.turma.create({
      data: {
        empresaId,
        nome: dto.nome.trim(),
        norma: dto.norma?.trim() || null,
        cargaHoraria: dto.cargaHoraria,
        validadeMeses: dto.validadeMeses ?? null,
        conteudo: dto.conteudo.map((c) => c.trim()).filter(Boolean),
        inicio,
        fim,
        local: dto.local.trim(),
        instrutor: dto.instrutor.trim(),
        qualificacao: dto.qualificacao.trim(),
        responsavelTecnico: dto.responsavelTecnico.trim(),
      },
    });
    return this.resumo(await this.turma(consultoriaId, empresaId, turma.id));
  }

  async adicionarParticipantes(consultoriaId: string, empresaId: string, turmaId: string, ids: string[]) {
    const turma = await this.turma(consultoriaId, empresaId, turmaId);
    const novos = [...new Set(ids)].filter((id) => !turma.participantes.some((p) => p.colaboradorId === id));
    const achados = await this.prisma.colaborador.count({ where: { empresaId, id: { in: novos } } });
    if (achados !== novos.length) throw new BadRequestException('Há colaboradores que não são desta empresa.');
    await this.prisma.participacao.createMany({ data: novos.map((colaboradorId) => ({ turmaId, colaboradorId, codigo: novoCodigo() })) });
    return this.resumo(await this.turma(consultoriaId, empresaId, turmaId));
  }

  async removerParticipante(consultoriaId: string, empresaId: string, turmaId: string, participacaoId: string) {
    const turma = await this.turma(consultoriaId, empresaId, turmaId);
    if (!turma.participantes.some((p) => p.id === participacaoId)) throw new NotFoundException('Participante não encontrado');
    await this.prisma.participacao.delete({ where: { id: participacaoId } });
    return this.resumo(await this.turma(consultoriaId, empresaId, turmaId));
  }

  async gerarPdf(consultoriaId: string, empresaId: string, turmaId: string, documento: 'lista' | 'certificados') {
    const turma = await this.turma(consultoriaId, empresaId, turmaId);
    const { empresa, logoEmpresa, consultoria } = await this.contexto.carregar(consultoriaId, empresaId, 'TREINAMENTO');
    const dados = { ...turma, validade: validadeDaTurma(turma) };
    const pessoas = turma.participantes.map((p) => ({ nome: p.colaborador.nome, cpf: p.colaborador.cpf, cargo: p.colaborador.cargo, codigo: p.codigo }));

    if (documento === 'lista') {
      const rostos = await this.prisma.presencaFacial.findMany({ where: { tipo: 'TREINAMENTO', refId: turmaId }, select: { colaboradorId: true, codigo: true } });
      const lista = turma.participantes.map((p) => ({ nome: p.colaborador.nome, cpf: p.colaborador.cpf, cargo: p.colaborador.cargo, codigo: p.codigo, rosto: rostos.find((r) => r.colaboradorId === p.colaboradorId)?.codigo ?? null }));
      const moldura = { titulo: 'Lista de presença de treinamento', logoEmpresa, consultoria, aviso: AVISO, infos: [['Empresa', empresa.razaoSocial], ['CNPJ', empresa.cnpj]] as [string, string][] };
      return this.pdf.render(listaPresencaHtml(moldura, dados, lista));
    }
    const comQr = await Promise.all(
      pessoas.map(async (p) => {
        const urlValidacao = `${WEB()}/validar/${p.codigo}`;
        return { ...p, urlValidacao, qrDataUri: await QRCode.toDataURL(urlValidacao, { margin: 0, width: 200 }) };
      }),
    );
    return this.pdf.render(certificadosHtml({ logoEmpresa, consultoria, aviso: AVISO, infos: [] }, empresa.razaoSocial, dados, comQr));
  }

  // Consulta pública do QR Code: mostra só o necessário para confirmar o certificado.
  async validar(codigo: string) {
    const p = await this.prisma.participacao.findUnique({
      where: { codigo: codigo.toUpperCase() },
      include: { colaborador: true, turma: { include: { empresa: { include: { consultoria: true } } } } },
    });
    if (!p) throw new NotFoundException('Certificado não encontrado. Confira o código.');
    const validade = validadeDaTurma(p.turma);
    const cpf = p.colaborador.cpf?.replace(/\D/g, '');
    return {
      codigo: p.codigo,
      participante: p.colaborador.nome,
      cpf: cpf && cpf.length === 11 ? `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**` : null,
      treinamento: p.turma.nome,
      norma: p.turma.norma,
      cargaHoraria: p.turma.cargaHoraria,
      inicio: p.turma.inicio,
      fim: p.turma.fim,
      instrutor: p.turma.instrutor,
      empresa: p.turma.empresa.razaoSocial,
      consultoria: p.turma.empresa.consultoria.nome,
      validade,
      situacao: validade && validade < new Date() ? 'VENCIDO' : 'VALIDO',
    };
  }
}
