-- AlterEnum
ALTER TYPE "TypeJeton" ADD VALUE 'CHANGEMENT_EMAIL';

-- AlterTable
ALTER TABLE "Jeton" ADD COLUMN     "nouvelEmail" TEXT;

-- AlterTable
ALTER TABLE "Membre" ADD COLUMN     "dernierRappelCotisation" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MessageContact" ADD COLUMN     "reponduLe" TIMESTAMP(3),
ADD COLUMN     "reponduParId" TEXT,
ADD COLUMN     "reponse" TEXT;

-- AddForeignKey
ALTER TABLE "MessageContact" ADD CONSTRAINT "MessageContact_reponduParId_fkey" FOREIGN KEY ("reponduParId") REFERENCES "Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;
