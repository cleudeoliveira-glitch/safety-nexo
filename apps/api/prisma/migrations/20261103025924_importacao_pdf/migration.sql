-- CreateTable
CREATE TABLE "ImportacaoPdf" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "arquivoId" TEXT,
    "nomeArquivo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "resultado" JSONB,
    "erro" TEXT,
    "criadoPorNome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importadoEm" TIMESTAMP(3),

    CONSTRAINT "ImportacaoPdf_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportacaoPdf_empresaId_idx" ON "ImportacaoPdf"("empresaId");

-- AddForeignKey
ALTER TABLE "ImportacaoPdf" ADD CONSTRAINT "ImportacaoPdf_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
