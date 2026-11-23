import { Controller, Module, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { ConferenciaModule } from '../conferencia/conferencia.module';
import { DocumentosModule } from '../documentos/documentos.module';
import { enviarPdf } from '../documentos/documentos.controller';
import { PainelModule } from '../painel/painel.module';
import { periodoDoMes, RelatorioMensalService } from './relatorio-mensal.service';

// Só a consultoria: é a prestação de contas dela para o cliente.
@Controller('empresas/:empresaId/relatorio-mensal')
export class RelatorioMensalController {
  constructor(private readonly r: RelatorioMensalService) {}
  @Post() async gerar(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Query('mes') mes: string | undefined, @Res() res: Response) {
    enviarPdf(res, await this.r.gerar(c, e, mes), `Relatorio-mensal-${periodoDoMes(mes).chave}.pdf`);
  }
}

@Module({
  imports: [DocumentosModule, PainelModule, ConferenciaModule],
  controllers: [RelatorioMensalController],
  providers: [RelatorioMensalService],
})
export class RelatorioMensalModule {}
