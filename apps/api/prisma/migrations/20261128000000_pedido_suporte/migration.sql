-- Pedidos de ajuda dos clientes (botão "Relatar problema"), que avisam o dono da plataforma no celular.
CREATE TABLE "PedidoSuporte" (
    "id" TEXT NOT NULL,
    "consultoriaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "tela" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "resposta" TEXT,
    "respondidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PedidoSuporte_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PedidoSuporte_status_createdAt_idx" ON "PedidoSuporte"("status", "createdAt");
CREATE INDEX "PedidoSuporte_consultoriaId_idx" ON "PedidoSuporte"("consultoriaId");
