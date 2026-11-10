ALTER TABLE "Colaborador" ADD COLUMN "dataDesligamento" TIMESTAMP(3);
ALTER TABLE "PermissaoTrabalho" ADD COLUMN "supervisorEntrada" TEXT;
ALTER TABLE "PermissaoTrabalho" ADD COLUMN "vigia" TEXT;
ALTER TABLE "PermissaoTrabalho" ADD COLUMN "medicoes" JSONB NOT NULL DEFAULT '[]';
