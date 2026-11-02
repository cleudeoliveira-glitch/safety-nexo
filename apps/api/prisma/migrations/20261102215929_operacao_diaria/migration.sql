-- CreateTable
CREATE TABLE "Apr" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "atividade" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "responsavel" TEXT NOT NULL,
    "equipe" TEXT[],
    "etapas" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Apr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissaoTrabalho" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "aprId" TEXT,
    "atividade" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "executantes" TEXT[],
    "emitente" TEXT NOT NULL,
    "checklist" JSONB NOT NULL,
    "encerradaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissaoTrabalho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dds" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tema" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "duracaoMin" INTEGER NOT NULL,
    "ministrante" TEXT NOT NULL,
    "participantes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Apr_empresaId_numero_key" ON "Apr"("empresaId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "PermissaoTrabalho_empresaId_numero_key" ON "PermissaoTrabalho"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "Dds_empresaId_idx" ON "Dds"("empresaId");

-- AddForeignKey
ALTER TABLE "Apr" ADD CONSTRAINT "Apr_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissaoTrabalho" ADD CONSTRAINT "PermissaoTrabalho_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissaoTrabalho" ADD CONSTRAINT "PermissaoTrabalho_aprId_fkey" FOREIGN KEY ("aprId") REFERENCES "Apr"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dds" ADD CONSTRAINT "Dds_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
