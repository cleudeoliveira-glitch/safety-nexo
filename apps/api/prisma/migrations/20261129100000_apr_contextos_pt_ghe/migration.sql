-- APR: situações especiais marcadas (altura, espaço confinado, eletricidade...).
ALTER TABLE "Apr" ADD COLUMN "contextos" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- PT ligada ao setor (GHE): os perigos e EPIs do PGR saem na permissão.
ALTER TABLE "PermissaoTrabalho" ADD COLUMN "gheId" TEXT;
ALTER TABLE "PermissaoTrabalho" ADD CONSTRAINT "PermissaoTrabalho_gheId_fkey" FOREIGN KEY ("gheId") REFERENCES "Ghe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
