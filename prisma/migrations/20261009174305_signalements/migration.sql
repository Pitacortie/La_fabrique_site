-- CreateEnum
CREATE TYPE "StatutSignalement" AS ENUM ('NOUVEAU', 'EN_COURS', 'RESOLU', 'IGNORE');

-- CreateTable
CREATE TABLE "SignalementBug" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "navigateur" TEXT,
    "ecran" TEXT,
    "email" TEXT,
    "membreId" TEXT,
    "statut" "StatutSignalement" NOT NULL DEFAULT 'NOUVEAU',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignalementBug_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SignalementBug_statut_createdAt_idx" ON "SignalementBug"("statut", "createdAt");

-- AddForeignKey
ALTER TABLE "SignalementBug" ADD CONSTRAINT "SignalementBug_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;
