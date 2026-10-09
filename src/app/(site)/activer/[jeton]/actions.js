"use server";

import { hash } from "@node-rs/argon2";
import { redirect } from "next/navigation";
import { z } from "zod";
import { journaliser } from "@/lib/audit";
import { creerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { consommerJeton, lireJeton } from "@/lib/jetons";

const schema = z
  .object({
    nouveau: z.string().min(10, "Le mot de passe doit comporter au moins 10 caractères.").max(200),
    confirmation: z.string(),
  })
  .refine((d) => d.nouveau === d.confirmation, { message: "Les deux mots de passe ne correspondent pas." });

// ADH-7 : le nouveau membre choisit son mot de passe ; le compte devient actif et il est connecté.
export async function activerCompte(_etat, formData) {
  const ligne = await lireJeton(String(formData.get("jeton") ?? ""), "ACTIVATION");
  if (!ligne || ligne.membre.statut !== "EN_ATTENTE_ACTIVATION") {
    return { erreur: "Ce lien n'est plus valable. Demandez-en un nouveau avec « Mot de passe oublié »." };
  }
  const lu = schema.safeParse({ nouveau: formData.get("nouveau") ?? "", confirmation: formData.get("confirmation") ?? "" });
  if (!lu.success) return { erreur: lu.error.issues[0].message };
  const identifiant = ligne.membre.email.split("@")[0].toLowerCase();
  if (identifiant.length >= 4 && lu.data.nouveau.toLowerCase().includes(identifiant)) {
    return { erreur: "Le mot de passe ne doit pas contenir votre adresse e-mail." };
  }

  if (!(await consommerJeton(ligne.id))) return { erreur: "Ce lien a déjà été utilisé." };
  await prisma.membre.update({
    where: { id: ligne.membreId },
    data: { motDePasseHash: await hash(lu.data.nouveau), statut: "ACTIF", derniereConnexion: new Date() },
  });
  await journaliser({ acteurId: ligne.membreId, action: "membre.compte_active", cibleType: "Membre", cibleId: ligne.membreId });
  await creerSession(ligne.membreId);
  redirect("/espace?bienvenue=1");
}
