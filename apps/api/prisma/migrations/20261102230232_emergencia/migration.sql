-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "emergencia" JSONB;

-- CreateTable
CREATE TABLE "ControleEmergencia" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "local" TEXT,
    "numero" TEXT,
    "validade" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ControleEmergencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ControleEmergencia_empresaId_idx" ON "ControleEmergencia"("empresaId");

-- AddForeignKey
ALTER TABLE "ControleEmergencia" ADD CONSTRAINT "ControleEmergencia_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
