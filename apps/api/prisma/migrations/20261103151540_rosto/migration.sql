-- CreateTable
CREATE TABLE "RostoColaborador" (
    "colaboradorId" TEXT NOT NULL,
    "descritores" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "consentimentoEm" TIMESTAMP(3) NOT NULL,
    "consentimentoTexto" TEXT NOT NULL,
    "consentimentoIp" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RostoColaborador_pkey" PRIMARY KEY ("colaboradorId")
);

-- CreateTable
CREATE TABLE "PresencaFacial" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "foto" TEXT NOT NULL,
    "fotoItem" TEXT,
    "distancia" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "precisaoM" DOUBLE PRECISION,
    "ip" TEXT,
    "aparelho" TEXT,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PresencaFacial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PresencaFacial_codigo_key" ON "PresencaFacial"("codigo");

-- CreateIndex
CREATE INDEX "PresencaFacial_empresaId_tipo_refId_idx" ON "PresencaFacial"("empresaId", "tipo", "refId");

-- AddForeignKey
ALTER TABLE "RostoColaborador" ADD CONSTRAINT "RostoColaborador_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresencaFacial" ADD CONSTRAINT "PresencaFacial_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;
