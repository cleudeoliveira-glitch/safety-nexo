-- CreateTable
CREATE TABLE "Historico" (
    "id" TEXT NOT NULL,
    "consultoriaId" TEXT NOT NULL,
    "empresaId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "usuarioNome" TEXT NOT NULL,
    "papel" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "rota" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Historico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Historico_consultoriaId_createdAt_idx" ON "Historico"("consultoriaId", "createdAt");

-- CreateIndex
CREATE INDEX "Historico_empresaId_createdAt_idx" ON "Historico"("empresaId", "createdAt");
