"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { journaliser } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { limiter } from "@/lib/rate-limit";
import { exigerAccesSel } from "@/lib/sel/acces";
import { conversationDe } from "@/lib/sel/conversations";
import { filtreAnnoncesVisibles, filtreAuteurEnRegle } from "@/lib/sel/donnees";
import { notifierEtape, notifierMessage } from "@/lib/sel/notifications";

const TAILLE_MAX = 2000;

function lireTexte(formData) {
  const texte = String(formData.get("texte") ?? "").replace(/\r\n/g, "\n").trim();
  if (texte.length < 2) return { erreur: "Écrivez votre message." };
  if (texte.length > TAILLE_MAX) return { erreur: `Message trop long (${TAILLE_MAX} caractères maximum).` };
  return { texte };
}

function limiteMessages(aliasId) {
  return limiter(`message-sel:${aliasId}`, { max: 20, fenetreMs: 60 * 1000 }).autorise;
}

// MSG-2, MSG-3 : une conversation naît d'une annonce (bouton « Contacter »), une seule par couple (annonce, interlocuteur)
export async function contacter(_etat, formData) {
  const annonceId = String(formData.get("annonceId") ?? "");
  const { alias } = await exigerAccesSel(`/sel/annonces/${annonceId}`);
  const lu = lireTexte(formData);
  if (lu.erreur) return lu;
  if (!limiteMessages(alias.id)) return { erreur: "Vous envoyez beaucoup de messages. Patientez une minute." };

  const annonce = await prisma.annonce.findFirst({ where: { id: annonceId, ...filtreAnnoncesVisibles() } });
  if (!annonce) return { erreur: "Cette annonce n'est plus disponible." };
  if (annonce.auteurId === alias.id) return { erreur: "C'est votre propre annonce." };

  const existante = await prisma.conversation.findUnique({ where: { annonceId_interlocuteurId: { annonceId, interlocuteurId: alias.id } } });
  if (existante?.statut === "FERMEE") return { erreur: "Cette conversation a été fermée." };
  const conversation =
    existante ?? (await prisma.conversation.create({ data: { annonceId, auteurId: annonce.auteurId, interlocuteurId: alias.id } }));
  const message = await prisma.message.create({ data: { conversationId: conversation.id, emetteurId: alias.id, texte: lu.texte } });
  await prisma.conversation.update({ where: { id: conversation.id }, data: { dernierMessageLe: message.createdAt } });
  await notifierMessage({ conversationId: conversation.id, destinataireId: annonce.auteurId, messageId: message.id });
  revalidatePath("/sel", "layout");
  redirect(`/sel/messages/${conversation.id}`);
}

export async function envoyerMessage(_etat, formData) {
  const id = String(formData.get("conversationId") ?? "");
  const { alias } = await exigerAccesSel(`/sel/messages/${id}`);
  const conversation = await conversationDe(id, alias.id);
  if (!conversation) return { erreur: "Conversation introuvable." };
  if (conversation.statut === "FERMEE") return { erreur: "Cette conversation est fermée." };
  const lu = lireTexte(formData);
  if (lu.erreur) return lu;
  if (!limiteMessages(alias.id)) return { erreur: "Vous envoyez beaucoup de messages. Patientez une minute." };

  // MSG-12 : si l'interlocuteur a quitté le SEL ou est suspendu, l'échange n'est plus possible
  const autreId = conversation.auteurId === alias.id ? conversation.interlocuteurId : conversation.auteurId;
  if (!(await prisma.alias.findFirst({ where: { id: autreId, ...filtreAuteurEnRegle() } }))) {
    return { erreur: "Votre interlocuteur n'est plus disponible dans le SEL pour le moment." };
  }

  const message = await prisma.message.create({ data: { conversationId: id, emetteurId: alias.id, texte: lu.texte } });
  await prisma.conversation.update({ where: { id }, data: { dernierMessageLe: message.createdAt } });
  await notifierMessage({ conversationId: id, destinataireId: autreId, messageId: message.id });
  revalidatePath(`/sel/messages/${id}`);
  return { ok: true, envoye: message.id };
}

// Section 6.5 : chacun clique pour révéler son identité ; elle n'est montrée que lorsque les deux ont accepté.
export async function revelerIdentite(_etat, formData) {
  const id = String(formData.get("conversationId") ?? "");
  const { alias } = await exigerAccesSel(`/sel/messages/${id}`);
  const conversation = await conversationDe(id, alias.id);
  if (!conversation) return { erreur: "Conversation introuvable." };
  if (formData.get("confirmation") !== "on") return { erreur: "Cochez la case pour confirmer." };

  const champ = conversation.auteurId === alias.id ? "accordAuteurLe" : "accordInterlocuteurLe";
  if (conversation[champ]) return { ok: "Votre accord est déjà enregistré." };
  const maj = await prisma.conversation.update({ where: { id }, data: { [champ]: new Date() } });
  const complet = maj.accordAuteurLe && maj.accordInterlocuteurLe;
  // 6.7 : chaque levée d'anonymat est journalisée (qui, quand, champs révélés)
  await journaliser({
    action: complet ? "sel.anonymat_leve" : "sel.anonymat_accord",
    cibleType: "Conversation",
    cibleId: id,
    details: complet ? { champs: "prénom, nom, téléphone, commune" } : { alias: alias.code },
  });
  const autreId = conversation.auteurId === alias.id ? conversation.interlocuteurId : conversation.auteurId;
  if (!complet) await notifierEtape({ conversationId: id, destinataireId: autreId });
  revalidatePath(`/sel/messages/${id}`);
  return { ok: complet ? "Vos identités sont maintenant visibles l'un pour l'autre." : "Accord enregistré. L'identité de chacun sera visible quand votre interlocuteur aura accepté aussi." };
}

// MSG-7 : bloquer l'interlocuteur = fermer la conversation (plus aucun message possible, des deux côtés)
export async function fermerConversation(formData) {
  const id = String(formData.get("conversationId") ?? "");
  const { alias } = await exigerAccesSel(`/sel/messages/${id}`);
  const conversation = await conversationDe(id, alias.id);
  if (!conversation || conversation.statut === "FERMEE") return;
  await prisma.$transaction([
    prisma.conversation.update({ where: { id }, data: { statut: "FERMEE", fermeeParId: alias.id } }),
    prisma.echange.updateMany({
      where: { conversationId: id, statut: { in: ["PROPOSE", "CONFIRME"] } },
      data: { statut: "ANNULE", annulePar: alias.id, motifAnnulation: "Conversation fermée" },
    }),
  ]);
  await journaliser({ action: "sel.conversation_fermee", cibleType: "Conversation", cibleId: id });
  revalidatePath("/sel", "layout");
}
