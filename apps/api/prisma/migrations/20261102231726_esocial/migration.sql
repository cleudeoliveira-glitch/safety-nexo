-- CreateTable
CREATE TABLE "CertificadoDigital" (
    "id" TEXT NOT NULL,
    "consultoriaId" TEXT NOT NULL,
    "titular" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "validoDe" TIMESTAMP(3) NOT NULL,
    "validoAte" TIMESTAMP(3) NOT NULL,
    "pfxCifrado" TEXT NOT NULL,
    "senhaCifrada" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificadoDigital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoEsocial" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "referenciaId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "idEvento" TEXT NOT NULL,
    "xml" TEXT NOT NULL,
    "ambiente" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "protocolo" TEXT,
    "recibo" TEXT,
    "mensagens" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventoEsocial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CertificadoDigital_consultoriaId_key" ON "CertificadoDigital"("consultoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "EventoEsocial_idEvento_key" ON "EventoEsocial"("idEvento");

-- CreateIndex
CREATE INDEX "EventoEsocial_empresaId_idx" ON "EventoEsocial"("empresaId");

-- AddForeignKey
ALTER TABLE "EventoEsocial" ADD CONSTRAINT "EventoEsocial_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
