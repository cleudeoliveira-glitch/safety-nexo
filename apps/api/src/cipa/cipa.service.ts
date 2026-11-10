import { Injectable, NotFoundException } from '@nestjs/common';
import { ContextoDocumentoService } from '../documentos/contexto.service';
import { PdfService } from '../documentos/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { renderCipaHtml } from './cipa.template';
import { calendarioCipa, dimensionarCipa } from './dimensionamento';
import { CipaDto } from './dto';

type EmpresaCipa = {
  grauRisco: number | null;
  numFuncionarios: number;
  atendidaSesmt: boolean;
  cipaInicioMandato: Date | null;
  cipaRepresentante: string | null;
};

// Junta dimensionamento e calendário: o painel e o PDF usam a mesma conta.
export function situacaoCipa(empresa: EmpresaCipa) {
  return {
    grauRisco: empresa.grauRisco,
    numFuncionarios: empresa.numFuncionarios,
    atendidaSesmt: empresa.atendidaSesmt,
    representante: empresa.cipaRepresentante,
    dimensionamento: dimensionarCipa(empresa.grauRisco, empresa.numFuncionarios),
    calendario: empresa.cipaInicioMandato ? calendarioCipa(empresa.cipaInicioMandato) : null,
  };
}

@Injectable()
export class CipaService {
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

  async situacao(consultoriaId: string, empresaId: string) {
    return situacaoCipa(await this.empresa(consultoriaId, empresaId));
  }

  async salvar(consultoriaId: string, empresaId: string, dto: CipaDto) {
    await this.empresa(consultoriaId, empresaId);
    const empresa = await this.prisma.empresa.update({
      where: { id: empresaId },
      data: {
        atendidaSesmt: dto.atendidaSesmt,
        cipaInicioMandato: dto.inicioMandato === undefined ? undefined : new Date(dto.inicioMandato),
        cipaRepresentante: dto.representante === undefined ? undefined : dto.representante.trim() || null,
      },
    });
    return situacaoCipa(empresa);
  }

  async gerarPdf(consultoriaId: string, empresaId: string) {
    const { empresa, logoEmpresa, consultoria, geradoEm } = await this.contexto.carregar(consultoriaId, empresaId, 'CIPA');
    const html = renderCipaHtml(
      {
        titulo: 'Dimensionamento da CIPA',
        logoEmpresa,
        consultoria,
        infos: [
          ['Empresa', empresa.razaoSocial],
          ['CNPJ', empresa.cnpj],
          ['CNAE', empresa.cnae ?? '—'],
          ['Emitido em', geradoEm.toLocaleDateString('pt-BR')],
        ],
        aviso: 'Feito com o Safety Nexo. Segue a NR-05.',
      },
      situacaoCipa(empresa),
    );
    return this.pdf.render(html);
  }
}
