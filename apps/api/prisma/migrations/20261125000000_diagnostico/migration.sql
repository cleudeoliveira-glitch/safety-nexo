-- Diagnóstico do Painel ADM: falhas do motor, das telas, do Asaas e dos e-mails.
CREATE TABLE "FalhaSistema" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "rota" TEXT,
    "status" INTEGER,
    "mensagem" TEXT NOT NULL,
    "detalhe" TEXT,
    "consultoriaId" TEXT,
    "usuarioId" TEXT,
    "vezes" INTEGER NOT NULL DEFAULT 1,
    "primeiraEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FalhaSistema_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FalhaSistema_chave_key" ON "FalhaSistema"("chave");
CREATE INDEX "FalhaSistema_ultimaEm_idx" ON "FalhaSistema"("ultimaEm");
