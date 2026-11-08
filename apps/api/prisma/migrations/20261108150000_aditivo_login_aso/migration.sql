-- Conta de empresa que se cadastra sozinha, teste de 14 dias e PDF do ASO da clínica.
ALTER TABLE "Consultoria" ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'CONSULTORIA';
ALTER TABLE "Consultoria" ADD COLUMN "testeAte" TIMESTAMP(3);
ALTER TABLE "Aso" ADD COLUMN "arquivoPath" TEXT;
