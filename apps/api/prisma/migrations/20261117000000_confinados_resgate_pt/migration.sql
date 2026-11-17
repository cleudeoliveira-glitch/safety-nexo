-- Inventário de espaços confinados (NR-33), planos de resgate e dados próprios das PTs (içamento e escavação).
-- AlterTable
ALTER TABLE "PermissaoTrabalho" ADD COLUMN     "detalhes" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "espacoId" TEXT,
ADD COLUMN     "planoResgateId" TEXT;

-- CreateTable
CREATE TABLE "EspacoConfinado" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT,
    "acessos" TEXT,
    "produtos" TEXT,
    "riscos" TEXT[],
    "medidasControle" TEXT,
    "sinalizado" BOOLEAN NOT NULL DEFAULT false,
    "isolado" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EspacoConfinado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanoResgate" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "espacoId" TEXT,
    "cenarios" TEXT NOT NULL,
    "equipe" TEXT[],
    "equipeExterna" TEXT,
    "equipamentos" TEXT[],
    "procedimento" TEXT NOT NULL,
    "primeirosSocorros" TEXT,
    "telefones" JSONB NOT NULL DEFAULT '[]',
    "hospital" TEXT,
    "ultimoSimulado" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanoResgate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EspacoConfinado_empresaId_idx" ON "EspacoConfinado"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "EspacoConfinado_empresaId_codigo_key" ON "EspacoConfinado"("empresaId", "codigo");

-- CreateIndex
CREATE INDEX "PlanoResgate_empresaId_idx" ON "PlanoResgate"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanoResgate_empresaId_numero_key" ON "PlanoResgate"("empresaId", "numero");

-- AddForeignKey
ALTER TABLE "PermissaoTrabalho" ADD CONSTRAINT "PermissaoTrabalho_espacoId_fkey" FOREIGN KEY ("espacoId") REFERENCES "EspacoConfinado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissaoTrabalho" ADD CONSTRAINT "PermissaoTrabalho_planoResgateId_fkey" FOREIGN KEY ("planoResgateId") REFERENCES "PlanoResgate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EspacoConfinado" ADD CONSTRAINT "EspacoConfinado_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoResgate" ADD CONSTRAINT "PlanoResgate_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoResgate" ADD CONSTRAINT "PlanoResgate_espacoId_fkey" FOREIGN KEY ("espacoId") REFERENCES "EspacoConfinado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

