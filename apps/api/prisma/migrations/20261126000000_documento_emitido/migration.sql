-- Código de validação dos PDFs (QR Code no rodapé de todas as páginas).
CREATE TABLE "DocumentoEmitido" (
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "empresa" TEXT,
    "consultoria" TEXT NOT NULL,
    "responsavel" TEXT,
    "paginas" INTEGER,
    "emitidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoEmitido_pkey" PRIMARY KEY ("codigo")
);
