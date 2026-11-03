-- CreateTable
CREATE TABLE "FapRat" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "rat" INTEGER NOT NULL,
    "fap" DECIMAL(5,4) NOT NULL,
    "folhaMensal" DECIMAL(14,2),
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FapRat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FapRat_empresaId_ano_key" ON "FapRat"("empresaId", "ano");

-- AddForeignKey
ALTER TABLE "FapRat" ADD CONSTRAINT "FapRat_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
