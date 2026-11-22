-- Local padrão da empresa (pré-preenche APR, PT, DDS, inspeção e treinamento).
ALTER TABLE "Empresa" ADD COLUMN "localPadrao" TEXT;

-- GHE em etapas: código e unidade do grupo.
ALTER TABLE "Ghe" ADD COLUMN "codigo" TEXT;
ALTER TABLE "Ghe" ADD COLUMN "unidade" TEXT;

-- APR ligada ao setor (GHE): os riscos do ambiente vêm dele.
ALTER TABLE "Apr" ADD COLUMN "gheId" TEXT;
ALTER TABLE "Apr" ADD CONSTRAINT "Apr_gheId_fkey" FOREIGN KEY ("gheId") REFERENCES "Ghe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
