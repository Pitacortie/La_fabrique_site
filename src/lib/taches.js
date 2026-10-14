import { modalitesPaiement } from "@/lib/adhesion";
import { journaliser } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { supprimerMembre } from "@/lib/membres";
import { envoyerEmail, urlDuSite } from "@/lib/email";
import { emailRappelCotisation } from "@/lib/modeles-email-membres";

const JOUR = 24 * 60 * 60 * 1000;
const INTERVALLE_RAPPELS_JOURS = 14;

// ADH-10 : rappels avant le 31 janvier (dès le 1er décembre), puis, sans renouvellement, encore pendant
// 30 jours (deux rappels, à quinze jours d'intervalle). Renvoie l'année à renouveler, ou null.
export function anneeARenouveler(maintenant = new Date()) {
  const mois = maintenant.getMonth();
  if (mois === 11) return maintenant.getFullYear() + 1; // décembre : on prépare l'année suivante
  if (mois === 0 || mois === 1) return maintenant.getFullYear(); // janvier, puis le mois qui suit le 31 janvier
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
      const apresEcheance = maintenant.getMonth() === 1;
      await envoyerEmail({ a: m.email, ...emailRappelCotisation({ prenom: m.prenom, annee, paiement, lienEspace: `${site}/espace`, apresEcheance }) });
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

// ADH-14 : sans paiement de la cotisation sous un mois, la demande d'adhésion est classée sans suite (sans courriel).
export async function classerDemandesSansPaiement(maintenant = new Date()) {
  const demandes = await prisma.demandeAdhesion.findMany({
    where: { statut: "EN_ATTENTE", createdAt: { lt: moisAvant(maintenant, 1) } },
    select: { id: true },
  });
  for (const d of demandes) {
    const { count } = await prisma.demandeAdhesion.updateMany({ where: { id: d.id, statut: "EN_ATTENTE" }, data: { statut: "CLASSEE_SANS_SUITE", decideLe: maintenant } });
    if (count) await journaliser({ action: "demande.classee_auto", cibleType: "DemandeAdhesion", cibleId: d.id, motif: "Cotisation non reçue sous un mois" });
  }
  return demandes.length;
}

function moisAvant(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() - n);
  return d;
}
const ansAvant = (date, n) => moisAvant(date, 12 * n);

// Durées de conservation : journaux 5 ans, comptes fermés ou inactifs 5 ans, demandes refusées 1 an,
// conversations du SEL 1 an après leur clôture.
export async function appliquerConservation(maintenant = new Date()) {
  const cinqAns = ansAvant(maintenant, 5);
  const unAn = ansAvant(maintenant, 1);

  const journal = await prisma.journalAudit.deleteMany({ where: { createdAt: { lt: cinqAns } } });

  const demandes = await prisma.demandeAdhesion.findMany({
    where: { statut: { in: ["REFUSEE", "CLASSEE_SANS_SUITE"] }, membreId: null, decideLe: { lt: unAn } },
    select: { id: true },
  });
  const ids = demandes.map((d) => d.id);
  if (ids.length) {
    await prisma.$transaction([
      prisma.acceptation.deleteMany({ where: { demandeId: { in: ids }, membreId: null } }),
      prisma.acceptation.updateMany({ where: { demandeId: { in: ids } }, data: { demandeId: null } }),
      prisma.demandeAdhesion.deleteMany({ where: { id: { in: ids } } }),
    ]);
  }

  // Une conversation fermée depuis plus d'un an est effacée ; le grand livre des briques garde ses mouvements
  const conversations = await prisma.conversation.findMany({ where: { statut: "FERMEE", dernierMessageLe: { lt: unAn } }, select: { id: true } });
  for (const { id } of conversations) {
    await prisma.$transaction([
      prisma.transactionBriques.updateMany({ where: { echange: { conversationId: id } }, data: { echangeId: null } }),
      prisma.conversation.delete({ where: { id } }),
    ]);
  }

  // Comptes clôturés, ou sans cotisation ni connexion depuis cinq ans (jamais un administrateur)
  const comptes = await prisma.membre.findMany({
    where: {
      role: "ADHERENT",
      createdAt: { lt: cinqAns },
      email: { not: { endsWith: "@membre-supprime.invalid" } },
      OR: [
        { statut: "CLOTURE", updatedAt: { lt: cinqAns } },
        { cotisations: { none: { valideJusquau: { gte: cinqAns } } }, OR: [{ derniereConnexion: null }, { derniereConnexion: { lt: cinqAns } }] },
      ],
    },
    select: { id: true },
  });
  for (const { id } of comptes) {
    const r = await supprimerMembre(id);
    await journaliser({ action: r.methode === "suppression" ? "membre.supprime_conservation" : "membre.anonymise_conservation", cibleType: "Membre", cibleId: id });
  }

  return { journal: journal.count, demandes: ids.length, conversations: conversations.length, comptes: comptes.length };
}

export async function tachesQuotidiennes(maintenant = new Date()) {
  return {
    rappels: await envoyerRappelsCotisation(maintenant),
    demandesClassees: await classerDemandesSansPaiement(new Date()),
    conservation: await appliquerConservation(new Date()),
    nettoyage: await nettoyer(new Date()),
  };
}
