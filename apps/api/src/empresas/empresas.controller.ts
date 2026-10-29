import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { CreateColaboradorDto, CreateEmpresaDto, CreateExameGheDto, CreateGheDto, CreateGheRiscoDto, MedicoPcmsoDto, UpdateEmpresaDto } from './dto';
import { EmpresasService } from './empresas.service';

@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresas: EmpresasService) {}

  @Get()
  listar(@ConsultoriaId() consultoriaId: string) {
    return this.empresas.listar(consultoriaId);
  }

  @Post()
  criar(@ConsultoriaId() consultoriaId: string, @Body() dto: CreateEmpresaDto) {
    return this.empresas.criar(consultoriaId, dto);
  }

  @Get(':empresaId')
  buscar(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string) {
    return this.empresas.buscar(consultoriaId, empresaId);
  }

  @Patch(':empresaId')
  atualizar(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string, @Body() dto: UpdateEmpresaDto) {
    return this.empresas.atualizar(consultoriaId, empresaId, dto);
  }

  @Get(':empresaId/colaboradores')
  listarColaboradores(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string) {
    return this.empresas.listarColaboradores(consultoriaId, empresaId);
  }

  @Post(':empresaId/colaboradores')
  criarColaborador(
    @ConsultoriaId() consultoriaId: string,
    @Param('empresaId') empresaId: string,
    @Body() dto: CreateColaboradorDto,
  ) {
    return this.empresas.criarColaborador(consultoriaId, empresaId, dto);
  }

  @Get(':empresaId/ghes')
  listarGhes(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string) {
    return this.empresas.listarGhes(consultoriaId, empresaId);
  }

  @Post(':empresaId/ghes')
  criarGhe(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string, @Body() dto: CreateGheDto) {
    return this.empresas.criarGhe(consultoriaId, empresaId, dto);
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

  @Put(':empresaId/pcmso/medico')
  definirMedicoPcmso(@ConsultoriaId() consultoriaId: string, @Param('empresaId') empresaId: string, @Body() dto: MedicoPcmsoDto) {
    return this.empresas.definirMedicoPcmso(consultoriaId, empresaId, dto);
  }
}
