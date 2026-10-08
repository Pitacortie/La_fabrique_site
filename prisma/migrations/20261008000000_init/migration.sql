-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StatutDemande" AS ENUM ('EN_ATTENTE', 'VALIDEE', 'REFUSEE', 'CLASSEE_SANS_SUITE');

-- CreateEnum
CREATE TYPE "StatutMembre" AS ENUM ('EN_ATTENTE_ACTIVATION', 'ACTIF', 'SUSPENDU', 'CLOTURE');

-- CreateEnum
CREATE TYPE "CategorieMembre" AS ENUM ('FONDATEUR', 'ACTIF', 'ADHERENT', 'BIENFAITEUR');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADHERENT', 'ADMINISTRATEUR', 'BUREAU');

-- CreateEnum
CREATE TYPE "ModeReglement" AS ENUM ('CHEQUE', 'ESPECES', 'VIREMENT', 'WERO_PAYLIB');

-- CreateEnum
CREATE TYPE "TypeTexte" AS ENUM ('STATUTS', 'REGLEMENT_INTERIEUR', 'CHARTE_NEUTRALITE', 'BULLETIN_ADHESION', 'CHARTE_SEL', 'REGLEMENT_SEL');

-- CreateEnum
CREATE TYPE "TypeJeton" AS ENUM ('ACTIVATION', 'REINITIALISATION');

-- CreateEnum
CREATE TYPE "StatutArticle" AS ENUM ('BROUILLON', 'PUBLIE', 'RETIRE');

-- CreateEnum
CREATE TYPE "StatutMessage" AS ENUM ('NOUVEAU', 'EN_COURS', 'TRAITE');

-- CreateTable
CREATE TABLE "DemandeAdhesion" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "dateNaissance" DATE NOT NULL,
    "adresse" TEXT NOT NULL,
    "codePostal" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "responsableNom" TEXT,
    "responsableLien" TEXT,
    "responsableTelephone" TEXT,
    "droitImage" BOOLEAN NOT NULL,
    "montantPropose" DECIMAL(8,2) NOT NULL,
    "modeReglement" "ModeReglement" NOT NULL,
    "consentementLeveeAnonymat" BOOLEAN NOT NULL,
    "certifieLe" TIMESTAMP(3) NOT NULL,
    "consentementRgpdLe" TIMESTAMP(3) NOT NULL,
    "statut" "StatutDemande" NOT NULL DEFAULT 'EN_ATTENTE',
    "motifRefus" TEXT,
    "decideLe" TIMESTAMP(3),
    "decideParId" TEXT,
    "membreId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeAdhesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membre" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasseHash" TEXT,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "dateNaissance" DATE,
    "adresse" TEXT,
    "codePostal" TEXT,
    "commune" TEXT,
    "telephone" TEXT,
    "responsableNom" TEXT,
    "responsableLien" TEXT,
    "responsableTelephone" TEXT,
    "droitImage" BOOLEAN NOT NULL DEFAULT false,
    "categorie" "CategorieMembre" NOT NULL DEFAULT 'ADHERENT',
    "dateAgrement" TIMESTAMP(3),
    "statut" "StatutMembre" NOT NULL DEFAULT 'EN_ATTENTE_ACTIVATION',
    "motifStatut" TEXT,
    "role" "Role" NOT NULL DEFAULT 'ADHERENT',
    "peutPublier" BOOLEAN NOT NULL DEFAULT false,
    "derniereConnexion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alias" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "membreId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TexteJuridique" (
    "id" TEXT NOT NULL,
    "type" "TypeTexte" NOT NULL,
    "titre" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "fichierUrl" TEXT,
    "enVigueurLe" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TexteJuridique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Acceptation" (
    "id" TEXT NOT NULL,
    "texteId" TEXT NOT NULL,
    "demandeId" TEXT,
    "membreId" TEXT,
    "accepteLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Acceptation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cotisation" (
    "id" TEXT NOT NULL,
    "membreId" TEXT NOT NULL,
    "montant" DECIMAL(8,2) NOT NULL,
    "modeReglement" "ModeReglement" NOT NULL,
    "recueLe" DATE NOT NULL,
    "valideJusquau" DATE NOT NULL,
    "saisieParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cotisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "membreId" TEXT NOT NULL,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jeton" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "type" "TypeJeton" NOT NULL,
    "membreId" TEXT NOT NULL,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "utiliseLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Jeton_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContenuEditorial" (
    "id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "titre" TEXT,
    "contenu" TEXT NOT NULL,
    "modifieParId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContenuEditorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "extrait" TEXT,
    "contenu" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "dateActivite" TIMESTAMP(3),
    "statut" "StatutArticle" NOT NULL DEFAULT 'BROUILLON',
    "publieLe" TIMESTAMP(3),
    "auteurId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "legende" TEXT,
    "credit" TEXT,
    "texteAlternatif" TEXT NOT NULL,
    "autorisationPublication" BOOLEAN NOT NULL DEFAULT false,
    "articleId" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "importeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageContact" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "sujet" TEXT,
    "texte" TEXT NOT NULL,
    "statut" "StatutMessage" NOT NULL DEFAULT 'NOUVEAU',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalAudit" (
    "id" TEXT NOT NULL,
    "acteurId" TEXT,
    "action" TEXT NOT NULL,
    "cibleType" TEXT NOT NULL,
    "cibleId" TEXT,
    "motif" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemandeAdhesion_membreId_key" ON "DemandeAdhesion"("membreId");

-- CreateIndex
CREATE INDEX "DemandeAdhesion_statut_createdAt_idx" ON "DemandeAdhesion"("statut", "createdAt");

-- CreateIndex
CREATE INDEX "DemandeAdhesion_email_idx" ON "DemandeAdhesion"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Membre_email_key" ON "Membre"("email");

-- CreateIndex
CREATE INDEX "Membre_statut_idx" ON "Membre"("statut");

-- CreateIndex
CREATE INDEX "Membre_nom_prenom_idx" ON "Membre"("nom", "prenom");

-- CreateIndex
CREATE UNIQUE INDEX "Alias_code_key" ON "Alias"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Alias_membreId_key" ON "Alias"("membreId");

-- CreateIndex
CREATE INDEX "TexteJuridique_type_enVigueurLe_idx" ON "TexteJuridique"("type", "enVigueurLe");

-- CreateIndex
CREATE UNIQUE INDEX "TexteJuridique_type_version_key" ON "TexteJuridique"("type", "version");

-- CreateIndex
CREATE INDEX "Acceptation_membreId_idx" ON "Acceptation"("membreId");

-- CreateIndex
CREATE INDEX "Acceptation_demandeId_idx" ON "Acceptation"("demandeId");

-- CreateIndex
CREATE INDEX "Cotisation_membreId_valideJusquau_idx" ON "Cotisation"("membreId", "valideJusquau");

-- CreateIndex
CREATE INDEX "Session_membreId_idx" ON "Session"("membreId");

-- CreateIndex
CREATE UNIQUE INDEX "Jeton_tokenHash_key" ON "Jeton"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "ContenuEditorial_cle_key" ON "ContenuEditorial"("cle");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_statut_publieLe_idx" ON "Article"("statut", "publieLe");

-- CreateIndex
CREATE INDEX "MessageContact_statut_createdAt_idx" ON "MessageContact"("statut", "createdAt");

-- CreateIndex
CREATE INDEX "JournalAudit_createdAt_idx" ON "JournalAudit"("createdAt");

-- CreateIndex
CREATE INDEX "JournalAudit_cibleType_cibleId_idx" ON "JournalAudit"("cibleType", "cibleId");

-- AddForeignKey
ALTER TABLE "DemandeAdhesion" ADD CONSTRAINT "DemandeAdhesion_decideParId_fkey" FOREIGN KEY ("decideParId") REFERENCES "Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeAdhesion" ADD CONSTRAINT "DemandeAdhesion_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alias" ADD CONSTRAINT "Alias_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "Membre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acceptation" ADD CONSTRAINT "Acceptation_texteId_fkey" FOREIGN KEY ("texteId") REFERENCES "TexteJuridique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acceptation" ADD CONSTRAINT "Acceptation_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeAdhesion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acceptation" ADD CONSTRAINT "Acceptation_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotisation" ADD CONSTRAINT "Cotisation_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "Membre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotisation" ADD CONSTRAINT "Cotisation_saisieParId_fkey" FOREIGN KEY ("saisieParId") REFERENCES "Membre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "Membre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jeton" ADD CONSTRAINT "Jeton_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "Membre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContenuEditorial" ADD CONSTRAINT "ContenuEditorial_modifieParId_fkey" FOREIGN KEY ("modifieParId") REFERENCES "Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Membre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalAudit" ADD CONSTRAINT "JournalAudit_acteurId_fkey" FOREIGN KEY ("acteurId") REFERENCES "Membre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

