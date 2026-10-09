"use server";

import { hash } from "@node-rs/argon2";
import { ipClient } from "@/lib/requete";
import { redirect } from "next/navigation";
import { z } from "zod";
import { envoyerActivation } from "@/lib/activation";
import { journaliser } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { envoyerEmail, urlDuSite } from "@/lib/email";
import { consommerJeton, creerJeton, lireJeton } from "@/lib/jetons";
import { emailMotDePasseModifie, emailReinitialisation } from "@/lib/modeles-email";
import { limiter } from "@/lib/rate-limit";

const DUREE_LIEN_MINUTES = 60;

// Réponse identique que le compte existe ou non : on ne révèle pas quelles adresses sont inscrites.
const REPONSE =
  "Si un compte correspond à cette adresse, un e-mail vient d'être envoyé avec un lien pour choisir un nouveau mot de passe. Pensez à regarder dans les indésirables.";

export async function demanderReinitialisation(_etat, formData) {
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email") ?? "");
  if (!email.success) return { erreur: "Adresse e-mail invalide." };

  const ip = await ipClient();
  const parIp = limiter(`reinit-ip:${ip}`, { max: 10, fenetreMs: 60 * 60 * 1000 });
  const parEmail = limiter(`reinit-email:${email.data}`, { max: 3, fenetreMs: 60 * 60 * 1000 });
  if (!parIp.autorise) return { erreur: "Trop de demandes. Réessayez dans une heure." };
  if (!parEmail.autorise) return { ok: REPONSE }; // silencieux : évite d'inonder une boîte mail

  const membre = await prisma.membre.findUnique({ where: { email: email.data }, include: { alias: true } });
  // Compte validé mais jamais activé : on renvoie plutôt le lien d'activation (même réponse à l'écran)
  if (membre?.statut === "EN_ATTENTE_ACTIVATION") {
    await envoyerActivation(membre, membre.alias?.code ?? "").catch((e) => console.error("Courriel d'activation non envoyé :", e.message));
    return { ok: REPONSE };
  }
  if (membre && membre.statut === "ACTIF") {
    const jeton = await creerJeton(membre.id, "REINITIALISATION", DUREE_LIEN_MINUTES);
    const lien = `${await urlDuSite()}/reinitialiser/${jeton}`;
    try {
      await envoyerEmail({ a: membre.email, ...emailReinitialisation({ prenom: membre.prenom, lien, dureeMinutes: DUREE_LIEN_MINUTES }) });
    } catch (e) {
      console.error("Envoi du courriel de réinitialisation impossible :", e.message);
      return { erreur: "L'e-mail n'a pas pu être envoyé. Réessayez plus tard ou contactez l'association." };
    }
    await journaliser({ acteurId: membre.id, action: "membre.reinitialisation_demandee", cibleType: "Membre", cibleId: membre.id });
  }
  return { ok: REPONSE };
}

const schemaNouveau = z
  .object({
    nouveau: z.string().min(10, "Le mot de passe doit comporter au moins 10 caractères.").max(200),
    confirmation: z.string(),
  })
  .refine((d) => d.nouveau === d.confirmation, { message: "Les deux mots de passe ne correspondent pas." });

export async function reinitialiserMotDePasse(_etat, formData) {
  const ligne = await lireJeton(String(formData.get("jeton") ?? ""), "REINITIALISATION");
  if (!ligne) return { erreur: "Ce lien n'est plus valable. Faites une nouvelle demande." };

  const donnees = schemaNouveau.safeParse({ nouveau: formData.get("nouveau") ?? "", confirmation: formData.get("confirmation") ?? "" });
  if (!donnees.success) return { erreur: donnees.error.issues[0].message };
  const identifiant = ligne.membre.email.split("@")[0].toLowerCase();
  if (identifiant.length >= 4 && donnees.data.nouveau.toLowerCase().includes(identifiant)) {
    return { erreur: "Le mot de passe ne doit pas contenir votre adresse e-mail." };
  }

  if (!(await consommerJeton(ligne.id))) return { erreur: "Ce lien a déjà été utilisé. Faites une nouvelle demande." };
  await prisma.membre.update({ where: { id: ligne.membreId }, data: { motDePasseHash: await hash(donnees.data.nouveau) } });
  // Toutes les sessions sont fermées : si quelqu'un d'autre était connecté au compte, il est déconnecté.
  await prisma.session.deleteMany({ where: { membreId: ligne.membreId } });
  await journaliser({ acteurId: ligne.membreId, action: "membre.mot_de_passe_reinitialise", cibleType: "Membre", cibleId: ligne.membreId });

  const site = await urlDuSite();
  await envoyerEmail({ a: ligne.membre.email, ...emailMotDePasseModifie({ prenom: ligne.membre.prenom, lienContact: `${site}/contact` }) }).catch(
    (e) => console.error("Courriel de confirmation non envoyé :", e.message),
  );
  redirect("/connexion?reinitialise=1");
}
