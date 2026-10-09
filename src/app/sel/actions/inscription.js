"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { journaliser } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { urlDuSite } from "@/lib/email";
import { enregistrerFichierPrive, supprimerFichierPrive } from "@/lib/fichiers-prives";
import { limiter } from "@/lib/rate-limit";
import { exigerAdherentAJour } from "@/lib/sel/acces";
import { emailNouvelleInscription } from "@/lib/sel/modeles-email";
import { notifierBureau } from "@/lib/sel/notifications";
import { TEXTES_SEL } from "@/lib/sel/regles";
import { getTextesEnVigueur } from "@/lib/textes";

const schemaRc = z.object({
  assureur: z.string({ required_error: "Indiquez votre assureur." }).trim().min(2, "Indiquez votre assureur.").max(100),
  valideJusquau: z
    .string({ required_error: "Indiquez la date de fin de validité." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Indiquez la date de fin de validité.")
    .refine((v) => new Date(`${v}T23:59:59`) >= new Date(), "Cette attestation n'est plus valable : la date de fin est passée."),
  certifie: z.literal("on", { errorMap: () => ({ message: "Certifiez que l'attestation est à votre nom et en cours de validité." }) }),
});

// SEL-2 : acceptation de la Charte et du Règlement du SEL, par deux cases distinctes, avec la version du texte
async function verifierTextes(formData) {
  const textes = await getTextesEnVigueur(TEXTES_SEL);
  for (const type of TEXTES_SEL) {
    if (!textes[type]) return { erreur: "Les textes du SEL ne sont pas encore disponibles. Contactez l'association." };
    if (formData.get(`accepte-${type}`) !== "on") {
      return { erreur: type === "CHARTE_SEL" ? "Vous devez accepter la Charte des membres du SEL." : "Vous devez accepter le Règlement intérieur du SEL." };
    }
    if (formData.get(`version-${type}`) !== textes[type].id) return { erreur: "Un texte du SEL vient d'être mis à jour : rechargez la page." };
  }
  return { textes: Object.values(textes) };
}

async function enregistrerAttestation(formData, membreId) {
  const lu = schemaRc.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string" && v !== "")));
  if (!lu.success) return { erreur: lu.error.issues[0].message };
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) return { erreur: "Joignez votre attestation (PDF, JPEG ou PNG)." };
  try {
    const { chemin, type } = await enregistrerFichierPrive(fichier, "attestations");
    return { donnees: { membreId, assureur: lu.data.assureur, valideJusquau: new Date(`${lu.data.valideJusquau}T00:00:00Z`), fichier: chemin, fichierType: type } };
  } catch (e) {
    return { erreur: e.message };
  }
}

async function prevenirBureau() {
  await notifierBureau(emailNouvelleInscription({ lien: `${await urlDuSite()}/admin/sel/inscriptions` }));
}

export async function inscrireSel(_etat, formData) {
  const etat = await exigerAdherentAJour();
  if (etat.code !== "inscription") redirect("/sel/inscription");
  if (!limiter(`inscription-sel:${etat.membre.id}`, { max: 5, fenetreMs: 60 * 60 * 1000 }).autorise) {
    return { erreur: "Trop de tentatives. Réessayez dans une heure." };
  }
  const t = await verifierTextes(formData);
  if (t.erreur) return t;
  const a = await enregistrerAttestation(formData, etat.membre.id);
  if (a.erreur) return a;

  try {
    await prisma.$transaction([
      prisma.inscriptionSel.create({ data: { membreId: etat.membre.id } }),
      prisma.acceptation.createMany({ data: t.textes.map((texte) => ({ texteId: texte.id, membreId: etat.membre.id })) }),
      prisma.attestationRc.create({ data: a.donnees }),
    ]);
  } catch (e) {
    await supprimerFichierPrive(a.donnees.fichier);
    return { erreur: "L'inscription n'a pas pu être enregistrée. Réessayez." };
  }
  await journaliser({ acteurId: etat.membre.id, action: "sel.inscription", cibleType: "Membre", cibleId: etat.membre.id });
  await prevenirBureau();
  revalidatePath("/sel", "layout");
  redirect("/sel/inscription");
}

// Nouvelle attestation : première refusée, ou attestation arrivée à expiration
export async function deposerAttestation(_etat, formData) {
  const etat = await exigerAdherentAJour();
  if (!["attestation", "attestation_expiree"].includes(etat.code)) redirect("/sel/inscription");
  if (!limiter(`attestation-sel:${etat.membre.id}`, { max: 5, fenetreMs: 60 * 60 * 1000 }).autorise) {
    return { erreur: "Trop de tentatives. Réessayez dans une heure." };
  }
  const a = await enregistrerAttestation(formData, etat.membre.id);
  if (a.erreur) return a;
  await prisma.attestationRc.create({ data: a.donnees });
  await journaliser({ acteurId: etat.membre.id, action: "sel.attestation_deposee", cibleType: "Membre", cibleId: etat.membre.id });
  await prevenirBureau();
  revalidatePath("/sel", "layout");
  redirect("/sel/inscription");
}

// Nouvelle version de la Charte ou du Règlement du SEL : acceptation redemandée (section 6.7)
export async function accepterTextesSel(_etat, formData) {
  const etat = await exigerAdherentAJour();
  if (etat.code !== "textes") redirect("/sel");
  const manquants = etat.textes;
  if (manquants.some((t) => formData.get(`accepte-${t.type}`) !== "on")) return { erreur: "Cochez chaque case pour accepter les nouvelles versions." };
  await prisma.acceptation.createMany({ data: manquants.map((t) => ({ texteId: t.id, membreId: etat.membre.id })) });
  await journaliser({ acteurId: etat.membre.id, action: "sel.textes_acceptes", cibleType: "Membre", cibleId: etat.membre.id });
  revalidatePath("/sel", "layout");
  redirect("/sel");
}
