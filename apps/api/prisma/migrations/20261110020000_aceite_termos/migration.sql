-- Aceite dos termos de uso e da política de privacidade no cadastro (LGPD).
ALTER TABLE "Consultoria" ADD COLUMN "termosAceitosEm" TIMESTAMP(3);
ALTER TABLE "Consultoria" ADD COLUMN "termosVersao" TEXT;
