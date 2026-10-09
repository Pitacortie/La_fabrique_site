import { emailsBureau } from "@/lib/adhesion";
import { prisma } from "@/lib/db";
import { envoyerEmail, urlDuSite } from "@/lib/email";
import { emailEtapeEchange, emailNouveauMessage } from "./modeles-email";

const echec = (e) => console.error("Courriel du SEL non envoyé :", e.message);

// Membre (prénom, e-mail) derrière un alias, uniquement pour lui écrire. Jamais affiché dans le SEL.
async function destinataire(aliasId) {
  const alias = await prisma.alias.findUnique({ where: { id: aliasId }, include: { membre: { select: { email: true, prenom: true } } } });
  return alias?.membre;
}

// MSG-9 : « Nouveau message dans le SEL ». Un seul courriel tant que les messages précédents ne sont pas lus.
export async function notifierMessage({ conversationId, destinataireId, messageId }) {
  const nonLus = await prisma.message.count({
    where: { conversationId, emetteurId: { not: destinataireId }, luLe: null, id: { not: messageId } },
  });
  if (nonLus > 0) return;
  const m = await destinataire(destinataireId);
  if (m) await envoyerEmail({ a: m.email, ...emailNouveauMessage({ prenom: m.prenom, lien: `${await urlDuSite()}/sel/messages/${conversationId}` }) }).catch(echec);
}

export async function notifierEtape({ conversationId, destinataireId }) {
  const m = await destinataire(destinataireId);
  if (m) await envoyerEmail({ a: m.email, ...emailEtapeEchange({ prenom: m.prenom, lien: `${await urlDuSite()}/sel/messages/${conversationId}` }) }).catch(echec);
}

export async function notifierBureau(modele) {
  for (const a of await emailsBureau()) await envoyerEmail({ a, ...modele }).catch(echec);
}
