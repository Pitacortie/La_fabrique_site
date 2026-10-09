// Préparation des tests de bout en bout :
//  1. prépare la base de test « fabrique_test » (migrations, tables vidées) et y crée les comptes de test ;
//  2. construit le site dans .next-test (sauf TEST_SANS_BUILD=1 si un build existe déjà) ;
//  3. lance le serveur sur le port de test et attend qu'il réponde ;
//  4. l'arrête à la fin.
import { execSync, spawn } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { COMPTES, BASE, DATABASE_URL_TEST, DOSSIER_TMP, JOURNAL_SERVEUR, PORT, RACINE, TACHES_SECRET_TEST } from "./config.mjs";

const ENV_SERVEUR = {
  ...process.env,
  NODE_ENV: "production",
  DATABASE_URL: DATABASE_URL_TEST,
  NEXT_DIST_DIR: ".next-test",
  APP_URL: BASE,
  SMTP_HOST: "", // courriels écrits dans le journal du serveur, lus par les tests
  UPLOADS_DIR: path.join(DOSSIER_TMP, "uploads"),
  PRIVATE_UPLOADS_DIR: path.join(DOSSIER_TMP, "prive"),
  TACHES_SECRET: TACHES_SECRET_TEST,
  TACHES_DATE_TEST_AUTORISEE: "1", // permet aux tests de simuler la date des rappels de cotisation
  NEXT_TELEMETRY_DISABLED: "1",
};

function lancer(commande, env = ENV_SERVEUR) {
  execSync(commande, { cwd: RACINE, env, stdio: ["ignore", "ignore", "inherit"] });
}

// Vide les tables de la base de TEST uniquement. Garde-fous : le nom de la base doit finir par « _test »
// et ne doit pas être celui de DATABASE_URL (la base de développement du fichier .env).
async function viderBaseDeTest() {
  const nomBase = (url) => (url ? new URL(url).pathname.slice(1) : null);
  const base = nomBase(DATABASE_URL_TEST);
  const baseDev = nomBase(process.env.DATABASE_URL ?? lireDatabaseUrlDuEnv());
  if (!base?.endsWith("_test") || base === baseDev) {
    throw new Error(`Refus de vider la base « ${base} » : seule une base dédiée aux tests (nom en « _test ») peut l'être.`);
  }
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL_TEST });
  const tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"public"."${t.tablename}"`).join(", ")} CASCADE`);
  }
  await prisma.$disconnect();
}

function lireDatabaseUrlDuEnv() {
  try {
    return /^DATABASE_URL="?([^"\n]+)"?/m.exec(readFileSync(path.join(RACINE, ".env"), "utf8"))?.[1];
  } catch {
    return null;
  }
}

async function creerComptes() {
  const { PrismaClient } = await import("@prisma/client");
  const { hash } = await import("@node-rs/argon2");
  const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL_TEST });
  let n = 0;
  for (const [cle, c] of Object.entries(COMPTES)) {
    if (cle === "bureau") continue; // créé par le seed
    await prisma.membre.create({
      data: {
        email: c.email,
        motDePasseHash: await hash(c.motDePasse),
        prenom: cle.charAt(0).toUpperCase() + cle.slice(1),
        nom: "Test",
        telephone: "06 00 00 00 00",
        adresse: "1 rue des Tests",
        codePostal: "24700",
        commune: "Ménesplet",
        statut: c.statut ?? "ACTIF",
        role: c.role,
        peutPublier: c.peutPublier ?? false,
        alias: { create: { code: `FAB-TEST${String(++n).padStart(2, "0")}` } },
      },
    });
  }
  // Comptes du SEL : cotisation à jour, inscription, attestation d'assurance validée (ou expirée)
  const bureau = await prisma.membre.findUnique({ where: { email: COMPTES.bureau.email } });
  const anneeProchaine = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 11, 31));
  for (const c of Object.values(COMPTES)) {
    if (!c.sel && !c.cotisation) continue;
    const m = await prisma.membre.findUnique({ where: { email: c.email } });
    await prisma.cotisation.create({
      data: { membreId: m.id, montant: 1, modeReglement: "ESPECES", recueLe: new Date(), valideJusquau: anneeProchaine, saisieParId: bureau.id },
    });
    if (!c.sel) continue;
    await prisma.inscriptionSel.create({ data: { membreId: m.id } });
    await prisma.attestationRc.create({
      data: {
        membreId: m.id,
        assureur: "Assurance de test",
        statut: "VALIDEE",
        valideJusquau: c.sel === "assurance-expiree" ? new Date(Date.now() - 86_400_000) : anneeProchaine,
        verifieParId: bureau.id,
        verifieLe: new Date(),
      },
    });
  }

  // Tous les comptes ont accepté les textes en vigueur (sinon l'écran « nouvelle version » s'afficherait)
  const textes = await prisma.texteJuridique.findMany();
  const membres = await prisma.membre.findMany();
  await prisma.acceptation.createMany({ data: membres.flatMap((m) => textes.map((t) => ({ texteId: t.id, membreId: m.id }))) });
  await prisma.$disconnect();
}

async function attendreServeur(serveur) {
  for (let i = 0; i < 120; i++) {
    if (serveur.exitCode !== null) throw new Error(`Le serveur s'est arrêté (code ${serveur.exitCode}), voir ${JOURNAL_SERVEUR}`);
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok && (await r.json()).db === "ok") return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Le serveur de test ne répond pas sur ${BASE}`);
}

export default async function preparation() {
  rmSync(DOSSIER_TMP, { recursive: true, force: true });
  mkdirSync(DOSSIER_TMP, { recursive: true });

  console.log("\n▶ Base de test : migrations, nettoyage et données initiales…");
  lancer("npx prisma migrate deploy"); // crée la base de test si besoin, n'efface rien
  await viderBaseDeTest();
  lancer("node prisma/seed.mjs", {
    ...ENV_SERVEUR,
    SEED_ADMIN_EMAIL: COMPTES.bureau.email,
    SEED_ADMIN_PASSWORD: COMPTES.bureau.motDePasse,
  });
  await creerComptes();

  if (process.env.TEST_SANS_BUILD === "1" && existsSync(path.join(RACINE, ".next-test", "BUILD_ID"))) {
    console.log("▶ Build réutilisé (TEST_SANS_BUILD=1)");
  } else {
    console.log("▶ Construction du site (1 à 2 minutes)…");
    lancer("npx next build");
  }

  console.log(`▶ Démarrage du serveur de test sur le port ${PORT}…`);
  const journal = createWriteStream(JOURNAL_SERVEUR);
  const serveur = spawn(process.execPath, [path.join(RACINE, "node_modules/next/dist/bin/next"), "start", "-p", String(PORT)], {
    cwd: RACINE,
    env: ENV_SERVEUR,
  });
  serveur.stdout.pipe(journal);
  serveur.stderr.pipe(journal);
  await attendreServeur(serveur);
  console.log("▶ Serveur prêt, lancement des tests.\n");

  return async () => {
    serveur.kill();
    journal.end();
  };
}
