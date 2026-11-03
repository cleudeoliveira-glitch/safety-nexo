-- CreateTable
CREATE TABLE "PedidoAssinatura" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "arquivoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "codigo" TEXT NOT NULL,
    "hashOriginal" TEXT NOT NULL,
    "icp" BOOLEAN NOT NULL DEFAULT false,
    "icpTitular" TEXT,
    "arquivoFinalId" TEXT,
    "hashFinal" TEXT,
    "criadoPorNome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidoEm" TIMESTAMP(3),

    CONSTRAINT "PedidoAssinatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signatario" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "papel" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "assinadoEm" TIMESTAMP(3),
    "imagem" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "precisao" DOUBLE PRECISION,
    "ip" TEXT,
    "navegador" TEXT,
    "presencial" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Signatario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PedidoAssinatura_codigo_key" ON "PedidoAssinatura"("codigo");

-- CreateIndex
CREATE INDEX "PedidoAssinatura_empresaId_idx" ON "PedidoAssinatura"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Signatario_token_key" ON "Signatario"("token");

-- CreateIndex
CREATE INDEX "Signatario_pedidoId_idx" ON "Signatario"("pedidoId");

-- AddForeignKey
ALTER TABLE "PedidoAssinatura" ADD CONSTRAINT "PedidoAssinatura_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signatario" ADD CONSTRAINT "Signatario_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoAssinatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;
