"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { envoyerActivation } from "@/lib/activation";
import { genererCodeUnique } from "@/lib/adhesion";
import { journaliser } from "@/lib/audit";
import { exigerBureau } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { envoyerEmail, urlDuSite } from "@/lib/email";
import { emailRefus } from "@/lib/modeles-email-membres";
import { libellesCategorie, libellesModeReglement } from "@/lib/site";

const date = (message) => z.string({ required_error: message }).regex(/^\d{4}-\d{2}-\d{2}$/, message).transform((v) => new Date(`${v}T00:00:00Z`));

const schemaValidation = z
  .object({
    montant: z.coerce.number({ invalid_type_error: "Montant invalide." }).min(1, "La cotisation est d'un euro minimum.").max(10000),
    modeReglement: z.enum(Object.keys(libellesModeReglement), { errorMap: () => ({ message: "Choisissez le mode de règlement." }) }),
    recueLe: date("Indiquez la date de réception de la cotisation."),
    valideJusquau: date("Indiquez la date de fin de validité."),
    categorie: z.enum(Object.keys(libellesCategorie), { errorMap: () => ({ message: "Choisissez la catégorie de membre." }) }),
  })
  .refine((d) => d.valideJusquau > d.recueLe, { message: "La fin de validité doit être après la date de réception." });

// ADH-13 : un membre du Bureau valide l'inscription en enregistrant la cotisation reçue.
// En une seule opération : compte, code personnel, cotisation, acceptations rattachées, lien d'activation.
export async function validerDemande(_etat, formData) {
  const bureau = await exigerBureau();
  const id = String(formData.get("id") ?? "");
  const lu = schemaValidation.safeParse(Object.fromEntries(formData));
  if (!lu.success) return { erreur: lu.error.issues[0].message };
  const c = lu.data;

  let membre, code;
  try {
    ({ membre, code } = await prisma.$transaction(async (tx) => {
      // « Réserve » la demande : si deux personnes valident en même temps, une seule y parvient
      const { count } = await tx.demandeAdhesion.updateMany({ where: { id, statut: "EN_ATTENTE" }, data: { statut: "VALIDEE" } });
      if (count !== 1) throw new Error("Cette demande a déjà été traitée.");
      const d = await tx.demandeAdhesion.findUnique({ where: { id } });
      if (await tx.membre.findUnique({ where: { email: d.email } })) throw new Error("Un compte existe déjà avec cette adresse e-mail.");

      const code = await genererCodeUnique(tx);
      const membre = await tx.membre.create({
        data: {
          email: d.email,
          nom: d.nom,
          prenom: d.prenom,
          dateNaissance: d.dateNaissance,
          adresse: d.adresse,
          codePostal: d.codePostal,
          commune: d.commune,
          telephone: d.telephone,
          responsableNom: d.responsableNom,
          responsableLien: d.responsableLien,
          responsableTelephone: d.responsableTelephone,
          droitImage: d.droitImage,
          categorie: c.categorie,
          dateAgrement: new Date(),
          statut: "EN_ATTENTE_ACTIVATION",
          role: "ADHERENT",
          alias: { create: { code } },
          cotisations: {
            create: { montant: c.montant, modeReglement: c.modeReglement, recueLe: c.recueLe, valideJusquau: c.valideJusquau, saisieParId: bureau.id },
          },
        },
      });
      // Les acceptations signées à la demande deviennent celles du membre (RG-21)
      await tx.acceptation.updateMany({ where: { demandeId: id }, data: { membreId: membre.id } });
      await tx.demandeAdhesion.update({ where: { id }, data: { decideLe: new Date(), decideParId: bureau.id, membreId: membre.id } });
      return { membre, code };
    }));
  } catch (e) {
    return { erreur: e.message };
  }

  await journaliser({ acteurId: bureau.id, action: "demande.validee", cibleType: "DemandeAdhesion", cibleId: id, details: { membre: membre.id } });
  await journaliser({
    acteurId: bureau.id,
    action: "cotisation.enregistree",
    cibleType: "Membre",
    cibleId: membre.id,
    details: { montant: c.montant, mode: c.modeReglement },
  });
  try {
    await envoyerActivation(membre, code);
  } catch (e) {
    console.error("Courriel d'activation non envoyé :", e.message);
    revalidatePath("/admin/demandes");
    return { erreur: "Adhésion validée, mais l'e-mail d'activation n'a pas pu partir. Utilisez « Renvoyer le lien d'activation »." };
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/demandes/${id}?valide=1`);
}

// ADH-5 : refus, avec un motif facultatif envoyé au postulant (statuts art. 9 : le motif n'est pas obligatoire).
export async function refuserDemande(_etat, formData) {
  const bureau = await exigerBureau();
  const id = String(formData.get("id") ?? "");
  const motif = String(formData.get("motif") ?? "").trim().slice(0, 1000) || null;

  const { count } = await prisma.demandeAdhesion.updateMany({
    where: { id, statut: "EN_ATTENTE" },
    data: { statut: "REFUSEE", motifRefus: motif, decideLe: new Date(), decideParId: bureau.id },
  });
  if (count !== 1) return { erreur: "Cette demande a déjà été traitée." };
  const d = await prisma.demandeAdhesion.findUnique({ where: { id } });
  await journaliser({ acteurId: bureau.id, action: "demande.refusee", cibleType: "DemandeAdhesion", cibleId: id, motif });

  const lienContact = `${await urlDuSite()}/contact`;
  await envoyerEmail({ a: d.email, ...emailRefus({ prenom: d.prenom, motif, lienContact }) }).catch((e) =>
    console.error("Courriel de refus non envoyé :", e.message),
  );
  revalidatePath("/admin", "layout");
  redirect(`/admin/demandes/${id}`);
}

// ADH-14 : demande restée sans cotisation, classée sans suite (sans courriel).
export async function classerDemande(formData) {
  const bureau = await exigerBureau();
  const id = String(formData.get("id") ?? "");
  const { count } = await prisma.demandeAdhesion.updateMany({
    where: { id, statut: "EN_ATTENTE" },
    data: { statut: "CLASSEE_SANS_SUITE", decideLe: new Date(), decideParId: bureau.id },
  });
  if (count === 1) await journaliser({ acteurId: bureau.id, action: "demande.classee", cibleType: "DemandeAdhesion", cibleId: id });
  revalidatePath("/admin", "layout");
}

// Lien d'activation perdu ou expiré : on en envoie un nouveau (l'ancien est annulé).
export async function renvoyerActivation(_etat, formData) {
  const bureau = await exigerBureau();
  const membre = await prisma.membre.findUnique({ where: { id: String(formData.get("membreId") ?? "") }, include: { alias: true } });
  if (!membre || membre.statut !== "EN_ATTENTE_ACTIVATION") return { erreur: "Ce compte est déjà activé." };
  try {
    await envoyerActivation(membre, membre.alias?.code ?? "");
  } catch (e) {
    return { erreur: `Envoi impossible : ${e.message}` };
  }
  await journaliser({ acteurId: bureau.id, action: "membre.activation_renvoyee", cibleType: "Membre", cibleId: membre.id });
  return { ok: `Nouveau lien d'activation envoyé à ${membre.email}.` };
}
