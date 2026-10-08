-- CreateTable
CREATE TABLE "Fabrication" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "etat" TEXT NOT NULL,
    "couleur" TEXT NOT NULL DEFAULT 'bleu',
    "lien" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fabrication_pkey" PRIMARY KEY ("id")
);
