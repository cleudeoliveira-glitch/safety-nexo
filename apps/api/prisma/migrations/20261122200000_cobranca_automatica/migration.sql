-- Cobrança automática do plano pelo Asaas. Só colunas e tabela novas: nada que já existe muda.
ALTER TABLE "Consultoria" ADD COLUMN "asaasClienteId" TEXT;
ALTER TABLE "Consultoria" ADD COLUMN "asaasAssinaturaId" TEXT;
ALTER TABLE "Consultoria" ADD COLUMN "assinaturaPlano" TEXT;
ALTER TABLE "Consultoria" ADD COLUMN "assinaturaForma" TEXT;
ALTER TABLE "Consultoria" ADD COLUMN "assinaturaStatus" TEXT;
ALTER TABLE "Consultoria" ADD COLUMN "pixAutomatico" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Consultoria" ADD COLUMN "avisosPlano" TEXT[] DEFAULT ARRAY[]::TEXT[];
CREATE UNIQUE INDEX "Consultoria_asaasAssinaturaId_key" ON "Consultoria"("asaasAssinaturaId");

CREATE TABLE "PagamentoPlano" (
    "id" TEXT NOT NULL,
    "consultoriaId" TEXT NOT NULL,
    "asaasId" TEXT NOT NULL,
    "assinaturaId" TEXT,
    "plano" TEXT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "forma" TEXT,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "pagoEm" TIMESTAMP(3),
    "linkFatura" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PagamentoPlano_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PagamentoPlano_asaasId_key" ON "PagamentoPlano"("asaasId");
CREATE INDEX "PagamentoPlano_consultoriaId_vencimento_idx" ON "PagamentoPlano"("consultoriaId", "vencimento");
ALTER TABLE "PagamentoPlano" ADD CONSTRAINT "PagamentoPlano_consultoriaId_fkey" FOREIGN KEY ("consultoriaId") REFERENCES "Consultoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
