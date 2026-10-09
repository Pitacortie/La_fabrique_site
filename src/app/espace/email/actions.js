"use server";

import { verify } from "@node-rs/argon2";
import { redirect } from "next/navigation";
import { z } from "zod";
import { journaliser } from "@/lib/audit";
import { exigerMembre, fermerAutresSessions, getMembreConnecte } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { envoyerEmail, urlDuSite } from "@/lib/email";
import { consommerJeton, creerJeton, lireJeton } from "@/lib/jetons";
import { emailAdresseModifiee, emailConfirmerAdresse } from "@/lib/modeles-email-membres";
import { compterEchec, estBloque, reinitialiser } from "@/lib/rate-limit";

const DUREE_MINUTES = 60;

// Étape 1 : le membre indique sa nouvelle adresse (et son mot de passe) ; un lien part vers cette adresse.
export async function demanderChangementEmail(_etat, formData) {
  const membre = await exigerMembre("/espace/email");
  const nouvel = z.string().trim().toLowerCase().email().max(200).safeParse(formData.get("nouvelEmail") ?? "");
  if (!nouvel.success) return { erreur: "Adresse e-mail invalide." };
  if (nouvel.data === membre.email) return { erreur: "C'est déjà l'adresse de votre compte." };

  const cle = `changement-email:${membre.id}`;
  if (estBloque(cle, { max: 5 })) return { erreur: "Trop de tentatives. Réessayez dans quelques minutes." };
  if (!membre.motDePasseHash || !(await verify(membre.motDePasseHash, String(formData.get("motDePasse") ?? "")))) {
    compterEchec(cle, { fenetreMs: 15 * 60 * 1000 });
    return { erreur: "Mot de passe incorrect." };
  }
  reinitialiser(cle);

  const reponse = { ok: `Un e-mail de confirmation vient d'être envoyé à ${nouvel.data}. Cliquez sur le lien qu'il contient (valable 1 heure).` };
  // Adresse déjà prise par un autre compte : même réponse (on ne révèle pas qui est inscrit), aucun envoi.
  if (await prisma.membre.findUnique({ where: { email: nouvel.data } })) return reponse;

  const jeton = await creerJeton(membre.id, "CHANGEMENT_EMAIL", DUREE_MINUTES, { nouvelEmail: nouvel.data });
  const lien = `${await urlDuSite()}/confirmer-email/${jeton}`;
  try {
    await envoyerEmail({ a: nouvel.data, ...emailConfirmerAdresse({ prenom: membre.prenom, lien, dureeMinutes: DUREE_MINUTES }) });
  } catch (e) {
    console.error("Courriel de confirmation non envoyé :", e.message);
    return { erreur: "L'e-mail n'a pas pu être envoyé. Réessayez plus tard." };
  }
  await journaliser({ acteurId: membre.id, action: "membre.changement_email_demande", cibleType: "Membre", cibleId: membre.id });
  return reponse;
}

// Étape 2 : clic sur le lien reçu à la nouvelle adresse (confirmé par un bouton, jamais par la seule visite du lien).
export async function confirmerChangementEmail(_etat, formData) {
  const ligne = await lireJeton(String(formData.get("jeton") ?? ""), "CHANGEMENT_EMAIL");
  if (!ligne?.nouvelEmail) return { erreur: "Ce lien n'est plus valable. Refaites la demande depuis votre espace." };
  if (await prisma.membre.findUnique({ where: { email: ligne.nouvelEmail } })) {
    return { erreur: "Cette adresse est déjà utilisée par un autre compte." };
  }
  if (!(await consommerJeton(ligne.id))) return { erreur: "Ce lien a déjà été utilisé." };

  const ancienne = ligne.membre.email;
  await prisma.membre.update({ where: { id: ligne.membreId }, data: { email: ligne.nouvelEmail } });
  // Les autres sessions du compte sont fermées (seule celle de ce navigateur reste, si c'est la sienne)
  await fermerAutresSessions(ligne.membreId);
  await journaliser({
    acteurId: ligne.membreId,
    action: "membre.email_modifie",
    cibleType: "Membre",
    cibleId: ligne.membreId,
    details: { ancienne, nouvelle: ligne.nouvelEmail },
  });
  await envoyerEmail({
    a: ancienne,
    ...emailAdresseModifiee({ prenom: ligne.membre.prenom, nouvelle: ligne.nouvelEmail, lienContact: `${await urlDuSite()}/contact` }),
  }).catch((e) => console.error("Courriel d'alerte non envoyé :", e.message));

  const connecte = await getMembreConnecte();
  redirect(connecte?.id === ligne.membreId ? "/espace?email=modifie" : "/connexion?email=modifie");
}
