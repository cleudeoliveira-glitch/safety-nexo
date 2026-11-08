import { Controller, Param, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { LogosService } from './logos.service';

@Controller()
export class LogosController {
  constructor(private readonly logos: LogosService) {}

  @Put('empresas/:empresaId/logo')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 2 * 1024 * 1024 } }))
  logoEmpresa(
    @ConsultoriaId() consultoriaId: string,
    @Param('empresaId') empresaId: string,
    @UploadedFile() arquivo?: Express.Multer.File,
  ) {
    return this.logos.salvarLogoEmpresa(consultoriaId, empresaId, arquivo);
  }

  @Put('consultoria/logo')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 2 * 1024 * 1024 } }))
  logoConsultoria(@ConsultoriaId() consultoriaId: string, @UploadedFile() arquivo?: Express.Multer.File) {
    return this.logos.salvarLogoConsultoria(consultoriaId, arquivo);
  }
}
