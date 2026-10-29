-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "medicoPcmsoCrm" TEXT,
ADD COLUMN     "medicoPcmsoNome" TEXT;

-- CreateTable
CREATE TABLE "ExameGhe" (
    "id" TEXT NOT NULL,
    "gheId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "admissional" BOOLEAN NOT NULL DEFAULT true,
    "periodico" BOOLEAN NOT NULL DEFAULT true,
    "retornoTrabalho" BOOLEAN NOT NULL DEFAULT false,
    "mudancaRisco" BOOLEAN NOT NULL DEFAULT false,
    "demissional" BOOLEAN NOT NULL DEFAULT false,
    "periodicidadeMeses" INTEGER,

    CONSTRAINT "ExameGhe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExameGhe_gheId_idx" ON "ExameGhe"("gheId");

-- AddForeignKey
ALTER TABLE "ExameGhe" ADD CONSTRAINT "ExameGhe_gheId_fkey" FOREIGN KEY ("gheId") REFERENCES "Ghe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
