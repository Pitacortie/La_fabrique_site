// Crée (ou recrée) quatre adhérents de test, prêts à utiliser le SEL, avec une annonce chacun.
//   npm run db:demo                          en local : supprime et recrée les comptes (remise à zéro)
//   node prisma/demo-adherent.mjs --si-absent  sur Render (build) : crée seulement les comptes manquants,
//                                             sans toucher aux existants ; ne fait rien si DEMO_COMPTES n'est pas « 1 », sans droits d'administration : npm run db:demo
// Données fictives. À ne pas lancer en production.
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { randomInt } from "node:crypto";

const prisma = new PrismaClient();

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const genererCode = () => `FAB-${Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")}`;

// Mots de passe volontairement simples : comptes de démonstration, en local uniquement.
const PERSONNES = [
  {
    email: "camille@fabrique.local",
    motDePasse: "camille2026",
    prenom: "Camille",
    nom: "Durand",
    telephone: "06 00 00 00 01",
    adresse: "3 chemin des Chênes",
    annonce: { type: "OFFRE", nature: "SERVICE", rubrique: "jardin", titre: "Coup de main au jardin", description: "Je peux vous aider à tondre, désherber ou tailler vos haies, le samedi matin de préférence.", dureeEstimee: 120, modalite: "PRESENTIEL" },
  },
  {
    email: "dominique@fabrique.local",
    motDePasse: "dominique2026",
    prenom: "Dominique",
    nom: "Martin",
    telephone: "06 00 00 00 02",
    adresse: "8 rue du Pont",
    annonce: { type: "DEMANDE", nature: "SERVICE", rubrique: "informatique", titre: "Aide pour mon smartphone", description: "Je cherche quelqu'un pour m'aider à installer et utiliser une application de visio pour appeler ma famille.", dureeEstimee: 60, modalite: "DISTANCE" },
  },
  {
    email: "sacha@fabrique.local",
    motDePasse: "sacha2026",
    prenom: "Sacha",
    nom: "Bernard",
    telephone: "06 00 00 00 03",
    adresse: "15 route de Montpon",
    annonce: { type: "OFFRE", nature: "SERVICE", rubrique: "cuisine", titre: "Atelier pain maison", description: "Je vous montre comment faire votre pain au levain, de la pâte à la cuisson, dans votre cuisine.", dureeEstimee: 180, modalite: "PRESENTIEL" },
  },
  {
    email: "lou@fabrique.local",
    motDePasse: "lou2026",
    prenom: "Lou",
    nom: "Petit",
    telephone: "06 00 00 00 04",
    adresse: "2 impasse des Vignes",
    annonce: { type: "OFFRE", nature: "OBJET", rubrique: "objets", titre: "Perceuse-visseuse à échanger", description: "Perceuse-visseuse sans fil en bon état, avec deux batteries et un coffret de mèches.", valeurBriques: 45, modalite: "PRESENTIEL" },
  },
  {
    // Adhérent à jour de cotisation mais PAS inscrit au SEL : pour tester l'inscription
    email: "alex@fabrique.local",
    motDePasse: "alex2026",
    prenom: "Alex",
    nom: "Moreau",
    telephone: "06 00 00 00 05",
    adresse: "5 place de l'Église",
    sel: false,
  },
];

async function supprimer(email) {
  const m = await prisma.membre.findUnique({ where: { email }, include: { alias: true } });
  if (!m) return;
  if (m.alias) {
    const aliasId = m.alias.id;
    const conversations = await prisma.conversation.findMany({ where: { OR: [{ auteurId: aliasId }, { interlocuteurId: aliasId }] }, select: { id: true } });
    const ids = conversations.map((c) => c.id);
    await prisma.$transaction([
      prisma.transactionBriques.deleteMany({ where: { OR: [{ debiteId: aliasId }, { crediteId: aliasId }] } }),
      prisma.signalementSel.deleteMany({ where: { OR: [{ signaleurId: aliasId }, { conversationId: { in: ids } }] } }),
      prisma.echange.deleteMany({ where: { conversationId: { in: ids } } }),
      prisma.message.deleteMany({ where: { conversationId: { in: ids } } }),
      prisma.conversation.deleteMany({ where: { id: { in: ids } } }),
      prisma.signalementSel.deleteMany({ where: { annonce: { auteurId: aliasId } } }),
      prisma.annonce.deleteMany({ where: { auteurId: aliasId } }),
    ]);
  }
  await prisma.$transaction([
    prisma.acceptation.deleteMany({ where: { membreId: m.id } }),
    prisma.cotisation.deleteMany({ where: { membreId: m.id } }),
    prisma.attestationRc.deleteMany({ where: { membreId: m.id } }),
    prisma.membre.delete({ where: { id: m.id } }),
  ]);
}

async function main() {
  const siAbsent = process.argv.includes("--si-absent");
  // Sur un site en ligne, les comptes de démo ne sont créés que si on l'a explicitement demandé
  if ((siAbsent || process.env.NODE_ENV === "production") && process.env.DEMO_COMPTES !== "1") {
    console.log("Comptes de démo non créés (DEMO_COMPTES n'est pas à 1).");
    return;
  }
  const bureau = await prisma.membre.findFirst({ where: { role: "BUREAU" } });
  if (!bureau) throw new Error("Lancez d'abord npm run db:seed (compte Bureau requis).");

  // Cotisation de démo valable jusqu'à la fin de l'année prochaine (pour que la démo ne s'arrête pas au 1er janvier)
  const finAnnee = new Date(Date.UTC(new Date().getFullYear() + 1, 11, 31));
  const dansUnAn = new Date(Date.now() + 365 * 86_400_000);
  const textes = await prisma.texteJuridique.findMany({ where: { enVigueurLe: { lte: new Date() } }, orderBy: { enVigueurLe: "desc" } });
  const enVigueur = Object.values(Object.fromEntries([...textes].reverse().map((t) => [t.type, t])));

  // Le compte Bureau peut aussi entrer dans le SEL (pour tester la modération des deux côtés)
  if (!(await prisma.inscriptionSel.findUnique({ where: { membreId: bureau.id } }))) {
    await prisma.cotisation.create({ data: { membreId: bureau.id, montant: 1, modeReglement: "ESPECES", recueLe: new Date(), valideJusquau: finAnnee, saisieParId: bureau.id } });
    await prisma.inscriptionSel.create({ data: { membreId: bureau.id } });
    await prisma.attestationRc.create({ data: { membreId: bureau.id, assureur: "Assurance fictive", valideJusquau: dansUnAn, statut: "VALIDEE", verifieParId: bureau.id, verifieLe: new Date() } });
    const deja = new Set((await prisma.acceptation.findMany({ where: { membreId: bureau.id } })).map((a) => a.texteId));
    await prisma.acceptation.createMany({ data: enVigueur.filter((t) => !deja.has(t.id)).map((t) => ({ texteId: t.id, membreId: bureau.id })) });
  }

  console.log("Adhérents de test (prêts pour le SEL) :");
  for (const p of PERSONNES) {
    if (siAbsent && (await prisma.membre.findUnique({ where: { email: p.email } }))) {
      console.log(`  ${p.prenom.padEnd(10)} ${p.email.padEnd(36)} déjà présent, inchangé`);
      continue;
    }
    await supprimer(p.email);
    const motDePasse = p.motDePasse;
    const membre = await prisma.membre.create({
      data: {
        email: p.email,
        motDePasseHash: await hash(motDePasse),
        prenom: p.prenom,
        nom: p.nom,
        dateNaissance: new Date("1988-04-12"),
        adresse: p.adresse,
        codePostal: "24700",
        commune: "Ménesplet",
        telephone: p.telephone,
        droitImage: true,
        categorie: "ADHERENT",
        role: "ADHERENT",
        statut: "ACTIF",
        dateAgrement: new Date(),
        alias: { create: { code: genererCode() } },
        cotisations: { create: { montant: 5, modeReglement: "ESPECES", recueLe: new Date(), valideJusquau: finAnnee, saisieParId: bureau.id } },
        ...(p.sel === false ? {} : { inscriptionSel: { create: {} } }),
        attestationsRc: p.sel === false ? undefined : {
          create: { assureur: "Assurance fictive", valideJusquau: dansUnAn, statut: "VALIDEE", verifieParId: bureau.id, verifieLe: new Date() },
        },
      },
      include: { alias: true },
    });
    // Textes en vigueur acceptés (adhésion et SEL), comme lors d'une vraie inscription
    // Un adhérent non inscrit au SEL n'a accepté que les textes de l'adhésion (pas la Charte ni le Règlement du SEL)
    const acceptes = p.sel === false ? enVigueur.filter((t) => !["CHARTE_SEL", "REGLEMENT_SEL"].includes(t.type)) : enVigueur;
    await prisma.acceptation.createMany({ data: acceptes.map((t) => ({ texteId: t.id, membreId: membre.id })) });
    const rubrique = p.annonce && (await prisma.rubriqueSel.findUnique({ where: { code: p.annonce.rubrique } }));
    if (rubrique) {
      const { rubrique: _, ...annonce } = p.annonce;
      await prisma.annonce.create({ data: { ...annonce, rubriqueId: rubrique.id, zone: "Ménesplet", auteurId: membre.alias.id } });
    }
    console.log(`  ${p.prenom.padEnd(10)} ${p.email.padEnd(36)} mot de passe ${motDePasse}   code ${membre.alias.code}`);
  }
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
