import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CnaeService } from '../cnae/cnae.service';
import { ehAdminPlataforma } from '../admin/admin-plataforma';
import { conferirFuncionarios } from '../common/plano';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoExameDto, EsocialColaboradorDto, AvaliacaoRiscoDto, PericulosidadeDto, CreateColaboradorDto, CreateEmpresaDto, CreateExameGheDto, CopiarDadosDto, CreateGheDto, CreateGheRiscoDto, UpdateGheRiscoDto, MedicoPcmsoDto, UpdateEmpresaDto } from './dto';
import { chaveFuncao, FuncaoGhe, lerFuncoes } from './ghe-ambiente';

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
      include: { _count: { select: { empresas: true } }, usuarios: { select: { email: true } } },
    });
    if (!consultoria) throw new NotFoundException('Consultoria não encontrada');
    // A consultoria do dono da plataforma usa o sistema inteiro, sem plano e sem limite.
    const doDono = consultoria.usuarios.some((u) => ehAdminPlataforma(u.email));
    if (!doDono && consultoria._count.empresas >= consultoria.limiteEmpresas) {
      throw new ForbiddenException('Você chegou ao limite de empresas do seu plano. Abra "Meu plano" no menu para escolher um plano maior.');
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
    conferirFuncionarios(await this.prisma.colaborador.count({ where: { empresaId } }), 1);
    if (dto.gheId) {
      const ghe = await this.prisma.ghe.findFirst({ where: { id: dto.gheId, empresaId } });
      if (!ghe) throw new NotFoundException('GHE não encontrado nesta empresa');
    }
    // Sem GHE escolhido, entra no GHE da sua função.
    const gheId = dto.gheId || (await this.gheDaFuncao(empresaId, dto.cargo)) || undefined;
    return this.prisma.colaborador.create({
      data: { ...dto, gheId, empresaId, dataAdmissao: dto.dataAdmissao ? new Date(dto.dataAdmissao) : undefined },
    });
  }

  // Matrícula, categoria e CPF para os eventos do eSocial.
  async dadosEsocialColaborador(consultoriaId: string, empresaId: string, colaboradorId: string, dto: EsocialColaboradorDto) {
    await this.buscar(consultoriaId, empresaId);
    const limpo = (v?: string) => (v === undefined ? undefined : v.trim() || null);
    const { count } = await this.prisma.colaborador.updateMany({
      where: { id: colaboradorId, empresaId },
      data: { matricula: limpo(dto.matricula), codCateg: limpo(dto.codCateg), cpf: limpo(dto.cpf) },
    });
    if (!count) throw new NotFoundException('Colaborador não encontrado nesta empresa');
    return this.prisma.colaborador.findUnique({ where: { id: colaboradorId } });
  }

  async codigoExame(consultoriaId: string, empresaId: string, gheId: string, exameId: string, dto: CodigoExameDto) {
    await this.buscar(consultoriaId, empresaId);
    const { count } = await this.prisma.exameGhe.updateMany({ where: { id: exameId, gheId, ghe: { empresaId } }, data: { codigoEsocial: dto.codigoEsocial || null } });
    if (!count) throw new NotFoundException('Exame não encontrado neste GHE');
    return this.prisma.exameGhe.findUnique({ where: { id: exameId } });
  }

  async listarGhes(consultoriaId: string, empresaId: string) {
    await this.buscar(consultoriaId, empresaId);
    return this.prisma.ghe.findMany({
      where: { empresaId },
      include: { riscos: true, exames: true, _count: { select: { colaboradores: { where: { dataDesligamento: null } } } } },
      orderBy: { nome: 'asc' },
    });
  }

  // Copia GHEs (com riscos, avaliações e exames) de outra empresa da mesma consultoria, para clientes parecidos.
  // GHE com o mesmo nome no destino é pulado. Opcionalmente leva o médico do PCMSO e o responsável técnico.
  async copiarDe(consultoriaId: string, destinoId: string, dto: CopiarDadosDto) {
    if (destinoId === dto.origemId) throw new BadRequestException('Escolha outra empresa para copiar.');
    await this.buscar(consultoriaId, destinoId);
    const origem = await this.buscar(consultoriaId, dto.origemId);
    const ghes = await this.prisma.ghe.findMany({
      where: { empresaId: origem.id, ...(dto.gheIds?.length ? { id: { in: dto.gheIds } } : {}) },
      include: { riscos: true, exames: true },
    });
    const existentes = new Set((await this.prisma.ghe.findMany({ where: { empresaId: destinoId }, select: { nome: true } })).map((g) => g.nome.trim().toLowerCase()));
    const copiados: string[] = []; const pulados: string[] = [];
    for (const g of ghes) {
      if (existentes.has(g.nome.trim().toLowerCase())) { pulados.push(g.nome); continue; }
      await this.prisma.ghe.create({
        data: {
          empresaId: destinoId, nome: g.nome, descricao: g.descricao, setor: g.setor, funcoes: g.funcoes ?? undefined, ambiente: g.ambiente ?? undefined, periculosidadeAnexo: g.periculosidadeAnexo, periculosidadeJustificativa: g.periculosidadeJustificativa,
          riscos: { create: g.riscos.map(({ id: _i, gheId: _g, esocial, ...r }) => ({ ...r, esocial: esocial ?? undefined })) },
          exames: { create: g.exames.map(({ id: _i, gheId: _g, ...e }) => e) },
        },
      });
      copiados.push(g.nome);
    }
    if (dto.responsaveis) {
      await this.prisma.empresa.update({
        where: { id: destinoId },
        data: {
          medicoPcmsoNome: origem.medicoPcmsoNome, medicoPcmsoCrm: origem.medicoPcmsoCrm, medicoPcmsoCpf: origem.medicoPcmsoCpf, medicoPcmsoUf: origem.medicoPcmsoUf,
          responsavelTecnicoNome: origem.responsavelTecnicoNome, responsavelTecnicoRegistro: origem.responsavelTecnicoRegistro, responsavelTecnicoCpf: origem.responsavelTecnicoCpf,
          responsavelTecnicoConselho: origem.responsavelTecnicoConselho, responsavelTecnicoUf: origem.responsavelTecnicoUf,
        },
      });
    }
    return { copiados, pulados, responsaveis: !!dto.responsaveis };
  }

  // GHE por setor e função. O nome sai no padrão "GHE 01 · Setor" quando não vem pronto.
  async criarGhe(consultoriaId: string, empresaId: string, dto: CreateGheDto) {
    await this.buscar(consultoriaId, empresaId);
    const funcoes = this.funcoesSemRepetir(dto.funcoes);
    const nome = dto.nome?.trim() || `GHE ${String((await this.prisma.ghe.count({ where: { empresaId } })) + 1).padStart(2, '0')} · ${dto.setor.trim()}`;
    if (await this.prisma.ghe.findFirst({ where: { empresaId, nome } })) throw new BadRequestException(`Já existe um GHE com o nome "${nome}".`);
    const ghe = await this.prisma.ghe.create({
      data: { empresaId, nome, setor: dto.setor.trim(), funcoes, ambiente: (dto.ambiente ?? {}) as object, descricao: dto.descricao?.trim() || null },
    });
    await this.vincularPorFuncao(empresaId, ghe.id, funcoes);
    return ghe;
  }

  // Apaga o GHE com os riscos e exames dele. Os colaboradores ficam sem GHE, nada mais é apagado.
  async excluirGhe(consultoriaId: string, empresaId: string, gheId: string) {
    await this.buscar(consultoriaId, empresaId);
    const ghe = await this.prisma.ghe.findFirst({ where: { id: gheId, empresaId }, select: { id: true, nome: true } });
    if (!ghe) throw new NotFoundException('GHE não encontrado nesta empresa');
    await this.prisma.ghe.delete({ where: { id: ghe.id } });
    return { ok: true, nome: ghe.nome };
  }

  // Apaga a empresa e tudo o que é dela. Só com o nome digitado igual, para não apagar por engano.
  async excluir(consultoriaId: string, empresaId: string, confirmacao: string) {
    const empresa = await this.buscar(consultoriaId, empresaId);
    const limpo = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (limpo(confirmacao) !== limpo(empresa.razaoSocial)) throw new BadRequestException('Para excluir, digite o nome da empresa exatamente como está no cadastro.');
    await this.prisma.empresa.delete({ where: { id: empresaId } });
    return { ok: true };
  }

  async atualizarGhe(consultoriaId: string, empresaId: string, gheId: string, dto: CreateGheDto) {
    await this.buscar(consultoriaId, empresaId);
    const atual = await this.prisma.ghe.findFirst({ where: { id: gheId, empresaId } });
    if (!atual) throw new NotFoundException('GHE não encontrado nesta empresa');
    const funcoes = this.funcoesSemRepetir(dto.funcoes);
    const nome = dto.nome?.trim() || atual.nome;
    if (nome !== atual.nome) {
      if (await this.prisma.ghe.findFirst({ where: { empresaId, nome, NOT: { id: gheId } } })) throw new BadRequestException(`Já existe um GHE com o nome "${nome}".`);
      // O psicossocial guarda o setor pelo nome do GHE: acompanha a troca para não perder respostas.
      await this.prisma.respostaPsicossocial.updateMany({ where: { setor: atual.nome, avaliacao: { empresaId } }, data: { setor: nome } });
      await this.prisma.acaoPsicossocial.updateMany({ where: { setor: atual.nome, avaliacao: { empresaId } }, data: { setor: nome } });
    }
    const ghe = await this.prisma.ghe.update({
      where: { id: gheId },
      data: { nome, setor: dto.setor.trim(), funcoes, ambiente: (dto.ambiente ?? {}) as object, descricao: dto.descricao?.trim() || null },
    });
    await this.vincularPorFuncao(empresaId, ghe.id, funcoes);
    return ghe;
  }

  private funcoesSemRepetir(lista: FuncaoGhe[]): FuncaoGhe[] {
    const vistas = new Set<string>();
    return lerFuncoes(lista).filter((f) => !vistas.has(chaveFuncao(f.nome)) && vistas.add(chaveFuncao(f.nome)));
  }

  // Quem ainda não tem GHE e tem a mesma função entra no GHE sozinho. Quem já tem GHE fica onde está.
  private async vincularPorFuncao(empresaId: string, gheId: string, funcoes: FuncaoGhe[]) {
    const chaves = new Set(funcoes.map((f) => chaveFuncao(f.nome)));
    const sem = await this.prisma.colaborador.findMany({ where: { empresaId, gheId: null }, select: { id: true, cargo: true } });
    const ids = sem.filter((c) => chaves.has(chaveFuncao(c.cargo))).map((c) => c.id);
    if (ids.length) await this.prisma.colaborador.updateMany({ where: { id: { in: ids } }, data: { gheId } });
  }

  // GHE cuja lista de funções tem o cargo do colaborador.
  private async gheDaFuncao(empresaId: string, cargo: string): Promise<string | null> {
    const chave = chaveFuncao(cargo);
    const ghes = await this.prisma.ghe.findMany({ where: { empresaId }, select: { id: true, funcoes: true }, orderBy: { nome: 'asc' } });
    return ghes.find((g) => lerFuncoes(g.funcoes).some((f) => chaveFuncao(f.nome) === chave))?.id ?? null;
  }

  async criarRisco(consultoriaId: string, empresaId: string, gheId: string, dto: CreateGheRiscoDto) {
    await this.buscar(consultoriaId, empresaId);
    const ghe = await this.prisma.ghe.findFirst({ where: { id: gheId, empresaId } });
    if (!ghe) throw new NotFoundException('GHE não encontrado nesta empresa');
    return this.prisma.gheRisco.create({ data: { ...dto, gheId } });
  }

  async ajustarRisco(consultoriaId: string, empresaId: string, gheId: string, riscoId: string, dto: UpdateGheRiscoDto) {
    await this.buscar(consultoriaId, empresaId);
    const risco = await this.prisma.gheRisco.findFirst({ where: { id: riscoId, gheId, ghe: { empresaId } } });
    if (!risco) throw new NotFoundException('Risco não encontrado nesta empresa');
    const vazioVira = (v?: string) => (v === undefined ? undefined : v.trim() || null);
    return this.prisma.gheRisco.update({
      where: { id: riscoId },
      data: { severidade: dto.severidade, probabilidade: dto.probabilidade, possiveisLesoes: vazioVira(dto.possiveisLesoes), medidasControle: vazioVira(dto.medidasControle) },
    });
  }

  async avaliarRisco(consultoriaId: string, empresaId: string, gheId: string, riscoId: string, dto: AvaliacaoRiscoDto) {
    await this.buscar(consultoriaId, empresaId);
    const risco = await this.prisma.gheRisco.findFirst({ where: { id: riscoId, gheId, ghe: { empresaId } } });
    if (!risco) throw new NotFoundException('Risco não encontrado nesta empresa');
    const vazioVira = (v?: string) => (v === undefined ? undefined : v.trim() || null);
    return this.prisma.gheRisco.update({
      where: { id: riscoId },
      data: {
        ...dto,
        esocial: dto.esocial ? JSON.parse(JSON.stringify(dto.esocial)) : undefined,
        intensidade: vazioVira(dto.intensidade),
        limiteTolerancia: vazioVira(dto.limiteTolerancia),
        tecnicaMedicao: vazioVira(dto.tecnicaMedicao),
        epiCa: vazioVira(dto.epiCa),
        codigoAnexoIv: vazioVira(dto.codigoAnexoIv),
        anexoNr15: dto.anexoNr15 === null ? null : vazioVira(dto.anexoNr15),
      },
    });
  }

  async definirPericulosidade(consultoriaId: string, empresaId: string, gheId: string, dto: PericulosidadeDto) {
    await this.buscar(consultoriaId, empresaId);
    const ghe = await this.prisma.ghe.findFirst({ where: { id: gheId, empresaId } });
    if (!ghe) throw new NotFoundException('GHE não encontrado nesta empresa');
    return this.prisma.ghe.update({
      where: { id: gheId },
      data: { periculosidadeAnexo: dto.anexo, periculosidadeJustificativa: dto.justificativa?.trim() || null },
    });
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
