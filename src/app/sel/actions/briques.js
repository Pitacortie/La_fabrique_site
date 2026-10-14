"use server";

import { revalidatePath } from "next/cache";
import { journaliser } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { exigerAccesSel } from "@/lib/sel/acces";

// SEL-25 : un membre donne des briques au compte d'urgence et de solidarité
export async function donnerBriques(_etat, formData) {
  const { alias } = await exigerAccesSel("/sel/briques");
  const montant = Number(formData.get("montant"));
  if (!Number.isInteger(montant) || montant < 1) return { erreur: "Indiquez un nombre de briques (1 minimum)." };
  try {
    await prisma.$transaction(async (tx) => {
      // On ne donne que des briques que l'on a : le don ne peut pas rendre le solde négatif
      const { count } = await tx.alias.updateMany({
        where: { id: alias.id, soldeBriques: { gte: montant } },
        data: { soldeBriques: { decrement: montant } },
      });
      if (count !== 1) throw new Error("Votre solde ne permet pas ce don.");
      await tx.transactionBriques.create({ data: { montant, debiteId: alias.id, crediteId: null, libelle: "Don au compte de solidarité" } });
    });
  } catch (e) {
    return { erreur: e.message };
  }
  await journaliser({ action: "sel.don_solidarite", cibleType: "Alias", cibleId: alias.id, details: { montant } });
  revalidatePath("/sel", "layout");
  return { ok: `Merci ! ${montant} brique${montant > 1 ? "s" : ""} versée${montant > 1 ? "s" : ""} au compte de solidarité.` };
}
