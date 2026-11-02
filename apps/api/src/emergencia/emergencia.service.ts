import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { validadeDaTurma } from '../treinamentos/treinamentos.service';
import { ConfigEmergenciaDto, ControleDto } from './dto';
import { dimensionarBrigada, ehLinha } from './it17';
import { planoHtml } from './templates';

export type ConfigEmergencia = ConfigEmergenciaDto;
export const NORMA_BRIGADA = 'IT-17';

@Injectable()
export class EmergenciaService {
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

  // Brigadistas = quem fez turma de brigada (norma IT-17) ainda válida.
  async brigadistas(empresaId: string, hoje = new Date()) {
    const turmas = await this.prisma.turma.findMany({
      where: { empresaId, norma: NORMA_BRIGADA },
      orderBy: { fim: 'desc' },
      include: { participantes: { include: { colaborador: { select: { id: true, nome: true, cargo: true } } } } },
    });
    const porPessoa = new Map<string, { nome: string; cargo: string; nivel: string; validade: Date | null }>();
    for (const t of turmas) {
      const validade = validadeDaTurma(t);
      for (const p of t.participantes) {
        if (porPessoa.has(p.colaborador.id)) continue;
        porPessoa.set(p.colaborador.id, { nome: p.colaborador.nome, cargo: p.colaborador.cargo, nivel: t.nome, validade });
      }
    }
    return [...porPessoa.values()].filter((b) => !b.validade || b.validade >= hoje).sort((a, b) => a.nome.localeCompare(b.nome));
  }

  async situacao(consultoriaId: string, empresaId: string) {
    const empresa = await this.empresa(consultoriaId, empresaId);
    const config = (empresa.emergencia ?? null) as ConfigEmergencia | null;
    const calculo = config ? dimensionarBrigada(config.divisao, config.risco, config.populacaoPorPavimento) : null;
    const [brigadistas, controles] = await Promise.all([
      this.brigadistas(empresaId),
      this.prisma.controleEmergencia.findMany({ where: { empresaId }, orderBy: [{ validade: 'asc' }, { createdAt: 'asc' }] }),
    ]);
    return { config, calculo, brigadistas, controles };
  }

  async salvarConfig(consultoriaId: string, empresaId: string, dto: ConfigEmergenciaDto) {
    await this.empresa(consultoriaId, empresaId);
    if (!ehLinha(dto.divisao, dto.risco)) throw new BadRequestException('Essa combinação de ocupação e risco não está na Tabela A.1 da IT 17.');
    await this.prisma.empresa.update({ where: { id: empresaId }, data: { emergencia: { ...dto } } });
    return this.situacao(consultoriaId, empresaId);
  }

  async criarControle(consultoriaId: string, empresaId: string, dto: ControleDto) {
    await this.empresa(consultoriaId, empresaId);
    return this.prisma.controleEmergencia.create({ data: { ...dto, empresaId, validade: dto.validade ? new Date(dto.validade) : null } });
  }

  async removerControle(consultoriaId: string, empresaId: string, id: string) {
    await this.empresa(consultoriaId, empresaId);
    const { count } = await this.prisma.controleEmergencia.deleteMany({ where: { id, empresaId } });
    if (!count) throw new NotFoundException('Item não encontrado');
    return { ok: true };
  }

  async plano(consultoriaId: string, empresaId: string) {
    const s = await this.situacao(consultoriaId, empresaId);
    if (!s.config || !s.calculo) throw new BadRequestException('Preencha a ocupação, o risco e a população antes de gerar o plano.');
    const { empresa, logoEmpresa, consultoria } = await this.contexto.carregar(consultoriaId, empresaId, 'PLANO_EMERGENCIA');
    const data = (x: Date | null) => (x ? x.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'sem validade');
    return this.pdf.render(
      planoHtml(
        {
          titulo: 'Plano de Emergência contra Incêndio',
          logoEmpresa,
          consultoria,
          infos: [['Empresa', empresa.razaoSocial], ['CNPJ', empresa.cnpj], ['Emitido em', new Date().toLocaleDateString('pt-BR')]],
          aviso: 'Documento gerado pelo Safety Nexo. Brigada dimensionada pela IT 17/2025 do CBPMESP: confira com a instrução técnica do seu estado.',
        },
        {
          ...s.config,
          populacao: s.config.populacaoPorPavimento,
          descricaoDivisao: s.calculo.linha.descricao,
          total: s.calculo.total,
          nivelTexto: s.calculo.nivelTexto,
          observacao: s.calculo.observacao,
          brigadistas: s.brigadistas.map((b) => ({ ...b, validade: data(b.validade) })),
          controles: s.controles,
        },
      ),
    );
  }
}
