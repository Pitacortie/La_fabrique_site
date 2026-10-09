import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

// Liens à usage unique et à durée limitée (ADH-7, CON-3). Seul le hachage du jeton est stocké.
const hacher = (jeton) => createHash("sha256").update(jeton).digest("hex");

// `extra` : données liées au lien (ex. { nouvelEmail } pour un changement d'adresse).
export async function creerJeton(membreId, type, dureeMinutes, extra = {}) {
  // Un nouveau lien annule les précédents du même type encore inutilisés
  await prisma.jeton.deleteMany({ where: { membreId, type, utiliseLe: null } });
  const jeton = randomBytes(32).toString("base64url");
  await prisma.jeton.create({
    data: { ...extra, tokenHash: hacher(jeton), type, membreId, expireLe: new Date(Date.now() + dureeMinutes * 60 * 1000) },
  });
  return jeton;
}

// Jeton valide (bon type, non utilisé, non expiré) avec son membre, sinon null.
export async function lireJeton(jeton, type) {
  if (!jeton || jeton.length > 100) return null;
  const ligne = await prisma.jeton.findUnique({ where: { tokenHash: hacher(jeton) }, include: { membre: true } });
  if (!ligne || ligne.type !== type || ligne.utiliseLe || ligne.expireLe < new Date()) return null;
  return ligne;
}

// Marque le jeton comme utilisé, une seule fois même si deux requêtes arrivent en même temps.
export async function consommerJeton(id) {
  const { count } = await prisma.jeton.updateMany({ where: { id, utiliseLe: null }, data: { utiliseLe: new Date() } });
  return count === 1;
}
