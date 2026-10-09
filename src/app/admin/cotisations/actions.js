"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { journaliser } from "@/lib/audit";
import { exigerBureau } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { libellesModeReglement } from "@/lib/site";
import { anneeARenouveler, envoyerRappelsCotisation } from "@/lib/taches";

const date = (message) => z.string({ required_error: message }).regex(/^\d{4}-\d{2}-\d{2}$/, message).transform((v) => new Date(`${v}T00:00:00Z`));

const schema = z
  .object({
    membreId: z.string({ required_error: "Choisissez le membre." }).min(1, "Choisissez le membre."),
    montant: z.coerce.number({ invalid_type_error: "Montant invalide." }).min(1, "La cotisation est d'un euro minimum.").max(10000),
    modeReglement: z.enum(Object.keys(libellesModeReglement), { errorMap: () => ({ message: "Choisissez le mode de règlement." }) }),
    recueLe: date("Indiquez la date de réception."),
    valideJusquau: date("Indiquez la date de fin de validité."),
  })
  .refine((d) => d.valideJusquau > d.recueLe, { message: "La fin de validité doit être après la date de réception." });

// ADM-12 : renouvellement enregistré par un membre du Bureau (paiement reçu hors du site, RG-27).
export async function enregistrerCotisation(_etat, formData) {
  const bureau = await exigerBureau();
  const lu = schema.safeParse(Object.fromEntries(formData));
  if (!lu.success) return { erreur: lu.error.issues[0].message };
  const c = lu.data;
  const membre = await prisma.membre.findUnique({ where: { id: c.membreId } });
  if (!membre || membre.statut === "CLOTURE") return { erreur: "Membre introuvable ou compte clôturé." };

  await prisma.cotisation.create({
    data: { membreId: membre.id, montant: c.montant, modeReglement: c.modeReglement, recueLe: c.recueLe, valideJusquau: c.valideJusquau, saisieParId: bureau.id },
  });
  await journaliser({ acteurId: bureau.id, action: "cotisation.enregistree", cibleType: "Membre", cibleId: membre.id, details: { montant: c.montant, mode: c.modeReglement } });
  revalidatePath("/admin", "layout");
  return { ok: `Cotisation de ${membre.prenom} ${membre.nom} enregistrée.` };
}

// Envoi manuel des rappels (le même envoi a lieu chaque matin si la tâche quotidienne est configurée).
export async function lancerRappels() {
  const bureau = await exigerBureau();
  if (!anneeARenouveler()) return { erreur: "Les rappels ne partent qu'en période de renouvellement, du 1er décembre au 31 janvier." };
  const r = await envoyerRappelsCotisation();
  await journaliser({ acteurId: bureau.id, action: "cotisation.rappels_envoyes", cibleType: "Systeme", details: r });
  revalidatePath("/admin/cotisations");
  return { ok: `${r.envoyes} rappel(s) envoyé(s)${r.echecs ? `, ${r.echecs} échec(s)` : ""}. Un membre n'est relancé qu'une fois toutes les deux semaines.` };
}
