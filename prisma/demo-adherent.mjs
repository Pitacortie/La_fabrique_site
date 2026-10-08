// Crée (ou recrée) un adhérent de test, sans droits d'administration : npm run db:demo
// Données fictives. À ne pas lancer en production.
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { randomBytes, randomInt } from "node:crypto";

const prisma = new PrismaClient();
const EMAIL = "camille.adherente@fabrique.local";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const genererCode = () => `FAB-${Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")}`;

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Script réservé au développement.");

  const bureau = await prisma.membre.findFirst({ where: { role: "BUREAU" } });
  if (!bureau) throw new Error("Lancez d'abord npm run db:seed (compte Bureau requis).");

  const motDePasse = randomBytes(9).toString("base64url");
  const existant = await prisma.membre.findUnique({ where: { email: EMAIL } });
  if (existant) {
    await prisma.$transaction([
      prisma.acceptation.deleteMany({ where: { membreId: existant.id } }),
      prisma.cotisation.deleteMany({ where: { membreId: existant.id } }),
      prisma.membre.delete({ where: { id: existant.id } }),
    ]);
  }

  const annee = new Date().getFullYear();
  const membre = await prisma.membre.create({
    data: {
      email: EMAIL,
      motDePasseHash: await hash(motDePasse),
      prenom: "Camille",
      nom: "Durand",
      dateNaissance: new Date("1988-04-12"),
      adresse: "3 chemin des Chênes",
      codePostal: "24700",
      commune: "Ménesplet",
      telephone: "06 00 00 00 00",
      droitImage: true,
      categorie: "ADHERENT",
      role: "ADHERENT",
      statut: "ACTIF",
      dateAgrement: new Date(),
      alias: { create: { code: genererCode() } },
      // Cotisation reçue hors ligne et saisie par le Bureau (ADH-13)
      cotisations: {
        create: {
          montant: 5,
          modeReglement: "ESPECES",
          recueLe: new Date(),
          valideJusquau: new Date(`${annee}-12-31`),
          saisieParId: bureau.id,
        },
      },
    },
    include: { alias: true },
  });

  // Acceptations des trois textes en vigueur (comme lors d'une vraie adhésion)
  const textes = await prisma.texteJuridique.findMany({
    where: { type: { in: ["STATUTS", "REGLEMENT_INTERIEUR", "CHARTE_NEUTRALITE"] } },
    orderBy: { enVigueurLe: "desc" },
  });
  const parType = {};
  for (const t of textes) parType[t.type] ??= t;
  await prisma.acceptation.createMany({
    data: Object.values(parType).map((t) => ({ texteId: t.id, membreId: membre.id })),
  });

  console.log(`Adhérent de test créé :\n  e-mail       ${EMAIL}\n  mot de passe ${motDePasse}\n  code         ${membre.alias.code}`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
