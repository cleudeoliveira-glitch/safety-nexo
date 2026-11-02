-- AlterTable
ALTER TABLE "Aso" ADD COLUMN     "medicoExaminadorUf" TEXT;

-- AlterTable
ALTER TABLE "Cat" ADD COLUMN     "esocial" JSONB;

-- AlterTable
ALTER TABLE "Colaborador" ADD COLUMN     "codCateg" TEXT,
ADD COLUMN     "matricula" TEXT;

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "esocialAmbiente" TEXT NOT NULL DEFAULT 'PRODUCAO_RESTRITA',
ADD COLUMN     "medicoPcmsoCpf" TEXT,
ADD COLUMN     "medicoPcmsoUf" TEXT,
ADD COLUMN     "responsavelTecnicoConselho" TEXT,
ADD COLUMN     "responsavelTecnicoCpf" TEXT,
ADD COLUMN     "responsavelTecnicoUf" TEXT;

-- AlterTable
ALTER TABLE "ExameGhe" ADD COLUMN     "codigoEsocial" TEXT;

-- AlterTable
ALTER TABLE "GheRisco" ADD COLUMN     "esocial" JSONB;
