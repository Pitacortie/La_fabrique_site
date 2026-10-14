-- Cahier des charges v1.3 : assurance déclarative, brouillons, sans localisation, agenda, gazette, photos
-- AlterEnum
ALTER TYPE "StatutAnnonce" ADD VALUE 'BROUILLON';

-- DropForeignKey
ALTER TABLE "AttestationRc" DROP CONSTRAINT "AttestationRc_membreId_fkey";

-- DropForeignKey
ALTER TABLE "AttestationRc" DROP CONSTRAINT "AttestationRc_verifieParId_fkey";

-- AlterTable
ALTER TABLE "Alias" DROP COLUMN "plancherBriques";

-- AlterTable
ALTER TABLE "Annonce" DROP COLUMN "zone";

-- AlterTable
ALTER TABLE "InscriptionSel" ADD COLUMN     "assuranceRc" JSONB;

-- Reprise : une attestation déjà validée vaut déclaration d'assurance (le numéro de police reste à compléter)
UPDATE "InscriptionSel" i SET "assuranceRc" = jsonb_build_object(
  'numeroPolice', '', 'compagnie', a."assureur", 'adresseCompagnie', '', 'declareeLe', to_char(COALESCE(a."verifieLe", a."createdAt"), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
FROM (
  SELECT DISTINCT ON ("membreId") * FROM "AttestationRc" WHERE "statut" = 'VALIDEE' ORDER BY "membreId", "createdAt" DESC
) a
WHERE a."membreId" = i."membreId";

-- AlterTable
ALTER TABLE "Media" DROP COLUMN "autorisationPublication",
ALTER COLUMN "texteAlternatif" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Membre" DROP COLUMN "peutPublier";

-- DropTable
DROP TABLE "AttestationRc";

-- DropEnum
DROP TYPE "StatutAttestation";

-- CreateTable
CREATE TABLE "Evenement" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3),
    "lieu" TEXT NOT NULL,
    "description" TEXT,
    "auteurId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evenement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumeroGazette" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "numero" INTEGER,
    "parution" DATE NOT NULL,
    "resume" TEXT,
    "fichier" TEXT,
    "publie" BOOLEAN NOT NULL DEFAULT true,
    "auteurId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumeroGazette_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Evenement_debut_idx" ON "Evenement"("debut");

-- CreateIndex
CREATE INDEX "NumeroGazette_publie_parution_idx" ON "NumeroGazette"("publie", "parution");

-- AddForeignKey
ALTER TABLE "Evenement" ADD CONSTRAINT "Evenement_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NumeroGazette" ADD CONSTRAINT "NumeroGazette_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

