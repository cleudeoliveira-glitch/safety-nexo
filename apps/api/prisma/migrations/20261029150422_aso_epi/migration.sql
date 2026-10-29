-- AlterTable
ALTER TABLE "Colaborador" ADD COLUMN     "cpf" TEXT;

-- CreateTable
CREATE TABLE "Aso" (
    "id" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dataExame" TIMESTAMP(3) NOT NULL,
    "resultado" TEXT NOT NULL,
    "medicoExaminadorNome" TEXT NOT NULL,
    "medicoExaminadorCrm" TEXT NOT NULL,
    "exames" TEXT[],
    "riscos" TEXT[],
    "proximoExame" TIMESTAMP(3),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntregaEpi" (
    "id" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "epi" TEXT NOT NULL,
    "ca" TEXT NOT NULL,
    "validadeCa" TIMESTAMP(3),
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "motivo" TEXT NOT NULL,
    "dataEntrega" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntregaEpi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Aso_colaboradorId_idx" ON "Aso"("colaboradorId");

-- CreateIndex
CREATE INDEX "EntregaEpi_colaboradorId_idx" ON "EntregaEpi"("colaboradorId");

-- AddForeignKey
ALTER TABLE "Aso" ADD CONSTRAINT "Aso_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaEpi" ADD CONSTRAINT "EntregaEpi_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;
