import { randomInt } from "node:crypto";
import { getContenus } from "@/lib/contenus";
import { prisma } from "@/lib/db";

// Textes dont l'acceptation est obligatoire pour adhérer (ADH-2, RG-21).
export const TEXTES_ADHESION = ["CHARTE_NEUTRALITE", "STATUTS", "REGLEMENT_INTERIEUR"];

export const DUREE_ACTIVATION_JOURS = 7;

// Code personnel (alias) : aléatoire, non séquentiel, sans lien avec l'identité (section 6.3).
// Alphabet sans caractères ambigus (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export async function genererCodeUnique(client = prisma) {
  for (let essai = 0; essai < 20; essai++) {
    const code = `FAB-${Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")}`;
    if (!(await client.alias.findUnique({ where: { code } }))) return code;
  }
  throw new Error("Impossible de générer un code unique.");
}

// Fin de l'année civile de la cotisation (règlement intérieur, art. 3) : le 31 décembre.
export function finAnneeCivile(date = new Date()) {
  return new Date(Date.UTC(date.getFullYear(), 11, 31));
}

export function age(dateNaissance, aujourdhui = new Date()) {
  const n = new Date(dateNaissance);
  let a = aujourdhui.getFullYear() - n.getFullYear();
  const m = aujourdhui.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && aujourdhui.getDate() < n.getDate())) a--;
  return a;
}

// Adresses des membres du Bureau (ils valident les demandes, ADM-1).
export async function emailsBureau() {
  const membres = await prisma.membre.findMany({ where: { role: "BUREAU", statut: "ACTIF" }, select: { email: true } });
  return membres.map((m) => m.email);
}

// Adresse de contact de l'association (modifiable au crayon sur la page Contacts).
export async function adresseAssociation() {
  return (await getContenus(["site.email"]))["site.email"];
}

// Modalités de paiement de la cotisation (modifiables au crayon sur la page Adhérer), reprises dans les courriels.
export async function modalitesPaiement() {
  return (await getContenus(["adhesion.paiement"]))["adhesion.paiement"];
}
