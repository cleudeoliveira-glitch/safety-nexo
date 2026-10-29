-- CreateTable
CREATE TABLE "CnaeGrauRisco" (
    "classe" TEXT NOT NULL,
    "denominacao" TEXT NOT NULL,
    "grauRisco" INTEGER NOT NULL,

    CONSTRAINT "CnaeGrauRisco_pkey" PRIMARY KEY ("classe")
);
