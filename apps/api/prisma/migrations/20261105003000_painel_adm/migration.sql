-- Painel ADM da plataforma: bloqueio de consultoria e último acesso do usuário.
ALTER TABLE "Consultoria" ADD COLUMN "bloqueada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "motivoBloqueio" TEXT,
ADD COLUMN "bloqueadaEm" TIMESTAMP(3),
ADD COLUMN "observacaoAdm" TEXT;

ALTER TABLE "Usuario" ADD COLUMN "ultimoAcesso" TIMESTAMP(3);
