-- Mudanças nas NRs achadas sozinhas no Diário Oficial entram como rascunho para a dona da plataforma aprovar.
ALTER TABLE "AvisoNorma" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PUBLICADO';
ALTER TABLE "AvisoNorma" ADD COLUMN "origem" TEXT NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "AvisoNorma" ADD COLUMN "fonte" TEXT;
ALTER TABLE "AvisoNorma" ADD COLUMN "textoOficial" TEXT;
ALTER TABLE "AvisoNorma" ADD COLUMN "publicadoEm" TIMESTAMP(3);
CREATE UNIQUE INDEX "AvisoNorma_fonte_key" ON "AvisoNorma"("fonte");
