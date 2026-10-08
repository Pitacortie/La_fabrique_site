"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { journaliser } from "@/lib/audit";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const COULEURS =["bleu", "terracotta", "vert", "ocre"];

const schema = z.object({
  nom: z.string().trim().min(1, "Le nom est obligatoire.").max(80),
  description: z.string().trim().min(1, "La description est obligatoire.").max(600),
  etat: z.string().trim().min(1, "L'état est obligatoire.").max(40),
  couleur: z.enum(COULEURS),
  // Lien interne (« /sel ») ou adresse web complète
  lien: z
    .string()
    .trim()
    .max(300)
    .refine((v) => !v || v.startsWith("/") || /^https?:\/\//.test(v), "Le lien doit commencer par / ou https://")
    .transform((v) => v || null),
  ordre: z.coerce.number().int().min(0).max(999),
  visible: z.boolean(),
});

function lire(formData) {
  return schema.safeParse({
    nom: formData.get("nom") ?? "",
    description: formData.get("description") ?? "",
    etat: formData.get("etat") ?? "",
    couleur: formData.get("couleur") ?? "bleu",
    lien: formData.get("lien") ?? "",
    ordre: formData.get("ordre") ?? 0,
    visible: formData.get("visible") === "on",
  });
}

export async function enregistrerFabrication(_etat, formData) {
  const admin = await exigerAdmin();
  const donnees = lire(formData);
  if (!donnees.success) return { erreur: donnees.error.issues[0].message };

  const id = formData.get("id");
  const fabrication = id
    ? await prisma.fabrication.update({ where: { id: String(id) }, data: donnees.data })
    : await prisma.fabrication.create({ data: donnees.data });

  await journaliser({
    acteurId: admin.id,
    action: id ? "fabrication.modifiee" : "fabrication.creee",
    cibleType: "Fabrication",
    cibleId: fabrication.id,
    details: { nom: fabrication.nom },
  });
  revalidatePath("/", "layout");
  return { ok: id ? "Service enregistré." : "Service ajouté.", cree: !id };
}

export async function supprimerFabrication(formData) {
  const admin = await exigerAdmin();
  const id = String(formData.get("id"));
  const fabrication = await prisma.fabrication.delete({ where: { id } });
  await journaliser({
    acteurId: admin.id,
    action: "fabrication.supprimee",
    cibleType: "Fabrication",
    cibleId: id,
    details: { nom: fabrication.nom },
  });
  revalidatePath("/", "layout");
}
