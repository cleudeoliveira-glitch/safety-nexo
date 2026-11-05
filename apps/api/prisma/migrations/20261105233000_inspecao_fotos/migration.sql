-- Inspeção com fotos, relatório da IA e prazo para inspecionar de novo.
ALTER TABLE "Inspecao" ADD COLUMN "fotos" JSONB;
ALTER TABLE "Inspecao" ADD COLUMN "relatorioIa" JSONB;
ALTER TABLE "Inspecao" ADD COLUMN "proximaInspecao" TIMESTAMP(3);
