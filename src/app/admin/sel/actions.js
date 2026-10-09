"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { journaliser } from "@/lib/audit";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { envoyerEmail, urlDuSite } from "@/lib/email";
import { supprimerFichierPrive } from "@/lib/fichiers-prives";
import { slugifier } from "@/lib/format";
import { emailInscriptionRefusee, emailInscriptionValidee } from "@/lib/sel/modeles-email";
import { PLANCHER_BRIQUES } from "@/lib/sel/regles";

const echec = (e) => console.error("Courriel du SEL non envoyé :", e.message);
const fin = () => revalidatePath("/admin/sel", "layout");

// SEL-21 : l'administrateur vérifie l'attestation, saisit sa date de validité ; le fichier est ensuite supprimé.
export async function validerAttestation(_etat, formData) {
  const admin = await exigerAdmin();
  const id = String(formData.get("id") ?? "");
  const date = String(formData.get("valideJusquau") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { erreur: "Indiquez la date de fin de validité lue sur l'attestation." };
  const valideJusquau = new Date(`${date}T00:00:00Z`);
  if (valideJusquau < new Date()) return { erreur: "Cette date est passée : l'attestation n'est plus valable." };

  const attestation = await prisma.attestationRc.findUnique({ where: { id }, include: { membre: { select: { email: true, prenom: true } } } });
  if (!attestation || attestation.statut !== "EN_ATTENTE") return { erreur: "Cette attestation a déjà été traitée." };
  await prisma.attestationRc.update({ where: { id }, data: { statut: "VALIDEE", valideJusquau, verifieParId: admin.id, verifieLe: new Date(), fichier: null } });
  if (attestation.fichier) await supprimerFichierPrive(attestation.fichier);
  await journaliser({ acteurId: admin.id, action: "sel.attestation_validee", cibleType: "AttestationRc", cibleId: id });
  await envoyerEmail({ a: attestation.membre.email, ...emailInscriptionValidee({ prenom: attestation.membre.prenom, lien: `${await urlDuSite()}/sel` }) }).catch(echec);
  fin();
  return { ok: "Attestation validée, fichier supprimé. Le membre a accès au SEL." };
}

export async function refuserAttestation(_etat, formData) {
  const admin = await exigerAdmin();
  const id = String(formData.get("id") ?? "");
  const motif = String(formData.get("motif") ?? "").trim().slice(0, 500) || null;
  const attestation = await prisma.attestationRc.findUnique({ where: { id }, include: { membre: { select: { email: true, prenom: true } } } });
  if (!attestation || attestation.statut !== "EN_ATTENTE") return { erreur: "Cette attestation a déjà été traitée." };
  await prisma.attestationRc.update({ where: { id }, data: { statut: "REFUSEE", motifRefus: motif, verifieParId: admin.id, verifieLe: new Date(), fichier: null } });
  if (attestation.fichier) await supprimerFichierPrive(attestation.fichier);
  await journaliser({ acteurId: admin.id, action: "sel.attestation_refusee", cibleType: "AttestationRc", cibleId: id, motif });
  await envoyerEmail({
    a: attestation.membre.email,
    ...emailInscriptionRefusee({ prenom: attestation.membre.prenom, motif, lien: `${await urlDuSite()}/sel/inscription` }),
  }).catch(echec);
  fin();
  return { ok: "Attestation refusée, fichier supprimé. Le membre est invité à en déposer une nouvelle." };
}

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

// SEL-22 : dérogation au solde minimum de -120 briques
export async function changerPlancher(formData) {
  const admin = await exigerAdmin();
  const aliasId = String(formData.get("aliasId") ?? "");
  const valeur = String(formData.get("plancher") ?? "").trim();
  const plancher = valeur === "" ? null : Number(valeur);
  if (plancher !== null && (!Number.isInteger(plancher) || plancher > 0 || plancher < -1440)) return;
  await prisma.alias.update({ where: { id: aliasId }, data: { plancherBriques: plancher === PLANCHER_BRIQUES ? null : plancher } });
  await journaliser({ acteurId: admin.id, action: "sel.derogation_plancher", cibleType: "Alias", cibleId: aliasId, details: { plancher } });
  fin();
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
        // Décision du CA après médiation : le plancher de -120 peut être dépassé, l'opération est journalisée
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
