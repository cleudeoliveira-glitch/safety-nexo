import { Controller, Module, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ColaboradoresModule } from '../colaboradores/colaboradores.module';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { DocumentosModule } from '../documentos/documentos.module';
import { enviarPdf } from '../documentos/documentos.controller';
import { LaudosModule } from '../laudos/laudos.module';
import { TreinamentosModule } from '../treinamentos/treinamentos.module';
import { DossieService } from './dossie.service';

// Só a consultoria: o dossiê é preparado por ela para a defesa da empresa.
@Controller('empresas/:empresaId/colaboradores/:colaboradorId/dossie')
export class DossieController {
  constructor(private readonly d: DossieService) {}
  @Post() async gerar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Param('colaboradorId') id: string, @Res() res: Response) {
    enviarPdf(res, await this.d.gerar(c, e, id), 'Dossie-do-trabalhador.pdf');
  }
}

@Module({
  imports: [DocumentosModule, ColaboradoresModule, LaudosModule, TreinamentosModule],
  controllers: [DossieController],
  providers: [DossieService],
  exports: [DossieService],
})
export class DossieModule {}
