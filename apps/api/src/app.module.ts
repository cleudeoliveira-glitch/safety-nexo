import { CalculosModule } from './calculos/calculos';
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { DiagnosticoModule } from './diagnostico/diagnostico';
import { CnaeModule } from './cnae/cnae.module';
import { AcessosModule } from './acessos/acessos';
import { CipaModule } from './cipa/cipa.module';
import { SaudeModule } from './saude/saude.module';
import { LaudosModule } from './laudos/laudos.module';
import { EsocialModule } from './esocial/esocial.module';
import { HistoricoModule } from './historico/historico.module';
import { LixeiraModule } from './lixeira/lixeira';
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
import { PresencaModule } from './presenca/presenca.module';
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
import { ConferenciaModule } from './conferencia/conferencia.module';
import { DossieModule } from './dossie/dossie.module';
import { FiscalizacaoModule } from './fiscalizacao/fiscalizacao.module';
import { RelatorioMensalModule } from './relatorio-mensal/relatorio-mensal.module';
import { PrismaModule } from './prisma/prisma.module';
import { NormasModule } from './normas/normas';
import { IaModule } from './ia/ia.controller';
import { PrevencaoModule } from './prevencao/prevencao.controller';
import { PortalModule } from './portal/portal';
import { AvisosModule } from './avisos/avisos';
import { PagamentosModule } from './pagamentos/pagamentos';
import { ContaModule } from './conta/conta';
import { PushModule } from './push/push';
import { SuporteModule } from './suporte/suporte';

import { ExclusoesModule } from './exclusoes/exclusoes';
@Module({
  imports: [PushModule, AuthModule, AdminModule, DiagnosticoModule, PrismaModule, CnaeModule, EmpresasModule, DocumentosModule, LogosModule, PainelModule, ColaboradoresModule, CipaModule, OperacaoModule, TreinamentosModule, AcessosModule, SaudeModule, LaudosModule, InspecoesModule, EmergenciaModule, EsocialModule, HistoricoModule, ComercialModule, ConectoresModule, ArquivoModule, AssinaturasModule, PsicossocialModule, CulturaModule, FapModule, ImportacaoModule, ProntuarioModule, SsmaModule, RostoModule, EstoqueModule, PresencaModule, NormasModule, IaModule, PrevencaoModule, PortalModule, AvisosModule, PagamentosModule, ContaModule, CalculosModule, ConferenciaModule, DossieModule, FiscalizacaoModule, RelatorioMensalModule, SuporteModule, ExclusoesModule, LixeiraModule],
  controllers: [HealthController],
})
export class AppModule {}
