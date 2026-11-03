-- AlterTable
ALTER TABLE "Consultoria" ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "pixChave" TEXT,
ADD COLUMN     "pixNome" TEXT;

-- CreateTable
CREATE TABLE "Proposta" (
    "id" TEXT NOT NULL,
    "consultoriaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "empresaId" TEXT,
    "clienteNome" TEXT NOT NULL,
    "clienteCnpj" TEXT,
    "clienteContato" TEXT,
    "data" DATE NOT NULL,
    "validadeDias" INTEGER NOT NULL DEFAULT 15,
    "itens" JSONB NOT NULL,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proposta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL,
    "consultoriaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "empresaId" TEXT NOT NULL,
    "propostaId" TEXT,
    "objeto" TEXT NOT NULL,
    "valorMensalCentavos" INTEGER,
    "diaVencimento" INTEGER,
    "inicio" DATE NOT NULL,
    "fim" DATE,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servico" (
    "id" TEXT NOT NULL,
    "consultoriaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "empresaId" TEXT NOT NULL,
    "contratoId" TEXT,
    "descricao" TEXT NOT NULL,
    "previsto" DATE,
    "responsavel" TEXT,
    "valorCentavos" INTEGER,
    "concluidoEm" DATE,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cobranca" (
    "id" TEXT NOT NULL,
    "consultoriaId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "contratoId" TEXT,
    "servicoId" TEXT,
    "descricao" TEXT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "vencimento" DATE NOT NULL,
    "referencia" TEXT,
    "txid" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "pagoEm" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cobranca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Proposta_consultoriaId_numero_key" ON "Proposta"("consultoriaId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Contrato_consultoriaId_numero_key" ON "Contrato"("consultoriaId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Servico_consultoriaId_numero_key" ON "Servico"("consultoriaId", "numero");

-- CreateIndex
CREATE INDEX "Cobranca_consultoriaId_vencimento_idx" ON "Cobranca"("consultoriaId", "vencimento");

-- CreateIndex
CREATE UNIQUE INDEX "Cobranca_contratoId_referencia_key" ON "Cobranca"("contratoId", "referencia");

-- AddForeignKey
ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_consultoriaId_fkey" FOREIGN KEY ("consultoriaId") REFERENCES "Consultoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_consultoriaId_fkey" FOREIGN KEY ("consultoriaId") REFERENCES "Consultoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "Proposta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_consultoriaId_fkey" FOREIGN KEY ("consultoriaId") REFERENCES "Consultoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_consultoriaId_fkey" FOREIGN KEY ("consultoriaId") REFERENCES "Consultoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
