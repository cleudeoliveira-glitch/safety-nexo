-- CreateTable
CREATE TABLE "Afastamento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "inicio" DATE NOT NULL,
    "fim" DATE,
    "mesmoMotivo" BOOLEAN,
    "acidenteTransito" INTEGER,
    "observacao" TEXT,
    "catId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Afastamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Afastamento_empresaId_idx" ON "Afastamento"("empresaId");

-- AddForeignKey
ALTER TABLE "Afastamento" ADD CONSTRAINT "Afastamento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Afastamento" ADD CONSTRAINT "Afastamento_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;
