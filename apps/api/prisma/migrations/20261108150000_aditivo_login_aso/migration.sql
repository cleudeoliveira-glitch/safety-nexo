-- Teste de 14 dias e PDF do ASO da clínica.
ALTER TABLE "Consultoria" ADD COLUMN "testeAte" TIMESTAMP(3);
ALTER TABLE "Aso" ADD COLUMN "arquivoPath" TEXT;

-- Planos novos (Grátis, Start, Essencial, Profissional, Ilimitado): quem já estava no Grátis ganha 14 dias com tudo liberado.
UPDATE "Consultoria" SET "testeAte" = NOW() + INTERVAL '14 days' WHERE "plano" = 'FREE';
-- Limites novos de empresas: Essencial 3 -> 5 e Profissional 10 -> 15 (só para quem estava no limite padrão).
UPDATE "Consultoria" SET "limiteEmpresas" = 5 WHERE "plano" = 'ESSENCIAL' AND "limiteEmpresas" = 3;
UPDATE "Consultoria" SET "limiteEmpresas" = 15 WHERE "plano" = 'PROFISSIONAL' AND "limiteEmpresas" = 10;
