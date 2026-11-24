-- E-mail de confirmação do pagamento do plano: guarda quando saiu, para mandar um só por pagamento.
ALTER TABLE "PagamentoPlano" ADD COLUMN "reciboEm" TIMESTAMP(3);
-- Pagamentos que já estavam pagos antes desta mudança não recebem e-mail atrasado.
UPDATE "PagamentoPlano" SET "reciboEm" = NOW() WHERE "status" = 'PAGO';
