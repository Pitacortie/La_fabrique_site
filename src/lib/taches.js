import { modalitesPaiement } from "@/lib/adhesion";
import { prisma } from "@/lib/db";
import { envoyerEmail, urlDuSite } from "@/lib/email";
import { emailRappelCotisation } from "@/lib/modeles-email-membres";

const JOUR = 24 * 60 * 60 * 1000;
const INTERVALLE_RAPPELS_JOURS = 14;

// ADH-10 : période de renouvellement, du 1er décembre au 31 janvier. Renvoie l'année à renouveler, ou null.
export function anneeARenouveler(maintenant = new Date()) {
  const mois = maintenant.getMonth();
  if (mois === 11) return maintenant.getFullYear() + 1; // décembre : on prépare l'année suivante
  if (mois === 0) return maintenant.getFullYear(); // janvier : dernier délai le 31
  return null;
}

// Membres actifs dont aucune cotisation ne couvre l'année à renouveler (le 31 décembre de cette année).
export function membresARelancer(annee, maintenant = new Date()) {
  return prisma.membre.findMany({
    where: {
      statut: "ACTIF",
      cotisations: { none: { valideJusquau: { gte: new Date(Date.UTC(annee, 11, 31)) } } },
      OR: [{ dernierRappelCotisation: null }, { dernierRappelCotisation: { lt: new Date(maintenant - INTERVALLE_RAPPELS_JOURS * JOUR) } }],
    },
    select: { id: true, email: true, prenom: true },
  });
}

// Envoie les rappels de cotisation (au plus un toutes les deux semaines par membre).
export async function envoyerRappelsCotisation(maintenant = new Date()) {
  const annee = anneeARenouveler(maintenant);
  if (!annee) return { annee: null, envoyes: 0, echecs: 0 };
  const membres = await membresARelancer(annee, maintenant);
  const [paiement, site] = [await modalitesPaiement(), await urlDuSite()];
  let envoyes = 0;
  let echecs = 0;
  for (const m of membres) {
    try {
      await envoyerEmail({ a: m.email, ...emailRappelCotisation({ prenom: m.prenom, annee, paiement, lienEspace: `${site}/espace` }) });
      await prisma.membre.update({ where: { id: m.id }, data: { dernierRappelCotisation: maintenant } });
      envoyes++;
    } catch (e) {
      console.error(`Rappel non envoyé à ${m.email} :`, e.message);
      echecs++;
    }
  }
  return { annee, envoyes, echecs };
}

// Ménage : sessions expirées, liens à usage unique expirés ou utilisés depuis plus de 30 jours.
export async function nettoyer(maintenant = new Date()) {
  const sessions = await prisma.session.deleteMany({ where: { expireLe: { lt: maintenant } } });
  const jetons = await prisma.jeton.deleteMany({
    where: { OR: [{ expireLe: { lt: new Date(maintenant - 30 * JOUR) } }, { utiliseLe: { lt: new Date(maintenant - 30 * JOUR) } }] },
  });
  return { sessions: sessions.count, jetons: jetons.count };
}

export async function tachesQuotidiennes(maintenant = new Date()) {
  return { rappels: await envoyerRappelsCotisation(maintenant), nettoyage: await nettoyer(new Date()) };
}
