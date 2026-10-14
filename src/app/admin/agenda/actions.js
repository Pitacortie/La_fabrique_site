"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { journaliser } from "@/lib/audit";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateHeureParis } from "@/lib/heure-paris";

const texte = (m) => z.string({ required_error: m }).trim();

// ADM-22, AGE-1 : titre, date et heure, lieu (et une description facultative)
const schema = z.object({
  titre: texte("Le titre est obligatoire.").min(3, "Le titre est obligatoire.").max(120),
  jour: texte("Indiquez la date.").regex(/^\d{4}-\d{2}-\d{2}$/, "Indiquez la date."),
  heure: texte("Indiquez l'heure de début.").regex(/^\d{2}:\d{2}$/, "Indiquez l'heure de début."),
  heureFin: z.string().regex(/^\d{2}:\d{2}$/, "Heure de fin invalide.").optional(),
  lieu: texte("Indiquez le lieu.").min(2, "Indiquez le lieu.").max(200),
  description: z.string().trim().max(3000).optional(),
});

export async function enregistrerEvenement(_etat, formData) {
  const admin = await exigerAdmin();
  const lu = schema.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string" && v.trim() !== "")));
  if (!lu.success) return { erreur: lu.error.issues[0].message };
  const d = lu.data;
  const debut = dateHeureParis(d.jour, d.heure);
  const fin = d.heureFin ? dateHeureParis(d.jour, d.heureFin) : null;
  if (!debut) return { erreur: "Date ou heure invalide." };
  if (fin && fin <= debut) return { erreur: "L'heure de fin doit être après l'heure de début." };

  const id = formData.get("id") ? String(formData.get("id")) : null;
  const data = { titre: d.titre, debut, fin, lieu: d.lieu, description: d.description ?? null };
  const evenement = id
    ? await prisma.evenement.update({ where: { id }, data })
    : await prisma.evenement.create({ data: { ...data, auteurId: admin.id } });
  await journaliser({ acteurId: admin.id, action: id ? "agenda.modifie" : "agenda.cree", cibleType: "Evenement", cibleId: evenement.id, details: { titre: d.titre } });
  revalidatePath("/agenda");
  revalidatePath("/admin/agenda", "layout");
  if (id) return { ok: "Événement enregistré." };
  redirect("/admin/agenda?cree=1");
}

export async function supprimerEvenement(formData) {
  const admin = await exigerAdmin();
  const id = String(formData.get("id") ?? "");
  const e = await prisma.evenement.findUnique({ where: { id } });
  if (!e) redirect("/admin/agenda");
  await prisma.evenement.delete({ where: { id } });
  await journaliser({ acteurId: admin.id, action: "agenda.supprime", cibleType: "Evenement", cibleId: id, details: { titre: e.titre } });
  revalidatePath("/agenda");
  redirect("/admin/agenda");
}
