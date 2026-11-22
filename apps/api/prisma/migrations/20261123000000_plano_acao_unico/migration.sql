-- Plano de ação único: tema, hierarquia de controle e eficácia (NR-01, 1.5.5.1.2 e 1.5.5.2).
ALTER TABLE "AcaoCorretiva" ADD COLUMN "tema" TEXT;
ALTER TABLE "AcaoCorretiva" ADD COLUMN "hierarquia" TEXT;
ALTER TABLE "AcaoCorretiva" ADD COLUMN "riscoId" TEXT;
ALTER TABLE "AcaoCorretiva" ADD COLUMN "nivelAntes" TEXT;
ALTER TABLE "AcaoCorretiva" ADD COLUMN "nivelDepois" TEXT;
ALTER TABLE "AcaoCorretiva" ADD COLUMN "eficaz" BOOLEAN;
ALTER TABLE "AcaoCorretiva" ADD COLUMN "verificadaEm" TIMESTAMP(3);
ALTER TABLE "AcaoCorretiva" ADD CONSTRAINT "AcaoCorretiva_riscoId_fkey" FOREIGN KEY ("riscoId") REFERENCES "GheRisco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- As ações do psicossocial passam a morar no plano da empresa.
-- As que já tinham sido enviadas ao PGR ganham o tema; as outras são copiadas.
-- Se uma das duas listas já marcava como feita, fica feita.
UPDATE "AcaoCorretiva" c SET "tema" = ap."dimensao", "hierarquia" = 'ADMINISTRATIVA',
  "status" = CASE WHEN ap."feita" THEN 'FEITA' ELSE c."status" END,
  "feitaEm" = CASE WHEN ap."feita" AND c."feitaEm" IS NULL THEN CURRENT_TIMESTAMP ELSE c."feitaEm" END
FROM "AcaoPsicossocial" ap
WHERE c."origem" = 'PSICOSSOCIAL' AND c."origemId" = ap."avaliacaoId" AND c."descricao" = ap."acao" AND c."tema" IS NULL;

INSERT INTO "AcaoCorretiva" ("id", "empresaId", "origem", "origemId", "origemTexto", "descricao", "local", "responsavel", "prazo", "prioridade", "esforco", "status", "feitaEm", "tema", "hierarquia", "criadoEm")
SELECT ap."id", av."empresaId", 'PSICOSSOCIAL', ap."avaliacaoId", 'Avaliação psicossocial "' || av."titulo" || '"', ap."acao", ap."setor", ap."responsavel", ap."prazo",
       'MEDIA', 'MEDIO', CASE WHEN ap."feita" THEN 'FEITA' ELSE 'ABERTA' END, CASE WHEN ap."feita" THEN CURRENT_TIMESTAMP END, ap."dimensao", 'ADMINISTRATIVA', ap."criadoEm"
FROM "AcaoPsicossocial" ap
JOIN "AvaliacaoPsicossocial" av ON av."id" = ap."avaliacaoId"
WHERE NOT EXISTS (
  SELECT 1 FROM "AcaoCorretiva" c
  WHERE c."origem" = 'PSICOSSOCIAL' AND c."origemId" = ap."avaliacaoId" AND c."descricao" = ap."acao"
);

DROP TABLE "AcaoPsicossocial";

-- Recomendações das AETs já feitas entram no plano de ação.
INSERT INTO "AcaoCorretiva" ("id", "empresaId", "origem", "origemId", "origemTexto", "descricao", "local", "responsavel", "prazo", "observacao", "prioridade", "esforco", "status", "criadoEm")
SELECT 'aet' || a."id" || '_' || r.ord, a."empresaId", 'AET', a."id", 'AET: ' || a."posto", r.v->>'recomendacao', a."posto", NULLIF(r.v->>'responsavel', ''),
       CASE WHEN (r.v->>'prazo') ~ '^\d{4}-\d{2}-\d{2}' THEN substr(r.v->>'prazo', 1, 10)::date END,
       CASE WHEN COALESCE(r.v->>'prazo', '') <> '' AND NOT ((r.v->>'prazo') ~ '^\d{4}-\d{2}-\d{2}') THEN 'Prazo indicado na AET: ' || (r.v->>'prazo') END,
       'MEDIA', 'MEDIO', 'ABERTA', a."createdAt"
FROM "Aet" a, jsonb_array_elements(a."recomendacoes") WITH ORDINALITY AS r(v, ord)
WHERE COALESCE(r.v->>'recomendacao', '') <> '';

-- Atestado longo vira afastamento sozinho: liga um ao outro.
ALTER TABLE "Afastamento" ADD COLUMN "atestadoId" TEXT;

-- Data da última mudança no GHE e no risco: base do aviso de revisão do PGR (NR-01, 1.5.4.4.6).
ALTER TABLE "Ghe" ADD COLUMN "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "GheRisco" ADD COLUMN "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- O que já existia antes desta versão não conta como mudança nova (não sabemos quando mudou).
UPDATE "Ghe" SET "atualizadoEm" = TIMESTAMP '2000-01-01 00:00:00';
UPDATE "GheRisco" SET "atualizadoEm" = TIMESTAMP '2000-01-01 00:00:00';
