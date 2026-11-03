-- CreateTable
CREATE TABLE "Arquivo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "versao" INTEGER NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "caminho" TEXT NOT NULL,
    "texto" TEXT,
    "descricao" TEXT,
    "criadoPorId" TEXT,
    "criadoPorNome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Arquivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArquivoAcesso" (
    "id" TEXT NOT NULL,
    "arquivoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "usuarioNome" TEXT NOT NULL,
    "papel" TEXT NOT NULL,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArquivoAcesso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Arquivo_empresaId_chave_idx" ON "Arquivo"("empresaId", "chave");

-- CreateIndex
CREATE INDEX "Arquivo_empresaId_criadoEm_idx" ON "Arquivo"("empresaId", "criadoEm");

-- CreateIndex
CREATE INDEX "ArquivoAcesso_arquivoId_idx" ON "ArquivoAcesso"("arquivoId");

-- AddForeignKey
ALTER TABLE "Arquivo" ADD CONSTRAINT "Arquivo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArquivoAcesso" ADD CONSTRAINT "ArquivoAcesso_arquivoId_fkey" FOREIGN KEY ("arquivoId") REFERENCES "Arquivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Busca pelo texto de dentro do PDF (português).
CREATE INDEX "Arquivo_texto_busca_idx" ON "Arquivo" USING GIN (to_tsvector('portuguese', coalesce("titulo", '') || ' ' || coalesce("texto", '')));
