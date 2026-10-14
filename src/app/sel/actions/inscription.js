"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { journaliser } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { envoyerEmail, urlDuSite } from "@/lib/email";
import { limiter } from "@/lib/rate-limit";
import { exigerAdherentAJour } from "@/lib/sel/acces";
import { emailInscriptionValidee } from "@/lib/sel/modeles-email";
import { TEXTES_SEL } from "@/lib/sel/regles";
import { getTextesEnVigueur } from "@/lib/textes";

const texte = (m) => z.string({ required_error: m }).trim();

// SEL-2, SEL-21 : assurance responsabilité civile déclarative. Aucun fichier, aucune vérification par l'association.
const schemaRc = z.object({
  possedeRc: z.literal("on", { errorMap: () => ({ message: "Cochez la case : une assurance responsabilité civile en cours de validité est obligatoire pour échanger." }) }),
  numeroPolice: texte("Indiquez le numéro de votre contrat (police).").min(3, "Indiquez le numéro de votre contrat (police).").max(60),
  compagnie: texte("Indiquez le nom de la compagnie d'assurance.").min(2, "Indiquez le nom de la compagnie d'assurance.").max(100),
  adresseCompagnie: texte("Indiquez l'adresse de la compagnie d'assurance.").min(5, "Indiquez l'adresse de la compagnie d'assurance.").max(200),
});

function lireAssurance(formData) {
  const lu = schemaRc.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string" && v.trim() !== "")));
  if (!lu.success) return { erreur: lu.error.issues[0].message };
  const { numeroPolice, compagnie, adresseCompagnie } = lu.data;
  return { assuranceRc: { numeroPolice, compagnie, adresseCompagnie, declareeLe: new Date().toISOString() } };
}

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

export async function inscrireSel(_etat, formData) {
  const etat = await exigerAdherentAJour();
  if (etat.code !== "inscription") redirect("/sel/inscription");
  if (!limiter(`inscription-sel:${etat.membre.id}`, { max: 20, fenetreMs: 60 * 60 * 1000 }).autorise) {
    return { erreur: "Trop de tentatives. Réessayez dans une heure." };
  }
  const t = await verifierTextes(formData);
  if (t.erreur) return t;
  const a = lireAssurance(formData);
  if (a.erreur) return a;

  try {
    await prisma.$transaction([
      prisma.inscriptionSel.create({ data: { membreId: etat.membre.id, assuranceRc: a.assuranceRc } }),
      prisma.acceptation.createMany({ data: t.textes.map((texte) => ({ texteId: texte.id, membreId: etat.membre.id })) }),
    ]);
  } catch {
    return { erreur: "L'inscription n'a pas pu être enregistrée. Réessayez." };
  }
  await journaliser({ acteurId: etat.membre.id, action: "sel.inscription", cibleType: "Membre", cibleId: etat.membre.id });
  await envoyerEmail({ a: etat.membre.email, ...emailInscriptionValidee({ prenom: etat.membre.prenom, lien: `${await urlDuSite()}/sel` }) }).catch((e) =>
    console.error("Courriel du SEL non envoyé :", e.message),
  );
  revalidatePath("/sel", "layout");
  redirect("/sel?bienvenue=1");
}

// Déclaration ou mise à jour de l'assurance (changement de contrat, ou inscription antérieure sans déclaration)
export async function declarerAssurance(_etat, formData) {
  const etat = await exigerAdherentAJour("/sel/assurance");
  if (!["assurance", "ok"].includes(etat.code)) redirect("/sel/inscription");
  if (!limiter(`assurance-sel:${etat.membre.id}`, { max: 10, fenetreMs: 60 * 60 * 1000 }).autorise) {
    return { erreur: "Trop de tentatives. Réessayez dans une heure." };
  }
  const a = lireAssurance(formData);
  if (a.erreur) return a;
  await prisma.inscriptionSel.update({ where: { membreId: etat.membre.id }, data: { assuranceRc: a.assuranceRc } });
  await journaliser({ acteurId: etat.membre.id, action: "sel.assurance_declaree", cibleType: "Membre", cibleId: etat.membre.id });
  revalidatePath("/sel", "layout");
  if (etat.code === "assurance") redirect("/sel");
  return { ok: "Votre assurance est enregistrée." };
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
