-- Pedido de troca de plano feito pela consultoria (aparece no painel ADM).
ALTER TABLE "Consultoria" ADD COLUMN "pedidoPlano" TEXT,
ADD COLUMN "pedidoPlanoEm" TIMESTAMP(3);
