"use server";

import { revalidatePath } from "next/cache";
import { TEXTES_ADHESION } from "@/lib/adhesion";
import { journaliser } from "@/lib/audit";
import { exigerMembre } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { textesAAccepter } from "@/lib/textes";

// Section 6.7 : quand un texte change, l'acceptation de la nouvelle version est redemandée.
export async function accepterNouveauxTextes(_etat, formData) {
  const membre = await exigerMembre();
  const manquants = await textesAAccepter(membre.id, TEXTES_ADHESION);
  if (manquants.some((t) => formData.get(`accepte-${t.id}`) !== "on")) {
    return { erreur: "Cochez chaque case pour accepter les nouvelles versions." };
  }
  const maintenant = new Date();
  await prisma.acceptation.createMany({ data: manquants.map((t) => ({ texteId: t.id, membreId: membre.id, accepteLe: maintenant })) });
  await journaliser({
    acteurId: membre.id,
    action: "membre.textes_acceptes",
    cibleType: "Membre",
    cibleId: membre.id,
    details: Object.fromEntries(manquants.map((t) => [t.type, t.version])),
  });
  revalidatePath("/", "layout");
  return { ok: "Merci, c'est enregistré." };
}
