-- AlterTable
ALTER TABLE "EntregaEpi" ADD COLUMN     "estoqueId" TEXT;

-- AlterTable
ALTER TABLE "PresencaFacial" ADD COLUMN     "capturadoEm" TIMESTAMP(3),
ADD COLUMN     "provaDeVida" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EstoqueEpi" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "epi" TEXT NOT NULL,
    "ca" TEXT NOT NULL,
    "validadeCa" TIMESTAMP(3),
    "tamanho" TEXT,
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "minimo" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstoqueEpi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentoEstoque" (
    "id" TEXT NOT NULL,
    "estoqueId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "saldo" INTEGER NOT NULL,
    "entregaEpiId" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentoEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EstoqueEpi_empresaId_idx" ON "EstoqueEpi"("empresaId");

-- CreateIndex
CREATE INDEX "MovimentoEstoque_estoqueId_idx" ON "MovimentoEstoque"("estoqueId");

-- AddForeignKey
ALTER TABLE "EstoqueEpi" ADD CONSTRAINT "EstoqueEpi_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoEstoque" ADD CONSTRAINT "MovimentoEstoque_estoqueId_fkey" FOREIGN KEY ("estoqueId") REFERENCES "EstoqueEpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
