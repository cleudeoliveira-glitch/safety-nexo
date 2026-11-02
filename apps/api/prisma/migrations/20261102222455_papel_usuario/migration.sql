-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "empresaId" TEXT,
ADD COLUMN     "papel" TEXT NOT NULL DEFAULT 'CONSULTORIA';

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
