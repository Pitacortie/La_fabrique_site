import path from "node:path";

// Paramètres partagés entre la préparation (global setup) et les tests.
export const PORT = Number(process.env.TEST_PORT || 3199);
export const BASE = `http://localhost:${PORT}`;
export const RACINE = path.resolve(import.meta.dirname, "../..");
export const DOSSIER_TMP = path.join(RACINE, "tests", ".tmp");
export const JOURNAL_SERVEUR = path.join(DOSSIER_TMP, "serveur.log");

// Base dédiée aux tests, remise à zéro à chaque lancement. Jamais la base de développement.
export const DATABASE_URL_TEST =
  process.env.TEST_DATABASE_URL || "postgresql://fabrique:fabrique@localhost:5432/fabrique_test?schema=public";

// Comptes créés par la préparation. Chaque fichier de test utilise ses propres comptes
// quand il modifie un mot de passe ou des coordonnées, pour rester indépendant des autres.
export const TACHES_SECRET_TEST = "secret-des-taches-pour-les-tests";

export const COMPTES = {
  bureau: { email: "bureau@test.local", motDePasse: "Bureau-test-2026!", role: "BUREAU", peutPublier: true },
  admin: { email: "admin@test.local", motDePasse: "Admin-test-2026!", role: "ADMINISTRATEUR", peutPublier: false },
  adherent: { email: "adherent@test.local", motDePasse: "Adherent-test-2026!", role: "ADHERENT" },
  suspendu: { email: "suspendu@test.local", motDePasse: "Suspendu-test-2026!", role: "ADHERENT", statut: "SUSPENDU" },
  motdepasse: { email: "motdepasse@test.local", motDePasse: "Motdepasse-test-2026!", role: "ADHERENT" },
  oubli: { email: "oubli@test.local", motDePasse: "Oubli-test-2026!", role: "ADHERENT" },
  coordonnees: { email: "coordonnees@test.local", motDePasse: "Coordonnees-test-2026!", role: "ADHERENT" },
  changementEmail: { email: "changement@test.local", motDePasse: "Changement-test-2026!", role: "ADHERENT" },
  reconsentement: { email: "reconsentement@test.local", motDePasse: "Reconsentement-test-2026!", role: "ADHERENT" },
  // SEL : « sel » = cotisation à jour, inscrit au SEL, attestation d'assurance validée
  selUn: { email: "sel-un@test.local", motDePasse: "Sel-un-test-2026!", role: "ADHERENT", sel: true },
  selDeux: { email: "sel-deux@test.local", motDePasse: "Sel-deux-test-2026!", role: "ADHERENT", sel: true },
  selTrois: { email: "sel-trois@test.local", motDePasse: "Sel-trois-test-2026!", role: "ADHERENT", sel: true },
  selPauvre: { email: "sel-pauvre@test.local", motDePasse: "Sel-pauvre-test-2026!", role: "ADHERENT", sel: true },
  selExpire: { email: "sel-expire@test.local", motDePasse: "Sel-expire-test-2026!", role: "ADHERENT", sel: "assurance-expiree" },
  selNouveau: { email: "sel-nouveau@test.local", motDePasse: "Sel-nouveau-test-2026!", role: "ADHERENT", cotisation: true },
  selRefuse: { email: "sel-refuse@test.local", motDePasse: "Sel-refuse-test-2026!", role: "ADHERENT", cotisation: true },
};
