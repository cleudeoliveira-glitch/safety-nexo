import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { ExcluirEmpresaDto, CopiarDadosDto, CodigoExameDto, EsocialColaboradorDto, AvaliacaoRiscoDto, PericulosidadeDto, CreateColaboradorDto, CreateEmpresaDto, CreateExameGheDto, CreateGheDto, CreateGheRiscoDto, UpdateGheRiscoDto, MedicoPcmsoDto, UpdateEmpresaDto } from './dto';
import { EmpresasService } from './empresas.service';
import { Sessao, SessaoUsuario } from '../common/sessao.decorator';
import { PermiteEmpresa } from '../auth/permite-empresa.decorator';

@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresas: EmpresasService) {}

  @PermiteEmpresa()
  @Get()
  listar(@Sessao() sessao: SessaoUsuario) {
    // A empresa cliente só enxerga a si mesma.
    if (sessao.papel === 'EMPRESA') return this.empresas.listar(sessao.consultoriaId, sessao.empresaId);
    return this.empresas.listar(sessao.consultoriaId);
  }

  @Post()
  criar(@ConsultoriaId() consultoriaId: string, @Body() dto: CreateEmpresaDto) {
    return this.empresas.criar(consultoriaId, dto);
  }

  @PermiteEmpresa()
  @Get(':empresaId')
  buscar(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string) {
    return this.empresas.buscar(consultoriaId, empresaId);
  }

  @Patch(':empresaId')
  atualizar(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string, @Body() dto: UpdateEmpresaDto) {
    return this.empresas.atualizar(consultoriaId, empresaId, dto);
  }

  @PermiteEmpresa()
  @Get(':empresaId/colaboradores')
  listarColaboradores(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string) {
    return this.empresas.listarColaboradores(consultoriaId, empresaId);
  }

  @PermiteEmpresa()
  @Post(':empresaId/colaboradores')
  criarColaborador(
    @ConsultoriaId() consultoriaId: string,
    @Param('empresaId') empresaId: string,
    @Body() dto: CreateColaboradorDto,
  ) {
    return this.empresas.criarColaborador(consultoriaId, empresaId, dto);
  }

  @PermiteEmpresa()
  @Get(':empresaId/ghes')
  listarGhes(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string) {
    return this.empresas.listarGhes(consultoriaId, empresaId);
  }

  @Post(':empresaId/copiar-de')
  copiarDe(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string, @Body() dto: CopiarDadosDto) {
    return this.empresas.copiarDe(consultoriaId, empresaId, dto);
  }

  @Post(':empresaId/ghes')
  criarGhe(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string, @Body() dto: CreateGheDto) {
    return this.empresas.criarGhe(consultoriaId, empresaId, dto);
  }

  // Só a consultoria exclui (a empresa cliente não tem acesso). Pede o nome da empresa como confirmação.
  @Post(':empresaId/excluir')
  excluir(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string, @Body() dto: ExcluirEmpresaDto) {
    return this.empresas.excluir(consultoriaId, empresaId, dto.confirmacao);
  }

  @Delete(':empresaId/ghes/:gheId')
  excluirGhe(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string, @Param('gheId') gheId: string) {
    return this.empresas.excluirGhe(consultoriaId, empresaId, gheId);
  }

  @Put(':empresaId/ghes/:gheId')
  atualizarGhe(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string, @Param('gheId') gheId: string, @Body() dto: CreateGheDto) {
    return this.empresas.atualizarGhe(consultoriaId, empresaId, gheId, dto);
  }

  @Post(':empresaId/ghes/:gheId/riscos')
  criarRisco(
    @ConsultoriaId() consultoriaId: string,
    @Param('empresaId') empresaId: string,
    @Param('gheId') gheId: string,
    @Body() dto: CreateGheRiscoDto,
  ) {
    return this.empresas.criarRisco(consultoriaId, empresaId, gheId, dto);
  }

  @Post(':empresaId/ghes/:gheId/exames')
  criarExame(
    @ConsultoriaId() consultoriaId: string,
    @Param('empresaId') empresaId: string,
    @Param('gheId') gheId: string,
    @Body() dto: CreateExameGheDto,
  ) {
    return this.empresas.criarExame(consultoriaId, empresaId, gheId, dto);
  }

  @Put(':empresaId/colaboradores/:colaboradorId/esocial')
  dadosEsocialColaborador(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('colaboradorId') id: string, @Body() dto: EsocialColaboradorDto) {
    return this.empresas.dadosEsocialColaborador(c, e, id, dto);
  }

  @Put(':empresaId/ghes/:gheId/exames/:exameId/codigo')
  codigoExame(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('gheId') g: string, @Param('exameId') x: string, @Body() dto: CodigoExameDto) {
    return this.empresas.codigoExame(c, e, g, x, dto);
  }

  @Put(':empresaId/ghes/:gheId/periculosidade')
  definirPericulosidade(
    @ConsultoriaId() consultoriaId: string,
    @Param('empresaId') empresaId: string,
    @Param('gheId') gheId: string,
    @Body() dto: PericulosidadeDto,
  ) {
    return this.empresas.definirPericulosidade(consultoriaId, empresaId, gheId, dto);
  }

  @Patch(':empresaId/ghes/:gheId/riscos/:riscoId')
  ajustarRisco(
    @ConsultoriaId() consultoriaId: string,
    @Param('empresaId') empresaId: string,
    @Param('gheId') gheId: string,
    @Param('riscoId') riscoId: string,
    @Body() dto: UpdateGheRiscoDto,
  ) {
    return this.empresas.ajustarRisco(consultoriaId, empresaId, gheId, riscoId, dto);
  }

  @Put(':empresaId/ghes/:gheId/riscos/:riscoId/avaliacao')
  avaliarRisco(
    @ConsultoriaId() consultoriaId: string,
    @Param('empresaId') empresaId: string,
    @Param('gheId') gheId: string,
    @Param('riscoId') riscoId: string,
    @Body() dto: AvaliacaoRiscoDto,
  ) {
    return this.empresas.avaliarRisco(consultoriaId, empresaId, gheId, riscoId, dto);
  }

  @Put(':empresaId/pcmso/medico')
  definirMedicoPcmso(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string, @Body() dto: MedicoPcmsoDto) {
    return this.empresas.definirMedicoPcmso(consultoriaId, empresaId, dto);
  }
}
