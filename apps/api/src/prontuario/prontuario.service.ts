import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { limparAudiometria, limparEspirometria } from './audiometria';
import { RegistroSaudeDto } from './dto';
import { prontuarioHtml } from './template';

const dia = (v: string) => new Date(`${v.slice(0, 10)}T00:00:00Z`);

@Injectable()
export class ProntuarioService {
  constructor(private readonly prisma: PrismaService, private readonly contexto: ContextoDocumentoService, private readonly pdf: PdfService) {}

  private async colaborador(c: string, e: string, colaboradorId: string) {
    const col = await this.prisma.colaborador.findFirst({ where: { id: colaboradorId, empresaId: e, empresa: { consultoriaId: c } }, select: { id: true, nome: true, cpf: true, cargo: true } });
    if (!col) throw new NotFoundException('Funcionário não encontrado');
    return col;
  }

  async listar(c: string, e: string, colaboradorId?: string) {
    const emp = await this.prisma.empresa.findFirst({ where: { id: e, consultoriaId: c }, select: { id: true } });
    if (!emp) throw new NotFoundException('Empresa não encontrada');
    return this.prisma.registroSaude.findMany({ where: { empresaId: e, ...(colaboradorId ? { colaboradorId } : {}) }, orderBy: [{ data: 'desc' }, { createdAt: 'desc' }], include: { colaborador: { select: { nome: true } } } });
  }

  async criar(c: string, e: string, dto: RegistroSaudeDto) {
    await this.colaborador(c, e, dto.colaboradorId);
    let dados: Prisma.InputJsonValue | undefined;
    try {
      if (dto.tipo === 'AUDIOMETRIA') {
        const l = limparAudiometria(dto.dados);
        if (![...Object.values(l.od), ...Object.values(l.oe)].some((v) => v != null)) throw new Error('Digite os limiares da audiometria.');
        dados = l;
      } else if (dto.tipo === 'ESPIROMETRIA') dados = limparEspirometria(dto.dados);
    } catch (err) { throw new BadRequestException((err as Error).message); }
    if (dto.proximaData && dto.proximaData.slice(0, 10) < dto.data.slice(0, 10)) throw new BadRequestException('A próxima data não pode ser antes da data do registro.');
    return this.prisma.registroSaude.create({ data: {
      empresaId: e, colaboradorId: dto.colaboradorId, tipo: dto.tipo, data: dia(dto.data), titulo: dto.titulo.trim(), resultado: dto.resultado?.trim() || null,
      dados, profissional: dto.profissional?.trim() || null, lote: dto.tipo === 'VACINA' ? dto.lote?.trim() || null : null,
      proximaData: dto.proximaData ? dia(dto.proximaData) : null, observacao: dto.observacao?.trim() || null,
      alterado: dto.tipo !== 'VACINA' && !!dto.alterado,
    } });
  }

  async remover(c: string, e: string, id: string) {
    const r = await this.prisma.registroSaude.deleteMany({ where: { id, empresaId: e, empresa: { consultoriaId: c } } });
    if (!r.count) throw new NotFoundException('Registro não encontrado');
    return { ok: true };
  }

  async pdfProntuario(c: string, e: string, colaboradorId: string) {
    const col = await this.colaborador(c, e, colaboradorId);
    const [asos, regs, ctx] = await Promise.all([
      this.prisma.aso.findMany({ where: { colaboradorId }, orderBy: { dataExame: 'asc' } }),
      this.prisma.registroSaude.findMany({ where: { colaboradorId, empresaId: e }, orderBy: { data: 'asc' } }),
      this.contexto.carregar(c, e, 'PRONTUARIO'),
    ]);
    const m = { titulo: 'Prontuário de saúde ocupacional', logoEmpresa: ctx.logoEmpresa, consultoria: ctx.consultoria, aviso: 'Feito com o Safety Nexo. Contém dados de saúde: guarde com sigilo.',
      infos: [['Empresa', ctx.empresa.razaoSocial], ['Funcionário', col.nome], ['Cargo', col.cargo], ...(col.cpf ? [['CPF', col.cpf]] : [])] as [string, string][] };
    return { pdf: await this.pdf.render(prontuarioHtml(m, asos, regs)), nome: col.nome };
  }
}
