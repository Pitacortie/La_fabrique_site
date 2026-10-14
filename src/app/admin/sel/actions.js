"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { journaliser } from "@/lib/audit";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugifier } from "@/lib/format";
import { soldeSolidarite } from "@/lib/sel/solidarite";

const fin = () => revalidatePath("/admin/sel", "layout");

// SEL-19 : suspension (annonces masquées, échanges bloqués, solde conservé) ou réactivation
export async function changerInscription(formData) {
  const admin = await exigerAdmin();
  const id = String(formData.get("id") ?? "");
  const suspendre = formData.get("action") === "suspendre";
  const motif = String(formData.get("motif") ?? "").trim().slice(0, 500) || null;
  await prisma.inscriptionSel.update({ where: { id }, data: { statut: suspendre ? "SUSPENDUE" : "ACTIVE", motifSuspension: suspendre ? motif : null } });
  await journaliser({ acteurId: admin.id, action: suspendre ? "sel.inscription_suspendue" : "sel.inscription_reactivee", cibleType: "InscriptionSel", cibleId: id, motif });
  fin();
}

// SEL-25, RG-29 : un administrateur vient en aide à un membre avec les briques du compte de solidarité
export async function aiderAvecSolidarite(_etat, formData) {
  const admin = await exigerAdmin();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const montant = Number(formData.get("montant"));
  const motif = String(formData.get("motif") ?? "").trim().slice(0, 300);
  if (!Number.isInteger(montant) || montant < 1) return { erreur: "Indiquez un nombre de briques (1 minimum)." };
  if (motif.length < 5) return { erreur: "Indiquez le motif de l'aide (5 caractères minimum)." };
  const alias = await prisma.alias.findUnique({ where: { code } });
  if (!alias) return { erreur: "Aucun membre ne porte ce code." };
  try {
    await prisma.$transaction(async (tx) => {
      if ((await soldeSolidarite(tx)) < montant) throw new Error("Le compte de solidarité n'a pas assez de briques.");
      await tx.alias.update({ where: { id: alias.id }, data: { soldeBriques: { increment: montant } } });
      await tx.transactionBriques.create({ data: { montant, debiteId: null, crediteId: alias.id, libelle: "Aide du compte de solidarité" } });
    }, { isolationLevel: "Serializable" });
  } catch (e) {
    return { erreur: e.message.includes("solidarité") ? e.message : "L'aide n'a pas pu être enregistrée. Réessayez." };
  }
  await journaliser({ acteurId: admin.id, action: "sel.aide_solidarite", cibleType: "Alias", cibleId: alias.id, motif, details: { code, montant } });
  fin();
  return { ok: `${montant} brique${montant > 1 ? "s" : ""} versée${montant > 1 ? "s" : ""} à ${code}.` };
}

// NEU-3 : masquer (avec motif, journalisé) ou réafficher une annonce
export async function modererAnnonce(formData) {
  const admin = await exigerAdmin();
  const id = String(formData.get("id") ?? "");
  const masquer = formData.get("action") === "masquer";
  const motif = String(formData.get("motif") ?? "").trim().slice(0, 500) || null;
  if (masquer && !motif) return;
  await prisma.annonce.update({ where: { id }, data: { statut: masquer ? "MASQUEE" : "PUBLIEE", motifModeration: masquer ? motif : null } });
  await journaliser({ acteurId: admin.id, action: masquer ? "sel.annonce_masquee" : "sel.annonce_reaffichee", cibleType: "Annonce", cibleId: id, motif });
  fin();
}

export async function traiterSignalementSel(formData) {
  const admin = await exigerAdmin();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000) || null;
  await prisma.signalementSel.update({ where: { id }, data: { statut: "TRAITE", note } });
  await journaliser({ acteurId: admin.id, action: "sel.signalement_traite", cibleType: "SignalementSel", cibleId: id });
  fin();
}

// SEL-8 : issue de la médiation d'un litige. « valider » transfère les briques déclarées, « annuler » n'en transfère aucune.
export async function trancherLitige(_etat, formData) {
  const admin = await exigerAdmin();
  const id = String(formData.get("id") ?? "");
  const decision = formData.get("decision");
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  if (!["valider", "annuler"].includes(decision)) return { erreur: "Choisissez une décision." };
  if (note.length < 5) return { erreur: "Résumez la décision prise après la médiation." };

  try {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.echange.updateMany({
        where: { id, statut: "LITIGE" },
        data: decision === "valider" ? { statut: "TERMINE", termineLe: new Date() } : { statut: "ANNULE" },
      });
      if (count !== 1) throw new Error("Ce litige a déjà été tranché.");
      const e = await tx.echange.findUnique({ where: { id }, include: { conversation: { include: { annonce: true } } } });
      if (decision === "valider" && e.briques) {
        // Décision du CA après médiation, journalisée
        await tx.alias.update({ where: { id: e.beneficiaireId }, data: { soldeBriques: { decrement: e.briques } } });
        await tx.alias.update({ where: { id: e.prestataireId }, data: { soldeBriques: { increment: e.briques } } });
        await tx.transactionBriques.create({
          data: { echangeId: id, montant: e.briques, debiteId: e.beneficiaireId, crediteId: e.prestataireId, libelle: `${e.conversation.annonce.titre.slice(0, 80)} (médiation)` },
        });
      }
    });
  } catch (e) {
    return { erreur: e.message };
  }
  await journaliser({ acteurId: admin.id, action: `sel.litige_${decision === "valider" ? "valide" : "annule"}`, cibleType: "Echange", cibleId: id, motif: note });
  fin();
  return { ok: decision === "valider" ? "Échange validé : les briques ont été transférées." : "Échange annulé : aucune brique transférée." };
}

// ADM-10 : rubriques du catalogue
const schemaRubrique = z.object({
  libelle: z.string().trim().min(2, "Le libellé est obligatoire.").max(60),
  exemples: z.string().trim().max(500).optional(),
  rappel: z.string().trim().max(500).optional(),
  ordre: z.coerce.number().int().min(0).max(999),
});

export async function enregistrerRubrique(_etat, formData) {
  const admin = await exigerAdmin();
  const lu = schemaRubrique.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => v !== "")));
  if (!lu.success) return { erreur: lu.error.issues[0].message };
  const id = formData.get("id") ? String(formData.get("id")) : null;
  const data = { ...lu.data, exemples: lu.data.exemples ?? null, rappel: lu.data.rappel ?? null, actif: formData.get("actif") === "on" };
  if (id) await prisma.rubriqueSel.update({ where: { id }, data });
  else {
    let code = slugifier(lu.data.libelle) || "rubrique";
    if (await prisma.rubriqueSel.findUnique({ where: { code } })) code = `${code}-${Date.now().toString(36)}`;
    await prisma.rubriqueSel.create({ data: { ...data, code } });
  }
  await journaliser({ acteurId: admin.id, action: id ? "sel.rubrique_modifiee" : "sel.rubrique_creee", cibleType: "RubriqueSel", cibleId: id, details: { libelle: lu.data.libelle } });
  revalidatePath("/sel", "layout");
  fin();
  return { ok: "Rubrique enregistrée." };
}
