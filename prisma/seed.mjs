// Données initiales : premier compte Bureau, textes juridiques, contenus et articles de démo.
// Idempotent : peut être relancé sans créer de doublons (npm run db:seed).
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { randomInt } from "node:crypto";

const prisma = new PrismaClient();

// Code alias : aléatoire, non séquentiel, sans lien avec l'identité (section 6.3).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function genererCode() {
  let code = "";
  for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return `FAB-${code}`;
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const motDePasse = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !motDePasse) throw new Error("SEED_ADMIN_EMAIL et SEED_ADMIN_PASSWORD sont requis.");

  const admin = await prisma.membre.upsert({
    where: { email },
    update: {},
    create: {
      email,
      nom: "Administrateur",
      prenom: "Premier",
      motDePasseHash: await hash(motDePasse),
      statut: "ACTIF",
      role: "BUREAU",
      categorie: "FONDATEUR",
      peutPublier: true,
      alias: { create: { code: genererCode() } },
    },
  });

  // Textes : contenu provisoire, à remplacer par les versions officielles depuis la console (ADM-11).
  const textes = [
    {
      type: "STATUTS",
      titre: "Statuts de La Fabrique de Ménesplet",
      version: "2026-01-31",
      enVigueurLe: new Date("2026-01-31"),
      contenu: "Texte intégral des statuts signés le 31/01/2026 (à importer).",
    },
    {
      type: "REGLEMENT_INTERIEUR",
      titre: "Règlement intérieur de La Fabrique",
      version: "1",
      enVigueurLe: new Date("2026-01-31"), // date d'adoption à confirmer (point ouvert 28)
      contenu: "Texte intégral du règlement intérieur, quinze articles (à importer).",
    },
    {
      type: "CHARTE_NEUTRALITE",
      titre: "Charte de neutralité et de participation",
      version: "1",
      enVigueurLe: new Date("2026-01-31"),
      contenu: "Texte intégral de la charte, huit principes (à importer).",
    },
  ];
  for (const t of textes) {
    await prisma.texteJuridique.upsert({
      where: { type_version: { type: t.type, version: t.version } },
      update: {},
      create: t,
    });
  }

  // Nos « Fabrications » (FAB-2) : créées une seule fois, ensuite gérées depuis la console.
  if ((await prisma.fabrication.count()) === 0) {
    await prisma.fabrication.createMany({
      data: [
        { nom: "Le SEL", description: "Service d'échange local : offres, demandes et échanges en briques, sans argent.", etat: "Ouverture prochaine", couleur: "terracotta", lien: "/sel", ordre: 1 },
        { nom: "Café citoyen", description: "Contenu en cours de définition.", etat: "À venir", couleur: "bleu", ordre: 2 },
        { nom: "Plan de Sauvegarde", description: "Contenu en cours de définition.", etat: "À venir", couleur: "vert", ordre: 3 },
      ],
    });
  }

  const articles = [
    {
      slug: "auberge-espagnole-automne",
      titre: "Auberge espagnole d'automne",
      extrait: "Chacun apporte un plat, on partage la table et les idées pour la saison.",
      contenu: "Rendez-vous au lieu Laser pour une soirée conviviale ouverte à tous les habitants.",
      categorie: "Événement",
      dateActivite: new Date("2026-11-14"),
    },
    {
      slug: "atelier-jardin-partage",
      titre: "Atelier au jardin partagé",
      extrait: "Une matinée de plantations et de conseils entre voisins de tous âges.",
      contenu: "Merci aux participants ! Prochaine séance au printemps.",
      categorie: "Atelier",
      dateActivite: new Date("2026-09-20"),
    },
  ];
  for (const a of articles) {
    await prisma.article.upsert({
      where: { slug: a.slug },
      update: {},
      create: { ...a, statut: "PUBLIE", publieLe: new Date(), auteurId: admin.id },
    });
  }

  console.log(`Seed terminé. Compte Bureau : ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
