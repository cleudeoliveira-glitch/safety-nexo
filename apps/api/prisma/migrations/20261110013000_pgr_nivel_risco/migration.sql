-- PGR completo (NR-01): probabilidade e possíveis lesões no risco; processos e ambientes na empresa.
ALTER TABLE "GheRisco" ADD COLUMN "probabilidade" TEXT NOT NULL DEFAULT 'MEDIA';
ALTER TABLE "GheRisco" ADD COLUMN "possiveisLesoes" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "descricaoProcessos" TEXT;
