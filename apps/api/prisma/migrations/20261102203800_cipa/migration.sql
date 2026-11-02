-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "atendidaSesmt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cipaInicioMandato" TIMESTAMP(3),
ADD COLUMN     "cipaRepresentante" TEXT;
