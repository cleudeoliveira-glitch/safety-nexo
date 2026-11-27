-- Lixeira de 30 dias: o que a consultoria exclui fica guardado e pode voltar (ver src/lixeira).
CREATE TABLE "Lixeira" (
    "id" TEXT NOT NULL,
    "consultoriaId" TEXT NOT NULL,
    "empresaId" TEXT,
    "descricao" TEXT NOT NULL,
    "quem" TEXT NOT NULL,
    "itens" INTEGER NOT NULL DEFAULT 1,
    "dados" JSONB NOT NULL,
    "arquivos" JSONB NOT NULL DEFAULT '[]',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lixeira_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Lixeira_consultoriaId_criadoEm_idx" ON "Lixeira"("consultoriaId", "criadoEm");
CREATE INDEX "Lixeira_criadoEm_idx" ON "Lixeira"("criadoEm");
-- Mesma proteção das outras tabelas: a porta pública do Supabase não lê nem grava aqui.
ALTER TABLE "Lixeira" ENABLE ROW LEVEL SECURITY;
