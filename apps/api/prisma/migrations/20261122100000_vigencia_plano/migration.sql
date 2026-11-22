-- Vigência do plano pago: de quando começou e até quando está pago.
ALTER TABLE "Consultoria" ADD COLUMN "planoDesde" TIMESTAMP(3);
ALTER TABLE "Consultoria" ADD COLUMN "planoPagoAte" TIMESTAMP(3);
