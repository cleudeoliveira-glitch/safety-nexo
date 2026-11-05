-- AlterTable
ALTER TABLE "CipaEleicao" ADD COLUMN     "apuradaEm" TIMESTAMP(3),
ADD COLUMN     "votacaoFim" TIMESTAMP(3),
ADD COLUMN     "votacaoInicio" TIMESTAMP(3),
ADD COLUMN     "votosBrancoOnline" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "votosNuloOnline" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CipaMembro" ADD COLUMN     "votosOnline" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Colaborador" ADD COLUMN     "portalToken" TEXT;

-- AlterTable
ALTER TABLE "Consultoria" ADD COLUMN     "avisosEmail" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "relatoToken" TEXT;

-- CreateTable
CREATE TABLE "AvisoNorma" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "normas" TEXT[],
    "resumo" TEXT NOT NULL,
    "oQueFazer" TEXT,
    "linkOficial" TEXT,
    "publicadaEm" DATE,
    "vigenciaEm" DATE,
    "cnaePrefixos" TEXT[],
    "grauRiscoMin" INTEGER,
    "funcionariosMin" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvisoNorma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvisoNormaLido" (
    "avisoId" TEXT NOT NULL,
    "consultoriaId" TEXT NOT NULL,
    "lidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvisoNormaLido_pkey" PRIMARY KEY ("avisoId","consultoriaId")
);

-- CreateTable
CREATE TABLE "Relato" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "local" TEXT,
    "nome" TEXT,
    "fotoPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOVO',
    "resposta" TEXT,
    "analiseIa" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Relato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcaoCorretiva" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "origemId" TEXT,
    "origemTexto" TEXT,
    "descricao" TEXT NOT NULL,
    "local" TEXT,
    "responsavel" TEXT,
    "prazo" DATE,
    "prioridade" TEXT NOT NULL DEFAULT 'MEDIA',
    "esforco" TEXT NOT NULL DEFAULT 'MEDIO',
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "feitaEm" TIMESTAMP(3),
    "feitaPor" TEXT,
    "observacao" TEXT,
    "evidenciaPath" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcaoCorretiva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investigacao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "catId" TEXT,
    "relatoId" TEXT,
    "titulo" TEXT NOT NULL,
    "dataOcorrencia" TIMESTAMP(3) NOT NULL,
    "local" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "equipe" TEXT NOT NULL,
    "porques" TEXT[],
    "causas" JSONB NOT NULL,
    "conclusao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Investigacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CipaEleitor" (
    "id" TEXT NOT NULL,
    "eleicaoId" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "votou" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CipaEleitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Relato_empresaId_numero_key" ON "Relato"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "AcaoCorretiva_empresaId_idx" ON "AcaoCorretiva"("empresaId");

-- CreateIndex
CREATE INDEX "Investigacao_empresaId_idx" ON "Investigacao"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "CipaEleitor_codigo_key" ON "CipaEleitor"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "CipaEleitor_eleicaoId_colaboradorId_key" ON "CipaEleitor"("eleicaoId", "colaboradorId");

-- CreateIndex
CREATE UNIQUE INDEX "Colaborador_portalToken_key" ON "Colaborador"("portalToken");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_relatoToken_key" ON "Empresa"("relatoToken");

-- AddForeignKey
ALTER TABLE "AvisoNormaLido" ADD CONSTRAINT "AvisoNormaLido_avisoId_fkey" FOREIGN KEY ("avisoId") REFERENCES "AvisoNorma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvisoNormaLido" ADD CONSTRAINT "AvisoNormaLido_consultoriaId_fkey" FOREIGN KEY ("consultoriaId") REFERENCES "Consultoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relato" ADD CONSTRAINT "Relato_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcaoCorretiva" ADD CONSTRAINT "AcaoCorretiva_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investigacao" ADD CONSTRAINT "Investigacao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CipaEleitor" ADD CONSTRAINT "CipaEleitor_eleicaoId_fkey" FOREIGN KEY ("eleicaoId") REFERENCES "CipaEleicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CipaEleitor" ADD CONSTRAINT "CipaEleitor_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

