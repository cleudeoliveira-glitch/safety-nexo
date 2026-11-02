-- AlterTable
ALTER TABLE "Ghe" ADD COLUMN     "periculosidadeAnexo" TEXT,
ADD COLUMN     "periculosidadeJustificativa" TEXT;

-- AlterTable
ALTER TABLE "GheRisco" ADD COLUMN     "anexoNr15" TEXT,
ADD COLUMN     "grauInsalubridade" TEXT;

-- CreateTable
CREATE TABLE "Inspecao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "inspetor" TEXT NOT NULL,
    "itens" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inspecao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Inspecao_empresaId_idx" ON "Inspecao"("empresaId");

-- AddForeignKey
ALTER TABLE "Inspecao" ADD CONSTRAINT "Inspecao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
