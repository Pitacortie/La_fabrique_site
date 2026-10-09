"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { journaliser } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { limiter } from "@/lib/rate-limit";
import { exigerAccesSel } from "@/lib/sel/acces";
import { VALEUR_MAX_BRIQUES, libellesMotifSignalement } from "@/lib/sel/regles";

const message = (m) => ({ required_error: m, invalid_type_error: m });
const entier = (m) => z.coerce.number(message(m)).int(m);

// SEL-5 : contenu d'une annonce. RG-12 : rubrique et nature obligatoires.
const schema = z
  .object({
    type: z.enum(["OFFRE", "DEMANDE"], { errorMap: () => ({ message: "Choisissez : je propose ou je demande." }) }),
    nature: z.enum(["SERVICE", "PRET", "DON", "OBJET"], { errorMap: () => ({ message: "Choisissez la nature de l'annonce." }) }),
    rubriqueId: z.string(message("Choisissez une catégorie.")).min(1, "Choisissez une catégorie."),
    titre: z.string(message("Le titre est obligatoire.")).trim().min(5, "Le titre est trop court (5 caractères minimum).").max(100),
    description: z.string(message("La description est obligatoire.")).trim().min(20, "Décrivez votre annonce en quelques phrases (20 caractères minimum).").max(3000),
    dureeHeures: entier("Durée invalide.").min(0).max(24).optional(),
    dureeMinutes: entier("Durée invalide.").min(0).max(59).optional(),
    valeurBriques: entier("Valeur invalide.").min(0, "La valeur ne peut pas être négative.").max(VALEUR_MAX_BRIQUES).optional(),
    zone: z.string(message("Indiquez la commune ou le secteur.")).trim().min(2, "Indiquez la commune ou le secteur.").max(60),
    modalite: z.enum(["PRESENTIEL", "DISTANCE"], { errorMap: () => ({ message: "Indiquez si l'échange peut se faire à distance." }) }),
    disponibilites: z.string().trim().max(300).optional(),
    dateFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de fin invalide.").optional(),
    motsCles: z.string().trim().max(200).optional(),
  })
  .refine((d) => d.nature !== "OBJET" || d.valeurBriques != null, { message: "Indiquez la valeur de l'objet en briques." })
  .refine((d) => !d.dateFin || new Date(`${d.dateFin}T23:59:59`) >= new Date(), { message: "La date de fin est déjà passée." });

// Section 6.6 : une adresse précise identifierait la personne. On refuse ce qui ressemble à un numéro de rue,
// un téléphone ou une adresse e-mail dans les champs publics.
const RISQUES = [
  { motif: /\b\d{1,4}\s*(bis|ter)?\s*,?\s*(rue|avenue|av\.|chemin|impasse|allée|route|place|boulevard|bd|lieu-dit)\b/i, texte: "une adresse" },
  { motif: /(\+33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/, texte: "un numéro de téléphone" },
  { motif: /[\w.+-]+@[\w-]+\.[\w.]+/, texte: "une adresse e-mail" },
];
function donneesPersonnelles(...textes) {
  const tout = textes.filter(Boolean).join(" ");
  return RISQUES.find((r) => r.motif.test(tout))?.texte;
}

function lire(formData) {
  const brut = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string" && v.trim() !== ""));
  return schema.safeParse(brut);
}

function donneesAnnonce(d) {
  const minutes = (d.dureeHeures ?? 0) * 60 + (d.dureeMinutes ?? 0);
  return {
    type: d.type,
    nature: d.nature,
    rubriqueId: d.rubriqueId,
    titre: d.titre,
    description: d.description,
    dureeEstimee: d.nature === "SERVICE" && minutes > 0 ? minutes : null,
    valeurBriques: d.nature === "OBJET" ? d.valeurBriques : null,
    zone: d.zone,
    modalite: d.modalite,
    disponibilites: d.disponibilites ?? null,
    dateFin: d.dateFin ? new Date(`${d.dateFin}T00:00:00Z`) : null,
    motsCles: d.motsCles ?? null,
  };
}

async function verifier(formData) {
  const lu = lire(formData);
  if (!lu.success) return { erreur: lu.error.issues[0].message };
  const risque = donneesPersonnelles(lu.data.titre, lu.data.description, lu.data.zone, lu.data.disponibilites, lu.data.motsCles);
  if (risque) {
    return { erreur: `Votre annonce semble contenir ${risque}. Pour protéger votre anonymat, ne l'indiquez pas : vous pourrez l'échanger plus tard, après la levée d'anonymat.` };
  }
  const rubrique = await prisma.rubriqueSel.findFirst({ where: { id: lu.data.rubriqueId, actif: true } });
  if (!rubrique) return { erreur: "Choisissez une catégorie." };
  return { donnees: donneesAnnonce(lu.data) };
}

export async function publierAnnonce(_etat, formData) {
  const { alias } = await exigerAccesSel("/sel/annonces/nouvelle");
  if (!limiter(`annonce:${alias.id}`, { max: 10, fenetreMs: 24 * 60 * 60 * 1000 }).autorise) {
    return { erreur: "Vous avez publié beaucoup d'annonces aujourd'hui. Réessayez demain." };
  }
  const v = await verifier(formData);
  if (v.erreur) return v;
  const annonce = await prisma.annonce.create({ data: { ...v.donnees, auteurId: alias.id } });
  revalidatePath("/sel", "layout");
  redirect(`/sel/annonces/${annonce.id}?publiee=1`);
}

async function annonceDeLAuteur(id, aliasId) {
  const annonce = await prisma.annonce.findUnique({ where: { id } });
  return annonce && annonce.auteurId === aliasId ? annonce : null;
}

export async function modifierAnnonce(_etat, formData) {
  const id = String(formData.get("id") ?? "");
  const { alias } = await exigerAccesSel(`/sel/annonces/${id}/modifier`);
  const annonce = await annonceDeLAuteur(id, alias.id);
  if (!annonce) return { erreur: "Annonce introuvable." };
  if (annonce.statut === "MASQUEE") return { erreur: "Cette annonce a été masquée par la modération." };
  const v = await verifier(formData);
  if (v.erreur) return v;
  await prisma.annonce.update({ where: { id }, data: v.donnees });
  revalidatePath("/sel", "layout");
  redirect(`/sel/annonces/${id}`);
}

// Clore (ne plus afficher) ou republier sa propre annonce
export async function changerStatutAnnonce(formData) {
  const id = String(formData.get("id") ?? "");
  const { alias } = await exigerAccesSel(`/sel/annonces/${id}`);
  const annonce = await annonceDeLAuteur(id, alias.id);
  if (!annonce || annonce.statut === "MASQUEE") return;
  const statut = formData.get("statut") === "PUBLIEE" ? "PUBLIEE" : "CLOTUREE";
  await prisma.annonce.update({ where: { id }, data: { statut } });
  revalidatePath("/sel", "layout");
}

// MSG-7, NEU-4 : signaler une annonce, un message ou une conversation à la modération
export async function signalerSel(_etat, formData) {
  const { alias } = await exigerAccesSel("/sel");
  if (!limiter(`signalement-sel:${alias.id}`, { max: 10, fenetreMs: 60 * 60 * 1000 }).autorise) {
    return { erreur: "Trop de signalements. Réessayez plus tard." };
  }
  const motif = String(formData.get("motif") ?? "");
  if (!libellesMotifSignalement[motif]) return { erreur: "Choisissez un motif." };
  const details = String(formData.get("details") ?? "").trim().slice(0, 1000) || null;
  const annonceId = formData.get("annonceId") ? String(formData.get("annonceId")) : null;
  const messageId = formData.get("messageId") ? String(formData.get("messageId")) : null;

  let conversationId = null;
  if (messageId) {
    // On ne peut signaler qu'un message d'une conversation dont on fait partie
    const message = await prisma.message.findUnique({ where: { id: messageId }, include: { conversation: true } });
    const c = message?.conversation;
    if (!c || (c.auteurId !== alias.id && c.interlocuteurId !== alias.id)) return { erreur: "Message introuvable." };
    conversationId = c.id;
  } else if (annonceId) {
    if (!(await prisma.annonce.findUnique({ where: { id: annonceId } }))) return { erreur: "Annonce introuvable." };
  } else {
    return { erreur: "Rien à signaler." };
  }

  const s = await prisma.signalementSel.create({ data: { signaleurId: alias.id, annonceId, messageId, conversationId, motif, details } });
  await journaliser({ action: "sel.signalement", cibleType: "SignalementSel", cibleId: s.id, details: { motif } });
  return { ok: "Merci, la modération va examiner votre signalement." };
}
