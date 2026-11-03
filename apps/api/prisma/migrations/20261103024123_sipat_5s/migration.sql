-- CreateTable
CREATE TABLE "Sipat" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "tema" TEXT NOT NULL,
    "inicio" DATE NOT NULL,
    "fim" DATE NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sipat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SipatAtividade" (
    "id" TEXT NOT NULL,
    "sipatId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "horario" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "duracaoMin" INTEGER NOT NULL DEFAULT 60,
    "presentes" TEXT[],

    CONSTRAINT "SipatAtividade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria5s" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "auditor" TEXT NOT NULL,
    "notas" JSONB NOT NULL,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria5s_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sipat_empresaId_idx" ON "Sipat"("empresaId");

-- CreateIndex
CREATE INDEX "SipatAtividade_sipatId_idx" ON "SipatAtividade"("sipatId");

-- CreateIndex
CREATE INDEX "Auditoria5s_empresaId_setor_idx" ON "Auditoria5s"("empresaId", "setor");

-- AddForeignKey
ALTER TABLE "Sipat" ADD CONSTRAINT "Sipat_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SipatAtividade" ADD CONSTRAINT "SipatAtividade_sipatId_fkey" FOREIGN KEY ("sipatId") REFERENCES "Sipat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria5s" ADD CONSTRAINT "Auditoria5s_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
