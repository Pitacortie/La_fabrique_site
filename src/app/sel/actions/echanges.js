"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { dateHeureParis } from "@/lib/heure-paris";
import { z } from "zod";
import { journaliser } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { urlDuSite } from "@/lib/email";
import { exigerAccesSel } from "@/lib/sel/acces";
import { emailLitige } from "@/lib/sel/modeles-email";
import { notifierBureau, notifierEtape } from "@/lib/sel/notifications";
import { ALERTE_BRIQUES, DUREE_MAX_MINUTES, VALEUR_MAX_BRIQUES, anonymatLeve, briquesPour, plancher, roles } from "@/lib/sel/regles";
import { conversationDe } from "@/lib/sel/conversations";

const ACTIFS = ["PROPOSE", "CONFIRME", "DECLARE"];

async function contexte(formData) {
  const conversationId = String(formData.get("conversationId") ?? "");
  const { alias } = await exigerAccesSel(`/sel/messages/${conversationId}`);
  const conversation = await conversationDe(conversationId, alias.id);
  if (!conversation) throw new Error("Conversation introuvable.");
  const r = roles(conversation.annonce, conversation);
  return { alias, conversation, ...r, suis: alias.id === r.prestataireId ? "prestataire" : "beneficiaire" };
}

async function echangeActif(conversationId) {
  return prisma.echange.findFirst({ where: { conversationId, statut: { in: ACTIFS } }, orderBy: { createdAt: "desc" } });
}

const fin = (conversationId, autreId) => async () => {
  await notifierEtape({ conversationId, destinataireId: autreId });
  revalidatePath("/sel", "layout");
};

// Étape 1 — le bénéficiaire propose un créneau et un lieu
const schemaRdv = z.object({
  date: z.string({ required_error: "Indiquez la date." }).regex(/^\d{4}-\d{2}-\d{2}$/, "Indiquez la date."),
  heure: z.string({ required_error: "Indiquez l'heure." }).regex(/^\d{2}:\d{2}$/, "Indiquez l'heure."),
  lieu: z.string({ required_error: "Indiquez le lieu." }).trim().min(2, "Indiquez le lieu.").max(200),
});

export async function proposerRendezVous(_etat, formData) {
  try {
    const { conversation, suis, prestataireId, alias } = await contexte(formData);
    if (suis !== "beneficiaire") return { erreur: "C'est la personne qui reçoit le service qui propose le rendez-vous." };
    if (conversation.statut === "FERMEE") return { erreur: "Cette conversation est fermée." };
    if (await echangeActif(conversation.id)) return { erreur: "Un échange est déjà en cours dans cette conversation." };
    // RG-14 : un échange en personne n'a lieu qu'après la levée d'anonymat
    if (conversation.annonce.modalite === "PRESENTIEL" && !anonymatLeve(conversation)) {
      return { erreur: "Pour un rendez-vous en personne, révélez d'abord vos identités l'un à l'autre." };
    }
    const lu = schemaRdv.safeParse(Object.fromEntries(formData));
    if (!lu.success) return { erreur: lu.error.issues[0].message };
    const creneau = dateHeureParis(lu.data.date, lu.data.heure); // heure de Ménesplet
    if (!creneau) return { erreur: "Date ou heure invalide." };
    if (creneau < new Date(Date.now() - 60 * 60 * 1000)) return { erreur: "Ce créneau est déjà passé." };

    await prisma.echange.create({
      data: { conversationId: conversation.id, beneficiaireId: alias.id, prestataireId, nature: conversation.annonce.nature, creneau, lieu: lu.data.lieu },
    });
    await fin(conversation.id, prestataireId)();
    return { ok: "Rendez-vous proposé. Il doit maintenant être confirmé." };
  } catch (e) {
    unstable_rethrow(e); // laisse passer les redirections (ex. session expirée)
    return { erreur: e.message };
  }
}

// Étape 2 — le prestataire confirme le rendez-vous (ou le refuse : annulation)
export async function confirmerRendezVous(_etat, formData) {
  try {
    const { conversation, suis, beneficiaireId } = await contexte(formData);
    if (suis !== "prestataire") return { erreur: "C'est la personne qui rend le service qui confirme le rendez-vous." };
    const { count } = await prisma.echange.updateMany({
      where: { conversationId: conversation.id, statut: "PROPOSE", id: String(formData.get("echangeId") ?? "") },
      data: { statut: "CONFIRME", confirmeLe: new Date() },
    });
    if (count !== 1) return { erreur: "Ce rendez-vous n'est plus à confirmer." };
    await fin(conversation.id, beneficiaireId)();
    return { ok: "Rendez-vous confirmé." };
  } catch (e) {
    unstable_rethrow(e); // laisse passer les redirections (ex. session expirée)
    return { erreur: e.message };
  }
}

// Étape 3 — une fois le service rendu, le prestataire déclare le temps passé et si tout s'est bien passé
const schemaDeclaration = z.object({
  heures: z.coerce.number().int().min(0).max(24).optional(),
  minutes: z.coerce.number().int().min(0).max(59).optional(),
  valeur: z.coerce.number().int().min(0).max(VALEUR_MAX_BRIQUES).optional(),
  bienPasse: z.enum(["oui", "non"], { errorMap: () => ({ message: "Indiquez si tout s'est bien passé." }) }),
  commentaire: z.string().trim().max(1000).optional(),
});

export async function declarerEchange(_etat, formData) {
  try {
    const { conversation, suis, beneficiaireId } = await contexte(formData);
    if (suis !== "prestataire") return { erreur: "C'est la personne qui a rendu le service qui déclare l'échange." };
    const echange = await echangeActif(conversation.id);
    if (!echange || echange.statut !== "CONFIRME" || echange.id !== formData.get("echangeId")) {
      return { erreur: "Cet échange n'est pas à déclarer." };
    }
    const lu = schemaDeclaration.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => v !== "")));
    if (!lu.success) return { erreur: lu.error.issues[0].message };
    const dureeMinutes = (lu.data.heures ?? 0) * 60 + (lu.data.minutes ?? 0);
    if (echange.nature === "SERVICE" && (dureeMinutes < 1 || dureeMinutes > DUREE_MAX_MINUTES)) {
      return { erreur: "Indiquez le temps passé (entre 1 minute et 24 heures)." };
    }
    if (echange.nature === "OBJET" && lu.data.valeur == null) return { erreur: "Indiquez la valeur convenue en briques." };
    const briques = briquesPour(echange.nature, { dureeMinutes, valeur: lu.data.valeur });

    await prisma.echange.update({
      where: { id: echange.id },
      data: {
        statut: "DECLARE",
        dureeMinutes: echange.nature === "SERVICE" ? dureeMinutes : null,
        briques,
        bienPasse: lu.data.bienPasse === "oui",
        commentaire: lu.data.commentaire || null,
        declareLe: new Date(),
      },
    });
    await fin(conversation.id, beneficiaireId)();
    return { ok: "Merci ! L'échange est envoyé au bénéficiaire pour confirmation." };
  } catch (e) {
    unstable_rethrow(e); // laisse passer les redirections (ex. session expirée)
    return { erreur: e.message };
  }
}

// Étape 4 — le bénéficiaire confirme : les briques sont transférées (RG-7 : validé par les deux personnes)
export async function confirmerEchange(_etat, formData) {
  try {
    const { conversation, suis, prestataireId, alias } = await contexte(formData);
    if (suis !== "beneficiaire") return { erreur: "C'est le bénéficiaire qui confirme la fin de l'échange." };
    const echangeId = String(formData.get("echangeId") ?? "");
    const avis = String(formData.get("avis") ?? "").trim().slice(0, 1000) || null;

    const resultat = await prisma.$transaction(async (tx) => {
      // Une seule confirmation possible, même si deux requêtes arrivent en même temps
      const { count } = await tx.echange.updateMany({
        where: { id: echangeId, conversationId: conversation.id, statut: "DECLARE" },
        data: { statut: "TERMINE", termineLe: new Date(), avisBeneficiaire: avis },
      });
      if (count !== 1) throw new Error("Cet échange n'est plus à confirmer.");
      const echange = await tx.echange.findUnique({ where: { id: echangeId } });
      if (!echange.briques) return { briques: 0 };

      // SEL-22, RG-8 : le solde ne descend pas sous -120 (sauf dérogation)
      const beneficiaire = await tx.alias.findUnique({ where: { id: alias.id } });
      if (beneficiaire.soldeBriques - echange.briques < plancher(beneficiaire)) {
        throw new Error(
          `Votre solde (${beneficiaire.soldeBriques} briques) ne peut pas descendre sous ${plancher(beneficiaire)} briques. Contactez l'association pour une dérogation.`,
        );
      }
      await tx.alias.update({ where: { id: alias.id }, data: { soldeBriques: { decrement: echange.briques } } });
      const prestataire = await tx.alias.update({ where: { id: prestataireId }, data: { soldeBriques: { increment: echange.briques } } });
      await tx.transactionBriques.create({
        data: { echangeId, montant: echange.briques, debiteId: alias.id, crediteId: prestataireId, libelle: conversation.annonce.titre.slice(0, 100) },
      });
      return { briques: echange.briques, soldePrestataire: prestataire.soldeBriques };
    });

    await journaliser({ action: "sel.echange_termine", cibleType: "Echange", cibleId: echangeId, details: { briques: resultat.briques } });
    if (resultat.soldePrestataire > ALERTE_BRIQUES) {
      // RG-8 : au-delà de 600 briques, concertation du CA (sans sanction)
      await journaliser({ action: "sel.alerte_solde", cibleType: "Alias", cibleId: prestataireId, details: { solde: resultat.soldePrestataire } });
    }
    await fin(conversation.id, prestataireId)();
    return { ok: resultat.briques ? `Échange terminé : ${resultat.briques} briques transférées. Merci !` : "Échange terminé. Merci !" };
  } catch (e) {
    unstable_rethrow(e); // laisse passer les redirections (ex. session expirée)
    return { erreur: e.message };
  }
}

// Le bénéficiaire conteste la déclaration : médiation du CA (SEL-8)
export async function contesterEchange(_etat, formData) {
  try {
    const { conversation, suis, prestataireId, alias } = await contexte(formData);
    if (suis !== "beneficiaire") return { erreur: "Seul le bénéficiaire peut contester." };
    const motif = String(formData.get("motif") ?? "").trim();
    if (motif.length < 10) return { erreur: "Expliquez en quelques mots ce qui ne va pas (10 caractères minimum)." };
    const { count } = await prisma.echange.updateMany({
      where: { id: String(formData.get("echangeId") ?? ""), conversationId: conversation.id, statut: "DECLARE" },
      data: { statut: "LITIGE", annulePar: alias.id, motifAnnulation: motif.slice(0, 1000) },
    });
    if (count !== 1) return { erreur: "Cet échange ne peut plus être contesté." };
    await journaliser({ action: "sel.litige", cibleType: "Conversation", cibleId: conversation.id });
    await notifierBureau(emailLitige({ lien: `${await urlDuSite()}/admin/sel` }));
    await fin(conversation.id, prestataireId)();
    return { ok: "Votre désaccord est transmis à l'association, qui vous proposera une médiation." };
  } catch (e) {
    unstable_rethrow(e); // laisse passer les redirections (ex. session expirée)
    return { erreur: e.message };
  }
}

// Annulation par l'un ou l'autre, tant que l'échange n'est pas déclaré (ou refus du rendez-vous)
export async function annulerEchange(_etat, formData) {
  try {
    const { conversation, alias, prestataireId, beneficiaireId } = await contexte(formData);
    const { count } = await prisma.echange.updateMany({
      where: { id: String(formData.get("echangeId") ?? ""), conversationId: conversation.id, statut: { in: ["PROPOSE", "CONFIRME"] } },
      data: { statut: "ANNULE", annulePar: alias.id, motifAnnulation: String(formData.get("motif") ?? "").trim().slice(0, 500) || null },
    });
    if (count !== 1) return { erreur: "Cet échange ne peut plus être annulé." };
    await fin(conversation.id, alias.id === prestataireId ? beneficiaireId : prestataireId)();
    return { ok: "Échange annulé." };
  } catch (e) {
    unstable_rethrow(e); // laisse passer les redirections (ex. session expirée)
    return { erreur: e.message };
  }
}
