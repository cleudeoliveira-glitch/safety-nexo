-- Avisos no celular (Web Push) para os ADMs da plataforma.
CREATE TABLE "AvisoCelular" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "aparelho" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AvisoCelular_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AvisoCelular_endpoint_key" ON "AvisoCelular"("endpoint");
CREATE INDEX "AvisoCelular_usuarioId_idx" ON "AvisoCelular"("usuarioId");

CREATE TABLE "ConfigPlataforma" (
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConfigPlataforma_pkey" PRIMARY KEY ("chave")
);
