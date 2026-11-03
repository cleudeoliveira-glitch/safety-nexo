-- CreateTable
CREATE TABLE "FotoColaborador" (
    "colaboradorId" TEXT NOT NULL,
    "imagem" TEXT NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FotoColaborador_pkey" PRIMARY KEY ("colaboradorId")
);

-- CreateTable
CREATE TABLE "AssinaturaPresenca" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "imagem" TEXT NOT NULL,
    "foto" TEXT,
    "testemunha" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "precisaoM" DOUBLE PRECISION,
    "ip" TEXT,
    "aparelho" TEXT,
    "hash" TEXT NOT NULL,
    "assinadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssinaturaPresenca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssinaturaPresenca_tipo_refId_idx" ON "AssinaturaPresenca"("tipo", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "AssinaturaPresenca_tipo_refId_colaboradorId_key" ON "AssinaturaPresenca"("tipo", "refId", "colaboradorId");

-- AddForeignKey
ALTER TABLE "FotoColaborador" ADD CONSTRAINT "FotoColaborador_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssinaturaPresenca" ADD CONSTRAINT "AssinaturaPresenca_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;
