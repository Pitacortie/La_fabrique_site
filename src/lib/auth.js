import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";

// Sessions côté serveur : le cookie contient un jeton aléatoire, la base n'en garde que le hachage.
export const COOKIE_SESSION = "fabrique_session";
const HEURE = 60 * 60 * 1000;
// « Rester connecté » : 30 jours, même après fermeture du navigateur.
const DUREE_LONGUE_MS = 30 * 24 * HEURE;
// Sinon : jusqu'à la fermeture du navigateur, et au plus 12 heures (ordinateur partagé, médiathèque…).
const DUREE_COURTE_MS = 12 * HEURE;

const hacher = (jeton) => createHash("sha256").update(jeton).digest("hex");

export const ROLES_ADMIN = ["ADMINISTRATEUR", "BUREAU"];

export async function creerSession(membreId, { resterConnecte = false } = {}) {
  const jeton = randomBytes(32).toString("base64url");
  const expireLe = new Date(Date.now() + (resterConnecte ? DUREE_LONGUE_MS : DUREE_COURTE_MS));
  await prisma.session.create({ data: { id: hacher(jeton), membreId, expireLe } });
  const jar = await cookies();
  jar.set(COOKIE_SESSION, jeton, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Sans date d'expiration, le navigateur efface le cookie à sa fermeture (cookie de session).
    ...(resterConnecte ? { expires: expireLe } : {}),
  });
}

export async function supprimerSession() {
  const jar = await cookies();
  const jeton = jar.get(COOKIE_SESSION)?.value;
  if (jeton) await prisma.session.deleteMany({ where: { id: hacher(jeton) } });
  jar.delete(COOKIE_SESSION);
}

// Après un changement de mot de passe : ferme toutes les sessions du membre sauf celle en cours.
export async function fermerAutresSessions(membreId) {
  const jar = await cookies();
  const jeton = jar.get(COOKIE_SESSION)?.value;
  await prisma.session.deleteMany({
    where: { membreId, ...(jeton ? { id: { not: hacher(jeton) } } : {}) },
  });
}

// Membre connecté (avec son alias), ou null. Une session expirée ou un compte non actif ne compte pas.
// cache() : une seule lecture en base par requête, même si plusieurs composants la demandent.
export const getMembreConnecte = cache(async function getMembreConnecte() {
  const jar = await cookies();
  const jeton = jar.get(COOKIE_SESSION)?.value;
  if (!jeton) return null;

  const session = await prisma.session.findUnique({
    where: { id: hacher(jeton) },
    include: { membre: { include: { alias: true } } },
  });
  if (!session) return null;
  if (session.expireLe < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (session.membre.statut !== "ACTIF") return null;
  return session.membre;
});

// Mode édition sur les pages publiques (crayons ✏️) : administrateurs et Bureau.
export async function peutEditerSite() {
  const membre = await getMembreConnecte();
  return !!membre && ROLES_ADMIN.includes(membre.role);
}

// FAB-1 : pages réservées aux adhérents connectés.
export async function exigerMembre(suite = "/espace") {
  const membre = await getMembreConnecte();
  if (!membre) redirect(`/connexion?suite=${encodeURIComponent(suite)}`);
  return membre;
}

// ADM-18 : publier au nom de l'association est réservé aux personnes mandatées (et au Bureau).
export function peutPublier(membre) {
  return membre.role === "BUREAU" || (membre.role === "ADMINISTRATEUR" && membre.peutPublier);
}

export async function exigerPublication() {
  const membre = await exigerAdmin();
  if (!peutPublier(membre)) redirect("/admin?refus=publication");
  return membre;
}

// Console : administrateurs et membres du Bureau uniquement.
export async function exigerAdmin() {
  const membre = await exigerMembre("/admin");
  if (!ROLES_ADMIN.includes(membre.role)) redirect("/espace");
  return membre;
}
