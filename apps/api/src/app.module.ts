import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CnaeModule } from './cnae/cnae.module';
import { AcessosModule } from './acessos/acessos';
import { CipaModule } from './cipa/cipa.module';
import { SaudeModule } from './saude/saude.module';
import { LaudosModule } from './laudos/laudos.module';
import { EsocialModule } from './esocial/esocial.module';
import { HistoricoModule } from './historico/historico.module';
import { ComercialModule } from './comercial/comercial.module';
import { ConectoresModule } from './conectores/conectores.module';
import { ArquivoModule } from './arquivo/arquivo.module';
import { AssinaturasModule } from './assinaturas/assinaturas.module';
import { PsicossocialModule } from './psicossocial/psicossocial.module';
import { CulturaModule } from './cultura/cultura.module';
import { FapModule } from './fap/fap.module';
import { ImportacaoModule } from './importacao/importacao.module';
import { ProntuarioModule } from './prontuario/prontuario.module';
import { SsmaModule } from './ssma/ssma.module';
import { RostoModule } from './rosto/rosto.module';
import { EstoqueModule } from './estoque/estoque.module';
import { EmergenciaModule } from './emergencia/emergencia.module';
import { InspecoesModule } from './inspecoes/inspecoes.module';
import { OperacaoModule } from './operacao/operacao.module';
import { TreinamentosModule } from './treinamentos/treinamentos.module';
import { ColaboradoresModule } from './colaboradores/colaboradores.module';
import { DocumentosModule } from './documentos/documentos.module';
import { EmpresasModule } from './empresas/empresas.module';
import { HealthController } from './health/health.controller';
import { LogosModule } from './logos/logos.module';
import { PainelModule } from './painel/painel.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule, CnaeModule, EmpresasModule, DocumentosModule, LogosModule, PainelModule, ColaboradoresModule, CipaModule, OperacaoModule, TreinamentosModule, AcessosModule, SaudeModule, LaudosModule, InspecoesModule, EmergenciaModule, EsocialModule, HistoricoModule, ComercialModule, ConectoresModule, ArquivoModule, AssinaturasModule, PsicossocialModule, CulturaModule, FapModule, ImportacaoModule, ProntuarioModule, SsmaModule, RostoModule, EstoqueModule],
  controllers: [HealthController],
})
export class AppModule {}
