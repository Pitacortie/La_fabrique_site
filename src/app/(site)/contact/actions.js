"use server";

import { z } from "zod";
import { adresseAssociation } from "@/lib/adhesion";
import { journaliser } from "@/lib/audit";
import { getMembreConnecte } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { envoyerEmail, urlDuSite } from "@/lib/email";
import { emailAccuseContact, emailMessageContact } from "@/lib/modeles-email-membres";
import { limiter } from "@/lib/rate-limit";
import { ipClient } from "@/lib/requete";
import { SUJETS_CONTACT } from "@/lib/site";

const message = (m) => ({ required_error: m, invalid_type_error: m });
const schema = z.object({
  nom: z.string(message("Indiquez votre nom.")).trim().min(1, "Indiquez votre nom.").max(100),
  email: z.string(message("Indiquez votre adresse e-mail.")).trim().toLowerCase().email("Adresse e-mail invalide.").max(200),
  sujet: z.enum(Object.keys(SUJETS_CONTACT), { errorMap: () => ({ message: "Choisissez un objet." }) }),
  texte: z.string(message("Écrivez votre message.")).trim().min(10, "Votre message est trop court (10 caractères minimum).").max(5000),
});

const MERCI = "Merci, votre message a bien été envoyé. Vous allez recevoir un accusé de réception par e-mail.";

// CTC-1 : le message est enregistré (ADM-4), transmis à l'association et accusé auprès de l'expéditeur.
export async function envoyerMessage(_etat, formData) {
  if (formData.get("site_web")) return { ok: MERCI }; // champ piège anti-robot (CTC-4)
  if (!limiter(`contact:${await ipClient()}`, { max: 5, fenetreMs: 60 * 60 * 1000 }).autorise) {
    return { erreur: "Vous avez envoyé plusieurs messages récemment. Réessayez dans une heure." };
  }
  const lu = schema.safeParse(Object.fromEntries(formData));
  if (!lu.success) return { erreur: lu.error.issues[0].message };
  const d = lu.data;

  const membre = await getMembreConnecte();
  const enregistre = await prisma.messageContact.create({
    data: { nom: d.nom, email: d.email, sujet: SUJETS_CONTACT[d.sujet], texte: d.texte, ...(membre ? { telephone: membre.telephone } : {}) },
  });
  await journaliser({ acteurId: membre?.id, action: "contact.recu", cibleType: "MessageContact", cibleId: enregistre.id });

  const lien = `${await urlDuSite()}/admin/messages?id=${enregistre.id}`;
  const echec = (e) => console.error("Courriel non envoyé :", e.message);
  // « Répondre » depuis la boîte de l'association écrit directement à l'expéditeur
  await envoyerEmail({ a: await adresseAssociation(), repondreA: d.email, ...emailMessageContact({ ...d, sujet: SUJETS_CONTACT[d.sujet], lien }) }).catch(echec);
  await envoyerEmail({ a: d.email, ...emailAccuseContact({ nom: d.nom }) }).catch(echec);
  return { ok: MERCI };
}
