-- Check-up SST: CNH na ficha, fabricante e devolução de EPI, atas das reuniões da CIPA.
ALTER TABLE "Colaborador" ADD COLUMN "cnhCategoria" TEXT;
ALTER TABLE "Colaborador" ADD COLUMN "cnhValidade" TIMESTAMP(3);

ALTER TABLE "EntregaEpi" ADD COLUMN "fabricante" TEXT;
ALTER TABLE "EntregaEpi" ADD COLUMN "devolvidoEm" TIMESTAMP(3);
ALTER TABLE "EntregaEpi" ADD COLUMN "motivoDevolucao" TEXT;

ALTER TABLE "EstoqueEpi" ADD COLUMN "fabricante" TEXT;

CREATE TABLE "CipaReuniao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "horario" TEXT,
    "local" TEXT NOT NULL,
    "presentes" TEXT[],
    "pauta" TEXT NOT NULL,
    "discussao" TEXT NOT NULL,
    "encaminhamentos" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CipaReuniao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CipaReuniao_empresaId_numero_key" ON "CipaReuniao"("empresaId", "numero");
CREATE INDEX "CipaReuniao_empresaId_idx" ON "CipaReuniao"("empresaId");

ALTER TABLE "CipaReuniao" ADD CONSTRAINT "CipaReuniao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
