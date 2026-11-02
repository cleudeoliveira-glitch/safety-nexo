import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CnaeService } from '../cnae/cnae.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateColaboradorDto, CreateEmpresaDto, CreateExameGheDto, CreateGheDto, CreateGheRiscoDto, MedicoPcmsoDto, UpdateEmpresaDto } from './dto';

@Injectable()
export class EmpresasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cnae: CnaeService,
  ) {}

  async listar(consultoriaId: string, somenteEmpresaId?: string | null) {
    return this.prisma.empresa.findMany({
      where: { consultoriaId, ...(somenteEmpresaId !== undefined ? { id: somenteEmpresaId ?? '' } : {}) },
      orderBy: { razaoSocial: 'asc' },
    });
  }

  async criar(consultoriaId: string, dto: CreateEmpresaDto) {
    const consultoria = await this.prisma.consultoria.findUnique({
      where: { id: consultoriaId },
      include: { _count: { select: { empresas: true } } },
    });
    if (!consultoria) throw new NotFoundException('Consultoria não encontrada');
    if (consultoria._count.empresas >= consultoria.limiteEmpresas) {
      throw new ForbiddenException('Limite de empresas do plano atingido. Faça upgrade para continuar.');
    }

    // Grau de risco vem da NR-04 pelo CNAE, a menos que a consultoria informe outro.
    const grauRisco = dto.grauRisco ?? (dto.cnae ? await this.cnae.grauDeRisco(dto.cnae) : null) ?? undefined;
    return this.prisma.empresa.create({ data: { ...dto, grauRisco, consultoriaId } });
  }

  async atualizar(consultoriaId: string, empresaId: string, dto: UpdateEmpresaDto) {
    await this.buscar(consultoriaId, empresaId);
    // CNAE novo sem grau informado: busca o grau pela NR-04.
    const grauRisco = dto.grauRisco ?? (dto.cnae ? await this.cnae.grauDeRisco(dto.cnae) : null) ?? undefined;
    return this.prisma.empresa.update({ where: { id: empresaId }, data: { ...dto, grauRisco } });
  }

  async buscar(consultoriaId: string, empresaId: string) {
    const empresa = await this.prisma.empresa.findFirst({
      where: { id: empresaId, consultoriaId },
    });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    return empresa;
  }

  async listarColaboradores(consultoriaId: string, empresaId: string) {
    await this.buscar(consultoriaId, empresaId);
    return this.prisma.colaborador.findMany({ where: { empresaId }, orderBy: { nome: 'asc' } });
  }

  async criarColaborador(consultoriaId: string, empresaId: string, dto: CreateColaboradorDto) {
    await this.buscar(consultoriaId, empresaId);
    if (dto.gheId) {
      const ghe = await this.prisma.ghe.findFirst({ where: { id: dto.gheId, empresaId } });
      if (!ghe) throw new NotFoundException('GHE não encontrado nesta empresa');
    }
    return this.prisma.colaborador.create({
      data: { ...dto, empresaId, dataAdmissao: dto.dataAdmissao ? new Date(dto.dataAdmissao) : undefined },
    });
  }

  async listarGhes(consultoriaId: string, empresaId: string) {
    await this.buscar(consultoriaId, empresaId);
    return this.prisma.ghe.findMany({
      where: { empresaId },
      include: { riscos: true, exames: true, _count: { select: { colaboradores: true } } },
      orderBy: { nome: 'asc' },
    });
  }

  async criarGhe(consultoriaId: string, empresaId: string, dto: CreateGheDto) {
    await this.buscar(consultoriaId, empresaId);
    return this.prisma.ghe.create({ data: { ...dto, empresaId } });
  }

  async criarRisco(consultoriaId: string, empresaId: string, gheId: string, dto: CreateGheRiscoDto) {
    await this.buscar(consultoriaId, empresaId);
    const ghe = await this.prisma.ghe.findFirst({ where: { id: gheId, empresaId } });
    if (!ghe) throw new NotFoundException('GHE não encontrado nesta empresa');
    return this.prisma.gheRisco.create({ data: { ...dto, gheId } });
  }

  async criarExame(consultoriaId: string, empresaId: string, gheId: string, dto: CreateExameGheDto) {
    await this.buscar(consultoriaId, empresaId);
    const ghe = await this.prisma.ghe.findFirst({ where: { id: gheId, empresaId } });
    if (!ghe) throw new NotFoundException('GHE não encontrado nesta empresa');
    return this.prisma.exameGhe.create({ data: { ...dto, gheId } });
  }

  async definirMedicoPcmso(consultoriaId: string, empresaId: string, dto: MedicoPcmsoDto) {
    await this.buscar(consultoriaId, empresaId);
    return this.prisma.empresa.update({
      where: { id: empresaId },
      data: { medicoPcmsoNome: dto.nome, medicoPcmsoCrm: dto.crm },
    });
  }
}
