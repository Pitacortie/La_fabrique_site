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
    {
      type: "CHARTE_SEL",
      titre: "Charte des membres du SEL",
      version: "1",
      enVigueurLe: new Date("2026-01-31"),
      contenu: "Texte intégral de la Charte des membres du SEL, onze engagements d'entraide, de respect et de confiance (à importer).",
    },
    {
      type: "REGLEMENT_SEL",
      titre: "Règlement intérieur du SEL",
      version: "1",
      enVigueurLe: new Date("2026-01-31"),
      contenu:
        "Texte intégral du Règlement intérieur du SEL : briques, échanges, biens, frais, responsabilité, assurance, sécurité, litiges, sanctions, départ (à importer, et à compléter : anonymat, messagerie, données personnelles).",
    },
  ];
  for (const t of textes) {
    await prisma.texteJuridique.upsert({
      where: { type_version: { type: t.type, version: t.version } },
      update: {},
      create: t,
    });
  }

  // Rubriques du catalogue des échanges du SEL (annexe B), modifiables ensuite par un administrateur (ADM-10).
  const rubriques = [
    ["maison", "Maison et bricolage", "Petit bricolage, montage de meubles, aide à la peinture, aide à un déménagement, couture, repassage", "Ces coups de main ne remplacent pas l'intervention d'un professionnel."],
    ["jardin", "Jardin et extérieur", "Tonte, désherbage, taille de petits arbustes, arrosage pendant une absence, graines et plants", null],
    ["cuisine", "Cuisine et alimentation", "Préparation d'un repas, atelier pâtisserie, conserves, fabrication de pain, partage de surplus", "Respectez les règles d'hygiène pour les denrées partagées."],
    ["informatique", "Informatique et numérique", "Prise en main d'un ordinateur ou d'un smartphone, installation d'une application, sécurité des comptes", "Ne confiez jamais un mot de passe."],
    ["administratif", "Administratif et vie quotidienne", "Courrier, aide à un formulaire, CV, démarches en ligne", "Ne remplace pas un professionnel ; attention aux données personnelles sensibles."],
    ["savoirs", "Savoirs et apprentissages", "Soutien scolaire, langues, mathématiques, photographie, musique, préparation d'un examen", null],
    ["creation", "Création et loisirs", "Couture, tricot, dessin, jeux de société, prêt de livres, atelier entre adhérents", null],
    ["mobilite", "Mobilité et déplacements", "Covoiturage ponctuel, accompagnement pour une course ou un rendez-vous, transport d'un objet", "Les frais (carburant, péages) se règlent en euros, convenus avant l'échange, hors briques."],
    ["animaux", "Animaux", "Promenade d'un chien, garde ponctuelle, transport d'un animal", "Le propriétaire reste responsable et informe sur le comportement de son animal."],
    ["enfants", "Enfants et famille", "Aide ponctuelle autour d'une activité familiale, accompagnement d'un enfant, matériel de puériculture", "Accord préalable du représentant légal obligatoire ; levée d'anonymat avant l'échange."],
    ["bienetre", "Bien-être et convivialité", "Marche, sortie, relaxation, activité sportive, lecture partagée", "Les soins médicaux et thérapeutiques sont exclus."],
    ["objets", "Objets : prêt, don ou échange", "Outils, petit électroménager, livres, matériel de camping, vêtements, matériel informatique", "Les biens doivent être légaux et conformes à leur description."],
  ];
  for (const [i, [code, libelle, exemples, rappel]] of rubriques.entries()) {
    await prisma.rubriqueSel.upsert({ where: { code }, update: {}, create: { code, libelle, exemples, rappel, ordre: i + 1 } });
  }

  // Nos « Fabrications » (FAB-2) : créées une seule fois, ensuite gérées depuis la console.
  if ((await prisma.fabrication.count()) === 0) {
    await prisma.fabrication.createMany({
      data: [
        { nom: "Le SEL", description: "Service d'échange local : services et objets échangés entre adhérents, en briques, sans argent.", etat: "Ouvert", couleur: "terracotta", lien: "/sel", ordre: 1 },
        { nom: "Café citoyen", description: "Contenu en cours de définition.", etat: "À venir", couleur: "bleu", ordre: 2 },
        { nom: "Plan de Sauvegarde", description: "Contenu en cours de définition.", etat: "À venir", couleur: "vert", ordre: 3 },
      ],
    });
  }

  // Le SEL est ouvert : on met à jour la carte créée avant son ouverture (si personne ne l'a modifiée depuis)
  await prisma.fabrication.updateMany({
    where: { nom: "Le SEL", etat: "Ouverture prochaine" },
    data: { etat: "Ouvert", description: "Service d'échange local : services et objets échangés entre adhérents, en briques, sans argent." },
  });

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
