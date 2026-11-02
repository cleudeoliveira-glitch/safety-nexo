-- CreateTable
CREATE TABLE "CipaEleicao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "editalEm" TIMESTAMP(3) NOT NULL,
    "inscricaoInicio" TIMESTAMP(3) NOT NULL,
    "inscricaoFim" TIMESTAMP(3) NOT NULL,
    "eleicaoEm" TIMESTAMP(3) NOT NULL,
    "localVotacao" TEXT NOT NULL,
    "horarioVotacao" TEXT NOT NULL,
    "votantes" INTEGER,
    "posseEm" TIMESTAMP(3),
    "treinamentoInicio" TIMESTAMP(3),
    "treinamentoFim" TIMESTAMP(3),
    "instrutor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CipaEleicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CipaMembro" (
    "id" TEXT NOT NULL,
    "eleicaoId" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "representacao" TEXT NOT NULL,
    "votos" INTEGER,
    "titular" BOOLEAN NOT NULL DEFAULT true,
    "presidente" BOOLEAN NOT NULL DEFAULT false,
    "vice" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CipaMembro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CipaEleicao_empresaId_idx" ON "CipaEleicao"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "CipaMembro_eleicaoId_colaboradorId_key" ON "CipaMembro"("eleicaoId", "colaboradorId");

-- AddForeignKey
ALTER TABLE "CipaEleicao" ADD CONSTRAINT "CipaEleicao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CipaMembro" ADD CONSTRAINT "CipaMembro_eleicaoId_fkey" FOREIGN KEY ("eleicaoId") REFERENCES "CipaEleicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CipaMembro" ADD CONSTRAINT "CipaMembro_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;
