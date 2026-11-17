-- Local onde o DDS foi feito e cálculos salvos das calculadoras.
-- AlterTable
ALTER TABLE "Dds" ADD COLUMN     "local" TEXT;

-- CreateTable
CREATE TABLE "CalculoSalvo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "entradas" JSONB NOT NULL,
    "resultado" JSONB NOT NULL,
    "conclusao" TEXT,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalculoSalvo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalculoSalvo_empresaId_idx" ON "CalculoSalvo"("empresaId");

-- AddForeignKey
ALTER TABLE "CalculoSalvo" ADD CONSTRAINT "CalculoSalvo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

