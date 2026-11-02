-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "representanteLegalNome" TEXT,
ADD COLUMN     "responsavelTecnicoNome" TEXT,
ADD COLUMN     "responsavelTecnicoRegistro" TEXT;

-- AlterTable
ALTER TABLE "GheRisco" ADD COLUMN     "aposentadoriaEspecial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "codigoAnexoIv" TEXT,
ADD COLUMN     "epcEficaz" BOOLEAN,
ADD COLUMN     "epiCa" TEXT,
ADD COLUMN     "epiEficaz" BOOLEAN,
ADD COLUMN     "intensidade" TEXT,
ADD COLUMN     "limiteTolerancia" TEXT,
ADD COLUMN     "tecnicaMedicao" TEXT,
ADD COLUMN     "tipoAvaliacao" TEXT;

-- CreateTable
CREATE TABLE "Aet" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "posto" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "responsavel" TEXT NOT NULL,
    "demanda" TEXT NOT NULL,
    "funcionamento" TEXT NOT NULL,
    "metodos" TEXT NOT NULL,
    "diagnostico" TEXT NOT NULL,
    "recomendacoes" JSONB NOT NULL,
    "restituicao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "tipoCat" TEXT NOT NULL,
    "tipoAcidente" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "horasTrabalhadas" TEXT,
    "local" TEXT NOT NULL,
    "parteAtingida" TEXT NOT NULL,
    "agenteCausador" TEXT NOT NULL,
    "naturezaLesao" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "houveAfastamento" BOOLEAN NOT NULL,
    "houveObito" BOOLEAN NOT NULL DEFAULT false,
    "registroPolicial" BOOLEAN NOT NULL DEFAULT false,
    "testemunhas" TEXT,
    "atendimentoData" TIMESTAMP(3),
    "medicoNome" TEXT,
    "medicoCrm" TEXT,
    "cid" TEXT,
    "diasTratamento" INTEGER,
    "enviadaEm" TIMESTAMP(3),
    "recibo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Aet_empresaId_idx" ON "Aet"("empresaId");

-- CreateIndex
CREATE INDEX "Cat_empresaId_idx" ON "Cat"("empresaId");

-- AddForeignKey
ALTER TABLE "Aet" ADD CONSTRAINT "Aet_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat" ADD CONSTRAINT "Cat_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat" ADD CONSTRAINT "Cat_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;
