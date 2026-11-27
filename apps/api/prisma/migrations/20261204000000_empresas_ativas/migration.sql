ALTER TABLE "Consultoria" ADD COLUMN "empresasAtivas" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Consultoria" ADD COLUMN "empresasAtivasEm" TIMESTAMP(3);
