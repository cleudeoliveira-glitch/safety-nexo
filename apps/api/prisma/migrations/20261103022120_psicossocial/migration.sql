-- CreateTable
CREATE TABLE "AvaliacaoPsicossocial" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "questionario" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "token" TEXT NOT NULL,
    "minimoGrupo" INTEGER NOT NULL DEFAULT 5,
    "criadoPorNome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerradaEm" TIMESTAMP(3),

    CONSTRAINT "AvaliacaoPsicossocial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RespostaPsicossocial" (
    "id" TEXT NOT NULL,
    "avaliacaoId" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "valores" JSONB NOT NULL,
    "dia" DATE NOT NULL,

    CONSTRAINT "RespostaPsicossocial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcaoPsicossocial" (
    "id" TEXT NOT NULL,
    "avaliacaoId" TEXT NOT NULL,
    "setor" TEXT,
    "dimensao" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "responsavel" TEXT,
    "prazo" DATE,
    "feita" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcaoPsicossocial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AvaliacaoPsicossocial_token_key" ON "AvaliacaoPsicossocial"("token");

-- CreateIndex
CREATE INDEX "AvaliacaoPsicossocial_empresaId_idx" ON "AvaliacaoPsicossocial"("empresaId");

-- CreateIndex
CREATE INDEX "RespostaPsicossocial_avaliacaoId_idx" ON "RespostaPsicossocial"("avaliacaoId");

-- CreateIndex
CREATE INDEX "AcaoPsicossocial_avaliacaoId_idx" ON "AcaoPsicossocial"("avaliacaoId");

-- AddForeignKey
ALTER TABLE "AvaliacaoPsicossocial" ADD CONSTRAINT "AvaliacaoPsicossocial_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespostaPsicossocial" ADD CONSTRAINT "RespostaPsicossocial_avaliacaoId_fkey" FOREIGN KEY ("avaliacaoId") REFERENCES "AvaliacaoPsicossocial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcaoPsicossocial" ADD CONSTRAINT "AcaoPsicossocial_avaliacaoId_fkey" FOREIGN KEY ("avaliacaoId") REFERENCES "AvaliacaoPsicossocial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
