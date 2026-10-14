"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { alertesPossibles } from "@/lib/alertes";
import { journaliser } from "@/lib/audit";
import { exigerBureau } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Le Bureau choisit, personne par personne, les alertes e-mail reçues.
export async function enregistrerAlertes(formData) {
  const bureau = await exigerBureau();
  const membre = await prisma.membre.findUnique({ where: { id: String(formData.get("id") ?? "") } });
  if (!membre || !["BUREAU", "ADMINISTRATEUR"].includes(membre.role)) redirect("/admin/alertes");
  const alertes = alertesPossibles(membre.role).filter((type) => formData.get(type) === "on");
  await prisma.membre.update({ where: { id: membre.id }, data: { alertes } });
  await journaliser({ acteurId: bureau.id, action: "membre.alertes", cibleType: "Membre", cibleId: membre.id, details: { alertes } });
  revalidatePath("/admin/alertes");
  redirect(`/admin/alertes?enregistre=${membre.id}`);
}
