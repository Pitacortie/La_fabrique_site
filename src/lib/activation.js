import { DUREE_ACTIVATION_JOURS } from "@/lib/adhesion";
import { envoyerEmail, urlDuSite } from "@/lib/email";
import { creerJeton } from "@/lib/jetons";
import { emailActivation } from "@/lib/modeles-email-membres";

// Envoie (ou renvoie) le lien d'activation : le nouveau membre y choisit son mot de passe (ADH-6, ADH-7).
// Un nouveau lien annule le précédent.
export async function envoyerActivation(membre, code) {
  const jeton = await creerJeton(membre.id, "ACTIVATION", DUREE_ACTIVATION_JOURS * 24 * 60);
  const lien = `${await urlDuSite()}/activer/${jeton}`;
  await envoyerEmail({ a: membre.email, ...emailActivation({ prenom: membre.prenom, code, lien, dureeJours: DUREE_ACTIVATION_JOURS }) });
}
