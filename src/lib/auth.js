import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";

// Sessions côté serveur : le cookie contient un jeton aléatoire, la base n'en garde que le hachage.
export const COOKIE_SESSION = "fabrique_session";
// ACC-4 : déconnexion automatique après plus de 5 minutes d'inactivité, ou à la fermeture de la page.
// Chaque requête (et le signal envoyé par la page tant qu'on s'en sert) repousse l'échéance de 5 minutes.
export const INACTIVITE_MS = 5 * 60 * 1000;
// Garde-fou : une session ne dure jamais plus de 12 heures, même active.
const DUREE_MAX_MS = 12 * 60 * 60 * 1000;
// On n'écrit en base que si l'échéance a avancé d'au moins 30 secondes (évite une écriture par requête).
const PAS_PROLONGATION_MS = 30 * 1000;

const hacher = (jeton) => createHash("sha256").update(jeton).digest("hex");

export const ROLES_ADMIN = ["ADMINISTRATEUR", "BUREAU"];

export async function creerSession(membreId) {
  const jeton = randomBytes(32).toString("base64url");
  const expireLe = new Date(Date.now() + INACTIVITE_MS);
  await prisma.session.create({ data: { id: hacher(jeton), membreId, expireLe } });
  const jar = await cookies();
  // Cookie de session, sans date d'expiration : le navigateur l'efface à sa fermeture.
  jar.set(COOKIE_SESSION, jeton, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
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
  const maintenant = Date.now();
  if (session.expireLe.getTime() < maintenant || maintenant - session.createdAt.getTime() > DUREE_MAX_MS) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (session.membre.statut !== "ACTIF") return null;
  // Activité : l'échéance est repoussée de 5 minutes
  const echeance = maintenant + INACTIVITE_MS;
  if (echeance - session.expireLe.getTime() > PAS_PROLONGATION_MS) {
    await prisma.session.update({ where: { id: session.id }, data: { expireLe: new Date(echeance) } }).catch(() => {});
  }
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

// ADM-18, RG-24 : seuls les administrateurs publient au nom de l'association.
export function peutPublier(membre) {
  return ROLES_ADMIN.includes(membre?.role);
}

export async function exigerPublication() {
  const membre = await exigerAdmin();
  if (!peutPublier(membre)) redirect("/admin?refus=publication");
  return membre;
}

// ADM-9, ADM-20 : tous les administrateurs ont le même niveau de droits (les membres du Bureau sont administrateurs).
// Conservé sous ce nom pour les actions sensibles (adhésions, cotisations, textes, membres).
export const exigerBureau = () => exigerAdmin();

// Console : administrateurs et membres du Bureau uniquement.
export async function exigerAdmin() {
  const membre = await exigerMembre("/admin");
  if (!ROLES_ADMIN.includes(membre.role)) redirect("/espace");
  return membre;
}
