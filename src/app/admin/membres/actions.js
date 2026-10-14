"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { journaliser } from "@/lib/audit";
import { ROLES_ADMIN, exigerBureau } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { supprimerMembre } from "@/lib/membres";
import { libellesCategorie } from "@/lib/site";

const ROLES = ["ADHERENT", "ADMINISTRATEUR", "BUREAU"];

async function cible(formData) {
  const membre = await prisma.membre.findUnique({ where: { id: String(formData.get("id") ?? "") } });
  if (!membre) throw new Error("Membre introuvable.");
  return membre;
}

// Il doit toujours rester au moins un administrateur actif (RG-23 : au moins deux conseillés)
async function dernierBureau(membre) {
  if (!ROLES_ADMIN.includes(membre.role)) return false;
  return (await prisma.membre.count({ where: { role: { in: ROLES_ADMIN }, statut: "ACTIF", id: { not: membre.id } } })) === 0;
}

export async function modifierMembre(_etat, formData) {
  const bureau = await exigerBureau();
  try {
    const m = await cible(formData);
    const categorie = String(formData.get("categorie"));
    const role = String(formData.get("role"));
    if (!libellesCategorie[categorie] || !ROLES.includes(role)) return { erreur: "Valeurs invalides." };
    if (m.id === bureau.id && !ROLES_ADMIN.includes(role)) return { erreur: "Vous ne pouvez pas retirer vos propres droits d'administrateur." };
    if (!ROLES_ADMIN.includes(role) && (await dernierBureau(m))) return { erreur: "C'est le dernier administrateur : nommez-en un autre d'abord." };
    await prisma.membre.update({
      where: { id: m.id },
      data: { categorie, role, ...(categorie === "ACTIF" && m.categorie !== "ACTIF" ? { dateAgrement: new Date() } : {}) },
    });
    await journaliser({ acteurId: bureau.id, action: "membre.modifie", cibleType: "Membre", cibleId: m.id, details: { categorie, role } });
    revalidatePath("/admin/membres", "layout");
    return { ok: "Modifications enregistrées." };
  } catch (e) {
    return { erreur: e.message };
  }
}

// CON-4 : un compte suspendu ne peut plus se connecter ; ses sessions sont fermées
export async function changerStatutMembre(_etat, formData) {
  const bureau = await exigerBureau();
  try {
    const m = await cible(formData);
    const suspendre = formData.get("action") === "suspendre";
    if (m.id === bureau.id) return { erreur: "Vous ne pouvez pas suspendre votre propre compte." };
    if (suspendre && (await dernierBureau(m))) return { erreur: "C'est le dernier administrateur : nommez-en un autre d'abord." };
    if (m.statut === "CLOTURE") return { erreur: "Ce compte est clôturé." };
    const motif = String(formData.get("motif") ?? "").trim().slice(0, 500) || null;
    await prisma.membre.update({
      where: { id: m.id },
      data: suspendre ? { statut: "SUSPENDU", motifStatut: motif } : { statut: m.motDePasseHash ? "ACTIF" : "EN_ATTENTE_ACTIVATION", motifStatut: null },
    });
    if (suspendre) await prisma.session.deleteMany({ where: { membreId: m.id } });
    await journaliser({ acteurId: bureau.id, action: suspendre ? "membre.suspendu" : "membre.reactive", cibleType: "Membre", cibleId: m.id, motif });
    revalidatePath("/admin/membres", "layout");
    return { ok: suspendre ? "Compte suspendu : la personne ne peut plus se connecter." : "Compte réactivé." };
  } catch (e) {
    return { erreur: e.message };
  }
}

export async function supprimerMembreAction(_etat, formData) {
  const bureau = await exigerBureau();
  let resultat;
  try {
    const m = await cible(formData);
    if (m.id === bureau.id) return { erreur: "Vous ne pouvez pas supprimer votre propre compte." };
    if (await dernierBureau(m)) return { erreur: "C'est le dernier administrateur : nommez-en un autre d'abord." };
    // Confirmation : l'administrateur retape l'adresse e-mail du membre
    if (String(formData.get("confirmation") ?? "").trim().toLowerCase() !== m.email.toLowerCase()) {
      return { erreur: "Pour confirmer, recopiez exactement l'adresse e-mail du membre." };
    }
    resultat = await supprimerMembre(m.id);
    await journaliser({
      acteurId: bureau.id,
      action: resultat.methode === "suppression" ? "membre.supprime" : "membre.anonymise",
      cibleType: "Membre",
      cibleId: m.id,
      details: { code: resultat.alias },
    });
  } catch (e) {
    return { erreur: `Suppression impossible : ${e.message}` };
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/membres?supprime=${resultat.methode}`);
}
