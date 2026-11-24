-- Retrato dos GHEs no PGR emitido e o resumo do que mudou desde a versão anterior.
ALTER TABLE "Documento" ADD COLUMN "retrato" JSONB;
ALTER TABLE "Documento" ADD COLUMN "mudancas" TEXT;
