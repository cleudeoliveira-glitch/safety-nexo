-- CreateTable
CREATE TABLE "Turma" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "norma" TEXT,
    "cargaHoraria" INTEGER NOT NULL,
    "validadeMeses" INTEGER,
    "conteudo" TEXT[],
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "local" TEXT NOT NULL,
    "instrutor" TEXT NOT NULL,
    "qualificacao" TEXT NOT NULL,
    "responsavelTecnico" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Turma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participacao" (
    "id" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Turma_empresaId_idx" ON "Turma"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Participacao_codigo_key" ON "Participacao"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Participacao_turmaId_colaboradorId_key" ON "Participacao"("turmaId", "colaboradorId");

-- AddForeignKey
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participacao" ADD CONSTRAINT "Participacao_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participacao" ADD CONSTRAINT "Participacao_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;
