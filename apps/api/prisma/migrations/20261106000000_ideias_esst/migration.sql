-- Ideias vistas na ESST: aprovação online da proposta, avisos de cobrança, exame toxicológico (S-2221).
ALTER TABLE "Consultoria" ADD COLUMN "reguaCobranca" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Empresa" ADD COLUMN "emailCobranca" TEXT;

ALTER TABLE "Proposta" ADD COLUMN "token" TEXT,
ADD COLUMN "respostaNome" TEXT,
ADD COLUMN "respostaCargo" TEXT,
ADD COLUMN "respostaEm" TIMESTAMP(3),
ADD COLUMN "respostaIp" TEXT,
ADD COLUMN "motivoRecusa" TEXT;
CREATE UNIQUE INDEX "Proposta_token_key" ON "Proposta"("token");

ALTER TABLE "Cobranca" ADD COLUMN "avisos" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "Toxicologico" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "dataExame" DATE NOT NULL,
    "cnpjLaboratorio" TEXT NOT NULL,
    "codigoExame" TEXT NOT NULL,
    "medicoNome" TEXT NOT NULL,
    "medicoCrm" TEXT,
    "medicoUf" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Toxicologico_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Toxicologico_empresaId_idx" ON "Toxicologico"("empresaId");
ALTER TABLE "Toxicologico" ADD CONSTRAINT "Toxicologico_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Toxicologico" ADD CONSTRAINT "Toxicologico_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;
