-- Alertes e-mail choisies par membre du Bureau ou administrateur (aucune par défaut)
ALTER TABLE "Membre" ADD COLUMN "alertes" TEXT[] DEFAULT ARRAY[]::TEXT[];
