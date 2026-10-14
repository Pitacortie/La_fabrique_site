"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { journaliser } from "@/lib/audit";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { enregistrerPdf, supprimerImage } from "@/lib/medias";

// ADM-23, GAZ-1 à GAZ-5 : un administrateur publie les numéros de « La gazette de la Fabrique »
const schema = z.object({
  titre: z.string({ required_error: "Le titre est obligatoire." }).trim().min(3, "Le titre est obligatoire.").max(150),
  numero: z.coerce.number().int().min(1, "Numéro invalide.").max(9999).optional(),
  parution: z.string({ required_error: "Indiquez la date de parution." }).regex(/^\d{4}-\d{2}-\d{2}$/, "Indiquez la date de parution."),
  resume: z.string().trim().max(2000).optional(),
});

const fin = () => {
  revalidatePath("/gazette");
  revalidatePath("/admin/gazette");
};

export async function publierNumero(_etat, formData) {
  const admin = await exigerAdmin();
  const lu = schema.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string" && v.trim() !== "")));
  if (!lu.success) return { erreur: lu.error.issues[0].message };
  const pdf = formData.get("fichier");
  if (!(pdf instanceof File) || pdf.size === 0) return { erreur: "Joignez le numéro au format PDF." };
  let fichier;
  try {
    fichier = await enregistrerPdf(pdf, "gazette");
  } catch (e) {
    return { erreur: e.message };
  }
  const numero = await prisma.numeroGazette.create({
    data: { ...lu.data, numero: lu.data.numero ?? null, resume: lu.data.resume ?? null, parution: new Date(`${lu.data.parution}T00:00:00Z`), fichier, auteurId: admin.id },
  });
  await journaliser({ acteurId: admin.id, action: "gazette.publiee", cibleType: "NumeroGazette", cibleId: numero.id, details: { titre: numero.titre } });
  fin();
  return { ok: "Numéro publié." };
}

// Retirer un numéro du site (il reste en base) ou le republier
export async function basculerNumero(formData) {
  const admin = await exigerAdmin();
  const n = await prisma.numeroGazette.findUnique({ where: { id: String(formData.get("id") ?? "") } });
  if (!n) return;
  await prisma.numeroGazette.update({ where: { id: n.id }, data: { publie: !n.publie } });
  await journaliser({ acteurId: admin.id, action: n.publie ? "gazette.retiree" : "gazette.republiee", cibleType: "NumeroGazette", cibleId: n.id });
  fin();
}

export async function supprimerNumero(formData) {
  const admin = await exigerAdmin();
  const n = await prisma.numeroGazette.findUnique({ where: { id: String(formData.get("id") ?? "") } });
  if (!n) return;
  await prisma.numeroGazette.delete({ where: { id: n.id } });
  if (n.fichier) await supprimerImage(n.fichier);
  await journaliser({ acteurId: admin.id, action: "gazette.supprimee", cibleType: "NumeroGazette", cibleId: n.id, details: { titre: n.titre } });
  fin();
}
