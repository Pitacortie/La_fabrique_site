"use server";

import { hash, verify } from "@node-rs/argon2";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { journaliser } from "@/lib/audit";
import { exigerMembre, fermerAutresSessions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { envoyerEmail, urlDuSite } from "@/lib/email";
import { emailMotDePasseModifie } from "@/lib/modeles-email";
import { limiter, reinitialiser } from "@/lib/rate-limit";

const schemaCoordonnees = z.object({
  telephone: z.string().trim().regex(/^[0-9 +().-]{10,20}$/, "Numéro de téléphone invalide."),
  adresse: z.string().trim().min(3, "L'adresse est obligatoire.").max(200),
  codePostal: z.string().trim().regex(/^\d{5}$/, "Le code postal doit comporter 5 chiffres."),
  commune: z.string().trim().min(1, "La commune est obligatoire.").max(100),
  droitImage: z.enum(["oui", "non"], { message: "Choisissez une option pour le droit à l'image." }),
});

// Le membre met à jour ses coordonnées et son choix de droit à l'image (ADH-17).
// Nom, prénom, date de naissance et e-mail ne sont pas modifiables ici.
export async function modifierCoordonnees(_etat, formData) {
  const membre = await exigerMembre("/espace/coordonnees");
  const donnees = schemaCoordonnees.safeParse({
    telephone: formData.get("telephone") ?? "",
    adresse: formData.get("adresse") ?? "",
    codePostal: formData.get("codePostal") ?? "",
    commune: formData.get("commune") ?? "",
    droitImage: formData.get("droitImage") ?? "",
  });
  if (!donnees.success) return { erreur: donnees.error.issues[0].message };

  const { droitImage, ...coordonnees } = donnees.data;
  const autorise = droitImage === "oui";
  await prisma.membre.update({ where: { id: membre.id }, data: { ...coordonnees, droitImage: autorise } });

  // Le droit à l'image est un consentement : son changement est tracé (consulté avant publication, ACT-8)
  if (autorise !== membre.droitImage) {
    await journaliser({
      acteurId: membre.id,
      action: autorise ? "membre.droit_image_accorde" : "membre.droit_image_retire",
      cibleType: "Membre",
      cibleId: membre.id,
    });
  }
  revalidatePath("/espace");
  return { ok: "Vos coordonnées ont été enregistrées." };
}

const schemaMotDePasse = z
  .object({
    actuel: z.string().min(1, "Saisissez votre mot de passe actuel."),
    nouveau: z.string().min(10, "Le nouveau mot de passe doit comporter au moins 10 caractères.").max(200),
    confirmation: z.string(),
  })
  .refine((d) => d.nouveau === d.confirmation, { message: "Les deux nouveaux mots de passe ne correspondent pas." })
  .refine((d) => d.nouveau !== d.actuel, { message: "Le nouveau mot de passe doit être différent de l'actuel." });

export async function changerMotDePasse(_etat, formData) {
  const membre = await exigerMembre("/espace/mot-de-passe");
  const donnees = schemaMotDePasse.safeParse({
    actuel: formData.get("actuel") ?? "",
    nouveau: formData.get("nouveau") ?? "",
    confirmation: formData.get("confirmation") ?? "",
  });
  if (!donnees.success) return { erreur: donnees.error.issues[0].message };

  const cle = `mot-de-passe:${membre.id}`;
  if (!limiter(cle, { max: 5, fenetreMs: 15 * 60 * 1000 }).autorise) {
    return { erreur: "Trop de tentatives. Réessayez dans quelques minutes." };
  }
  if (!membre.motDePasseHash || !(await verify(membre.motDePasseHash, donnees.data.actuel))) {
    return { erreur: "Mot de passe actuel incorrect." };
  }
  const identifiant = membre.email.split("@")[0].toLowerCase();
  if (identifiant.length >= 4 && donnees.data.nouveau.toLowerCase().includes(identifiant)) {
    return { erreur: "Le mot de passe ne doit pas contenir votre adresse e-mail." };
  }

  reinitialiser(cle);
  await prisma.membre.update({ where: { id: membre.id }, data: { motDePasseHash: await hash(donnees.data.nouveau) } });
  await fermerAutresSessions(membre.id);
  await journaliser({ acteurId: membre.id, action: "membre.mot_de_passe_change", cibleType: "Membre", cibleId: membre.id });
  // Alerte de sécurité : prévient le membre si quelqu'un d'autre a changé son mot de passe
  await envoyerEmail({ a: membre.email, ...emailMotDePasseModifie({ prenom: membre.prenom, lienContact: `${await urlDuSite()}/contact` }) }).catch(
    (e) => console.error("Courriel de confirmation non envoyé :", e.message),
  );
  return { ok: "Mot de passe changé. Vos autres appareils ont été déconnectés.", reinitialiser: true };
}
