-- Equipe da consultoria: dono (plano, pagamento, equipe) e técnico (só SST). Verificação em duas etapas por e-mail.
ALTER TABLE "Usuario" ADD COLUMN "dono" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN "doisFatores" BOOLEAN NOT NULL DEFAULT false;

-- Quem criou a conta (o primeiro login da consultoria) vira dono. Quem entrou depois pela equipe fica como técnico.
UPDATE "Usuario" u SET "dono" = true
WHERE u."papel" = 'CONSULTORIA'
  AND u."id" = (
    SELECT p."id" FROM "Usuario" p
    WHERE p."consultoriaId" = u."consultoriaId" AND p."papel" = 'CONSULTORIA'
    ORDER BY p."createdAt" ASC, p."id" ASC LIMIT 1
  );
