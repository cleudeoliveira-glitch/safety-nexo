-- Vida útil do EPI em dias: com ela o sistema prevê a troca de cada entrega.
ALTER TABLE "EntregaEpi" ADD COLUMN "vidaUtilDias" INTEGER;
ALTER TABLE "EstoqueEpi" ADD COLUMN "vidaUtilDias" INTEGER;
