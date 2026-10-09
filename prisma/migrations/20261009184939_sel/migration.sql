-- CreateEnum
CREATE TYPE "StatutInscriptionSel" AS ENUM ('ACTIVE', 'SUSPENDUE');

-- CreateEnum
CREATE TYPE "StatutAttestation" AS ENUM ('EN_ATTENTE', 'VALIDEE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "TypeAnnonce" AS ENUM ('OFFRE', 'DEMANDE');

-- CreateEnum
CREATE TYPE "NatureAnnonce" AS ENUM ('SERVICE', 'PRET', 'DON', 'OBJET');

-- CreateEnum
CREATE TYPE "Modalite" AS ENUM ('PRESENTIEL', 'DISTANCE');

-- CreateEnum
CREATE TYPE "StatutAnnonce" AS ENUM ('PUBLIEE', 'CLOTUREE', 'MASQUEE');

-- CreateEnum
CREATE TYPE "StatutConversation" AS ENUM ('OUVERTE', 'FERMEE');

-- CreateEnum
CREATE TYPE "StatutEchange" AS ENUM ('PROPOSE', 'CONFIRME', 'DECLARE', 'TERMINE', 'ANNULE', 'LITIGE');

-- CreateEnum
CREATE TYPE "MotifSignalementSel" AS ENUM ('PARTISAN', 'PROPOS', 'ARNAQUE', 'DONNEES', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutSignalementSel" AS ENUM ('NOUVEAU', 'TRAITE');

-- AlterTable
ALTER TABLE "Alias" ADD COLUMN     "plancherBriques" INTEGER,
ADD COLUMN     "soldeBriques" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "InscriptionSel" (
    "id" TEXT NOT NULL,
    "membreId" TEXT NOT NULL,
    "statut" "StatutInscriptionSel" NOT NULL DEFAULT 'ACTIVE',
    "motifSuspension" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InscriptionSel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttestationRc" (
    "id" TEXT NOT NULL,
    "membreId" TEXT NOT NULL,
    "assureur" TEXT NOT NULL,
    "valideJusquau" DATE NOT NULL,
    "fichier" TEXT,
    "fichierType" TEXT,
    "statut" "StatutAttestation" NOT NULL DEFAULT 'EN_ATTENTE',
    "motifRefus" TEXT,
    "verifieParId" TEXT,
    "verifieLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttestationRc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubriqueSel" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "exemples" TEXT,
    "rappel" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RubriqueSel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Annonce" (
    "id" TEXT NOT NULL,
    "type" "TypeAnnonce" NOT NULL,
    "nature" "NatureAnnonce" NOT NULL,
    "rubriqueId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dureeEstimee" INTEGER,
    "valeurBriques" INTEGER,
    "zone" TEXT NOT NULL,
    "modalite" "Modalite" NOT NULL,
    "disponibilites" TEXT,
    "dateFin" DATE,
    "motsCles" TEXT,
    "auteurId" TEXT NOT NULL,
    "statut" "StatutAnnonce" NOT NULL DEFAULT 'PUBLIEE',
    "motifModeration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Annonce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "annonceId" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "interlocuteurId" TEXT NOT NULL,
    "statut" "StatutConversation" NOT NULL DEFAULT 'OUVERTE',
    "fermeeParId" TEXT,
    "accordAuteurLe" TIMESTAMP(3),
    "accordInterlocuteurLe" TIMESTAMP(3),
    "dernierMessageLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "emetteurId" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "luLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Echange" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "beneficiaireId" TEXT NOT NULL,
    "prestataireId" TEXT NOT NULL,
    "nature" "NatureAnnonce" NOT NULL,
    "creneau" TIMESTAMP(3) NOT NULL,
    "lieu" TEXT NOT NULL,
    "confirmeLe" TIMESTAMP(3),
    "dureeMinutes" INTEGER,
    "briques" INTEGER,
    "bienPasse" BOOLEAN,
    "commentaire" TEXT,
    "declareLe" TIMESTAMP(3),
    "avisBeneficiaire" TEXT,
    "termineLe" TIMESTAMP(3),
    "statut" "StatutEchange" NOT NULL DEFAULT 'PROPOSE',
    "annulePar" TEXT,
    "motifAnnulation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Echange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionBriques" (
    "id" TEXT NOT NULL,
    "echangeId" TEXT,
    "montant" INTEGER NOT NULL,
    "debiteId" TEXT,
    "crediteId" TEXT,
    "libelle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionBriques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalementSel" (
    "id" TEXT NOT NULL,
    "signaleurId" TEXT NOT NULL,
    "annonceId" TEXT,
    "conversationId" TEXT,
    "messageId" TEXT,
    "motif" "MotifSignalementSel" NOT NULL,
    "details" TEXT,
    "statut" "StatutSignalementSel" NOT NULL DEFAULT 'NOUVEAU',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignalementSel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InscriptionSel_membreId_key" ON "InscriptionSel"("membreId");

-- CreateIndex
CREATE INDEX "AttestationRc_statut_createdAt_idx" ON "AttestationRc"("statut", "createdAt");

-- CreateIndex
CREATE INDEX "AttestationRc_membreId_idx" ON "AttestationRc"("membreId");

-- CreateIndex
CREATE UNIQUE INDEX "RubriqueSel_code_key" ON "RubriqueSel"("code");

-- CreateIndex
CREATE INDEX "Annonce_type_statut_createdAt_idx" ON "Annonce"("type", "statut", "createdAt");

-- CreateIndex
CREATE INDEX "Annonce_auteurId_idx" ON "Annonce"("auteurId");

-- CreateIndex
CREATE INDEX "Conversation_auteurId_dernierMessageLe_idx" ON "Conversation"("auteurId", "dernierMessageLe");

-- CreateIndex
CREATE INDEX "Conversation_interlocuteurId_dernierMessageLe_idx" ON "Conversation"("interlocuteurId", "dernierMessageLe");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_annonceId_interlocuteurId_key" ON "Conversation"("annonceId", "interlocuteurId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Echange_beneficiaireId_statut_idx" ON "Echange"("beneficiaireId", "statut");

-- CreateIndex
CREATE INDEX "Echange_prestataireId_statut_idx" ON "Echange"("prestataireId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionBriques_echangeId_key" ON "TransactionBriques"("echangeId");

-- CreateIndex
CREATE INDEX "TransactionBriques_debiteId_createdAt_idx" ON "TransactionBriques"("debiteId", "createdAt");

-- CreateIndex
CREATE INDEX "TransactionBriques_crediteId_createdAt_idx" ON "TransactionBriques"("crediteId", "createdAt");

-- CreateIndex
CREATE INDEX "SignalementSel_statut_createdAt_idx" ON "SignalementSel"("statut", "createdAt");

-- AddForeignKey
ALTER TABLE "InscriptionSel" ADD CONSTRAINT "InscriptionSel_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "Membre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttestationRc" ADD CONSTRAINT "AttestationRc_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "Membre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttestationRc" ADD CONSTRAINT "AttestationRc_verifieParId_fkey" FOREIGN KEY ("verifieParId") REFERENCES "Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annonce" ADD CONSTRAINT "Annonce_rubriqueId_fkey" FOREIGN KEY ("rubriqueId") REFERENCES "RubriqueSel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annonce" ADD CONSTRAINT "Annonce_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Alias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_annonceId_fkey" FOREIGN KEY ("annonceId") REFERENCES "Annonce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Alias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_interlocuteurId_fkey" FOREIGN KEY ("interlocuteurId") REFERENCES "Alias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_emetteurId_fkey" FOREIGN KEY ("emetteurId") REFERENCES "Alias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Echange" ADD CONSTRAINT "Echange_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Echange" ADD CONSTRAINT "Echange_beneficiaireId_fkey" FOREIGN KEY ("beneficiaireId") REFERENCES "Alias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Echange" ADD CONSTRAINT "Echange_prestataireId_fkey" FOREIGN KEY ("prestataireId") REFERENCES "Alias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionBriques" ADD CONSTRAINT "TransactionBriques_echangeId_fkey" FOREIGN KEY ("echangeId") REFERENCES "Echange"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionBriques" ADD CONSTRAINT "TransactionBriques_debiteId_fkey" FOREIGN KEY ("debiteId") REFERENCES "Alias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionBriques" ADD CONSTRAINT "TransactionBriques_crediteId_fkey" FOREIGN KEY ("crediteId") REFERENCES "Alias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalementSel" ADD CONSTRAINT "SignalementSel_signaleurId_fkey" FOREIGN KEY ("signaleurId") REFERENCES "Alias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalementSel" ADD CONSTRAINT "SignalementSel_annonceId_fkey" FOREIGN KEY ("annonceId") REFERENCES "Annonce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalementSel" ADD CONSTRAINT "SignalementSel_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalementSel" ADD CONSTRAINT "SignalementSel_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
