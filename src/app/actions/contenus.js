"use server";

import { revalidatePath } from "next/cache";
import { journaliser } from "@/lib/audit";
import { exigerAdmin } from "@/lib/auth";
import { BLOCS } from "@/lib/contenus";
import { prisma } from "@/lib/db";

// Enregistre un bloc de texte modifié directement sur la page (crayon ✏️).
export async function enregistrerContenu(_etat, formData) {
  const admin = await exigerAdmin();
  const cle = String(formData.get("cle") ?? "");
  const bloc = BLOCS.find((b) => b.cle === cle);
  if (!bloc) return { erreur: "Bloc inconnu." };

  const contenu = String(formData.get("contenu") ?? "").replace(/\r\n/g, "\n").trim();
  if (!contenu) return { erreur: "Le texte ne peut pas être vide." };
  if (contenu.length > 5000) return { erreur: "Texte trop long (5 000 caractères maximum)." };
  if (bloc.url && !/^https:\/\/[^\s<>"]+$/.test(contenu)) {
    return { erreur: "Indiquez une adresse complète commençant par https://" };
  }

  await prisma.contenuEditorial.upsert({
    where: { cle },
    update: { contenu, modifieParId: admin.id },
    create: { cle, titre: bloc.libelle, contenu, modifieParId: admin.id },
  });
  // ADM-18 : l'auteur de chaque modification de contenu éditorial est tracé
  await journaliser({ acteurId: admin.id, action: "contenu.modifie", cibleType: "ContenuEditorial", cibleId: cle });
  revalidatePath("/", "layout");
  return { ok: "Texte enregistré.", le: Date.now() }; // « le » : un nouvel état à chaque enregistrement
}

// Revient au texte d'origine (supprime la version modifiée).
export async function retablirContenu(_etat, formData) {
  const admin = await exigerAdmin();
  const cle = String(formData.get("cle") ?? "");
  if (!BLOCS.some((b) => b.cle === cle)) return { erreur: "Bloc inconnu." };
  await prisma.contenuEditorial.deleteMany({ where: { cle } });
  await journaliser({ acteurId: admin.id, action: "contenu.retabli", cibleType: "ContenuEditorial", cibleId: cle });
  revalidatePath("/", "layout");
  return { ok: "Texte d'origine rétabli.", le: Date.now() };
}
