-- Capa dos programas e laudos: endereço da empresa, formação e ART/TRT do responsável técnico.
ALTER TABLE "Empresa" ADD COLUMN "responsavelTecnicoFormacao" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "responsavelTecnicoArt" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "endereco" TEXT;
