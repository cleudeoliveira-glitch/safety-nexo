-- CreateTable
CREATE TABLE "Consultoria" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "plano" TEXT NOT NULL DEFAULT 'FREE',
    "limiteEmpresas" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consultoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "consultoriaId" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "cnae" TEXT,
    "grauRisco" INTEGER,
    "numFuncionarios" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Colaborador" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "cbo" TEXT,
    "dataAdmissao" TIMESTAMP(3),
    "gheId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Colaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ghe" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "Ghe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GheRisco" (
    "id" TEXT NOT NULL,
    "gheId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "agente" TEXT NOT NULL,
    "fonteGeradora" TEXT NOT NULL,
    "medidasControle" TEXT,
    "severidade" TEXT NOT NULL DEFAULT 'MEDIA',

    CONSTRAINT "GheRisco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "vencimento" TIMESTAMP(3),
    "geradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Empresa_consultoriaId_idx" ON "Empresa"("consultoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_consultoriaId_cnpj_key" ON "Empresa"("consultoriaId", "cnpj");

-- CreateIndex
CREATE INDEX "Colaborador_empresaId_idx" ON "Colaborador"("empresaId");

-- CreateIndex
CREATE INDEX "Ghe_empresaId_idx" ON "Ghe"("empresaId");

-- CreateIndex
CREATE INDEX "GheRisco_gheId_idx" ON "GheRisco"("gheId");

-- CreateIndex
CREATE INDEX "Documento_empresaId_idx" ON "Documento"("empresaId");

-- AddForeignKey
ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_consultoriaId_fkey" FOREIGN KEY ("consultoriaId") REFERENCES "Consultoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Colaborador" ADD CONSTRAINT "Colaborador_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Colaborador" ADD CONSTRAINT "Colaborador_gheId_fkey" FOREIGN KEY ("gheId") REFERENCES "Ghe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ghe" ADD CONSTRAINT "Ghe_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GheRisco" ADD CONSTRAINT "GheRisco_gheId_fkey" FOREIGN KEY ("gheId") REFERENCES "Ghe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
