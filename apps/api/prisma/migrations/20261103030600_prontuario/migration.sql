-- CreateTable
CREATE TABLE "RegistroSaude" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "titulo" TEXT NOT NULL,
    "resultado" TEXT,
    "dados" JSONB,
    "profissional" TEXT,
    "lote" TEXT,
    "proximaData" DATE,
    "observacao" TEXT,
    "arquivoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroSaude_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistroSaude_empresaId_idx" ON "RegistroSaude"("empresaId");

-- CreateIndex
CREATE INDEX "RegistroSaude_colaboradorId_idx" ON "RegistroSaude"("colaboradorId");

-- AddForeignKey
ALTER TABLE "RegistroSaude" ADD CONSTRAINT "RegistroSaude_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroSaude" ADD CONSTRAINT "RegistroSaude_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;
