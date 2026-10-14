import { ROLES_ADMIN } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { envoyerEmail } from "@/lib/email";

// Alertes e-mail envoyées aux membres du Bureau et aux administrateurs. Chacune s'active personne par personne
// depuis la console (page « Alertes par e-mail ») ; aucune n'est active par défaut.
export const ALERTES = {
  ADHESION: { libelle: "Nouvelle demande d'adhésion" },
  SEL_SOLDE: { libelle: "Solde de briques à -120 ou au-delà de 600 (SEL)" },
  SEL_SIGNALEMENT: { libelle: "Annonce ou message signalé dans le SEL" },
  SEL_LITIGE: { libelle: "Échange du SEL contesté" },
  CONTACT: { libelle: "Message reçu par le formulaire de contact" },
  BUG: { libelle: "Bug signalé sur le site" },
};

export const alertesPossibles = (role) => (ROLES_ADMIN.includes(role) ? Object.keys(ALERTES) : []);

export async function destinatairesAlerte(type) {
  const membres = await prisma.membre.findMany({
    where: { role: { in: ROLES_ADMIN }, statut: "ACTIF", alertes: { has: type } },
    select: { email: true },
  });
  return membres.map((m) => m.email);
}

// Envoie l'alerte à ceux qui l'ont activée. Un échec d'envoi n'empêche jamais l'action de l'utilisateur.
export async function alerter(type, courriel) {
  for (const a of await destinatairesAlerte(type)) {
    await envoyerEmail({ a, ...courriel }).catch((e) => console.error(`Alerte ${type} non envoyée :`, e.message));
  }
}
