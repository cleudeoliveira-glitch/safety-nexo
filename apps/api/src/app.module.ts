import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CnaeModule } from './cnae/cnae.module';
import { CipaModule } from './cipa/cipa.module';
import { OperacaoModule } from './operacao/operacao.module';
import { ColaboradoresModule } from './colaboradores/colaboradores.module';
import { DocumentosModule } from './documentos/documentos.module';
import { EmpresasModule } from './empresas/empresas.module';
import { HealthController } from './health/health.controller';
import { LogosModule } from './logos/logos.module';
import { PainelModule } from './painel/painel.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule, CnaeModule, EmpresasModule, DocumentosModule, LogosModule, PainelModule, ColaboradoresModule, CipaModule, OperacaoModule],
  controllers: [HealthController],
})
export class AppModule {}
