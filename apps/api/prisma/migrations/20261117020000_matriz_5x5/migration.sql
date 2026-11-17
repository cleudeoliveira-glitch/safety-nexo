-- Matriz de risco 5x5 (NR-01, 1.5.4.4.2): severidade e probabilidade de 1 a 5.
-- E as medidas de controle separadas: EPC, EPI e outras medidas.
-- AlterTable
ALTER TABLE "GheRisco" ADD COLUMN     "medidasEpc" TEXT,
ADD COLUMN     "medidasEpi" TEXT,
ALTER COLUMN "severidade" SET DEFAULT '3',
ALTER COLUMN "probabilidade" SET DEFAULT '3';


-- Riscos já cadastrados na matriz 3x3: BAIXA vira 2, MEDIA vira 3 e ALTA vira 5.
-- Assim cada risco continua no mesmo nível (baixo, moderado, alto ou crítico) que tinha antes.
UPDATE "GheRisco" SET "severidade" = CASE "severidade" WHEN 'BAIXA' THEN '2' WHEN 'MEDIA' THEN '3' WHEN 'ALTA' THEN '5' ELSE "severidade" END
WHERE "severidade" IN ('BAIXA', 'MEDIA', 'ALTA');
UPDATE "GheRisco" SET "probabilidade" = CASE "probabilidade" WHEN 'BAIXA' THEN '2' WHEN 'MEDIA' THEN '3' WHEN 'ALTA' THEN '5' ELSE "probabilidade" END
WHERE "probabilidade" IN ('BAIXA', 'MEDIA', 'ALTA');
