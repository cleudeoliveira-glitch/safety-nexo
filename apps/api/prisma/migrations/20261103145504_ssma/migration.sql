-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "custoDiaFalta" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "HorasTrabalhadas" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "horas" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "HorasTrabalhadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HorasTrabalhadas_empresaId_mes_key" ON "HorasTrabalhadas"("empresaId", "mes");

-- AddForeignKey
ALTER TABLE "HorasTrabalhadas" ADD CONSTRAINT "HorasTrabalhadas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
