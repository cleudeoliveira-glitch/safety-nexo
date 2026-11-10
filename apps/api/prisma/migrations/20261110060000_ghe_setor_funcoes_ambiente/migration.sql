-- GHE por setor e função, com a descrição do ambiente (NR-01, 1.5.7.3.2, a e b).
ALTER TABLE "Ghe" ADD COLUMN "setor" TEXT;
ALTER TABLE "Ghe" ADD COLUMN "funcoes" JSONB;
ALTER TABLE "Ghe" ADD COLUMN "ambiente" JSONB;
