-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "consultoriaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_consultoriaId_idx" ON "Usuario"("consultoriaId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_consultoriaId_fkey" FOREIGN KEY ("consultoriaId") REFERENCES "Consultoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
