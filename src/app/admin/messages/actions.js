"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adresseAssociation } from "@/lib/adhesion";
import { journaliser } from "@/lib/audit";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { envoyerEmail, urlDuSite } from "@/lib/email";
import { emailReponseContact } from "@/lib/modeles-email-membres";

// CTC-2 : réponse envoyée au nom de l'association (avec un lien vers Adhérer), et non depuis une boîte personnelle.
export async function repondreMessage(_etat, formData) {
  const admin = await exigerAdmin();
  const message = await prisma.messageContact.findUnique({ where: { id: String(formData.get("id") ?? "") } });
  if (!message) return { erreur: "Message introuvable." };
  if (message.reponduLe) return { erreur: "Une réponse a déjà été envoyée." };
  const reponse = String(formData.get("reponse") ?? "").replace(/\r\n/g, "\n").trim();
  if (reponse.length < 2) return { erreur: "Écrivez votre réponse." };
  if (reponse.length > 5000) return { erreur: "Réponse trop longue (5 000 caractères maximum)." };

  try {
    await envoyerEmail({
      a: message.email,
      repondreA: await adresseAssociation(),
      ...emailReponseContact({ nom: message.nom, reponse, question: message.texte, lienAdherer: `${await urlDuSite()}/adherer` }),
    });
  } catch (e) {
    return { erreur: `La réponse n'a pas pu être envoyée : ${e.message}` };
  }
  await prisma.messageContact.update({
    where: { id: message.id },
    data: { reponse, reponduLe: new Date(), reponduParId: admin.id, statut: "TRAITE" },
  });
  await journaliser({ acteurId: admin.id, action: "contact.repondu", cibleType: "MessageContact", cibleId: message.id });
  revalidatePath("/admin", "layout");
  redirect(`/admin/messages?id=${message.id}&repondu=1#${message.id}`);
}

const STATUTS = ["NOUVEAU", "EN_COURS", "TRAITE"];

export async function changerStatutMessage(formData) {
  const admin = await exigerAdmin();
  const statut = String(formData.get("statut"));
  if (!STATUTS.includes(statut)) return;
  const id = String(formData.get("id") ?? "");
  await prisma.messageContact.update({ where: { id }, data: { statut } });
  await journaliser({ acteurId: admin.id, action: "contact.statut", cibleType: "MessageContact", cibleId: id, details: { statut } });
  revalidatePath("/admin", "layout");
}
