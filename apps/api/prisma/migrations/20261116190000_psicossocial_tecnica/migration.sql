-- Psicossocial por fatores: avaliação técnica por setor (peso 2) e data do envio ao PGR.
ALTER TABLE "AvaliacaoPsicossocial" ADD COLUMN "avaliacaoTecnica" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "AvaliacaoPsicossocial" ADD COLUMN "enviadoPgrEm" TIMESTAMP(3);
