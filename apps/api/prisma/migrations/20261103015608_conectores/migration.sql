-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "jornadaDiariaHoras" DOUBLE PRECISION NOT NULL DEFAULT 8;

-- CreateTable
CREATE TABLE "Terceiro" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "cnpj" TEXT,
    "servico" TEXT NOT NULL,
    "contato" TEXT,
    "telefone" TEXT,
    "inicio" DATE,
    "fim" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Terceiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerceiroDocumento" (
    "id" TEXT NOT NULL,
    "terceiroId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "validade" DATE,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TerceiroDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerceiroTrabalhador" (
    "id" TEXT NOT NULL,
    "terceiroId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "funcao" TEXT,
    "asoValidade" DATE,
    "integracao" DATE,
    "treinamentos" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TerceiroTrabalhador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Atestado" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "inicio" DATE NOT NULL,
    "dias" INTEGER NOT NULL DEFAULT 0,
    "horas" DOUBLE PRECISION,
    "tipo" TEXT NOT NULL,
    "cid" TEXT,
    "medico" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Atestado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Terceiro_empresaId_idx" ON "Terceiro"("empresaId");

-- CreateIndex
CREATE INDEX "TerceiroDocumento_terceiroId_idx" ON "TerceiroDocumento"("terceiroId");

-- CreateIndex
CREATE INDEX "TerceiroTrabalhador_terceiroId_idx" ON "TerceiroTrabalhador"("terceiroId");

-- CreateIndex
CREATE INDEX "Atestado_empresaId_inicio_idx" ON "Atestado"("empresaId", "inicio");

-- CreateIndex
CREATE INDEX "Atestado_colaboradorId_idx" ON "Atestado"("colaboradorId");

-- AddForeignKey
ALTER TABLE "Terceiro" ADD CONSTRAINT "Terceiro_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerceiroDocumento" ADD CONSTRAINT "TerceiroDocumento_terceiroId_fkey" FOREIGN KEY ("terceiroId") REFERENCES "Terceiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerceiroTrabalhador" ADD CONSTRAINT "TerceiroTrabalhador_terceiroId_fkey" FOREIGN KEY ("terceiroId") REFERENCES "Terceiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atestado" ADD CONSTRAINT "Atestado_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atestado" ADD CONSTRAINT "Atestado_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;
