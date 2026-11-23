import { Controller, Get, Module, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ArquivoModule } from '../arquivo/arquivo.module';
import { ConsultoriaId } from '../common/consultoria.decorator';
import { DocumentosModule } from '../documentos/documentos.module';
import { enviarPdf } from '../documentos/documentos.controller';
import { TreinamentosModule } from '../treinamentos/treinamentos.module';
import { FiscalizacaoService } from './fiscalizacao.service';

// Só a consultoria: é ela que prepara a empresa para a visita do auditor fiscal.
@Controller('empresas/:empresaId/fiscalizacao')
export class FiscalizacaoController {
  constructor(private readonly f: FiscalizacaoService) {}
  @Get() conferir(@ConsultoriaId() c: string, @Param('empresaId') e: string) { return this.f.conferir(c, e); }
  @Post('pasta') async pasta(@ConsultoriaId() c: string, @Param('empresaId') e: string, @Res() res: Response) {
    enviarPdf(res, await this.f.gerar(c, e), 'Pasta-da-fiscalizacao.pdf');
  }
}

@Module({
  imports: [ArquivoModule, DocumentosModule, TreinamentosModule],
  controllers: [FiscalizacaoController],
  providers: [FiscalizacaoService],
})
export class FiscalizacaoModule {}
