"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { journaliser } from "@/lib/audit";
import { exigerAdmin, getMembreConnecte } from "@/lib/auth";
import { getContenus } from "@/lib/contenus";
import { prisma } from "@/lib/db";
import { envoyerEmail, urlDuSite } from "@/lib/email";
import { limiter } from "@/lib/rate-limit";
import { ipClient } from "@/lib/requete";
import { pageSansSecret } from "@/lib/signalements";

const schema = z.object({
  description: z.string().trim().min(10, "Décrivez le problème en quelques mots (10 caractères minimum).").max(3000),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => !v || z.string().email().safeParse(v).success, "Adresse e-mail invalide.")
    .transform((v) => v || null),
  page: z.string().max(500),
  ecran: z.string().max(30).optional(),
});

export async function signalerBug(_etat, formData) {
  // Champ piège invisible : seul un robot le remplit
  if (formData.get("site_web")) return { ok: "Merci, votre signalement a bien été envoyé." };

  if (!limiter(`bug:${await ipClient()}`, { max: 5, fenetreMs: 60 * 60 * 1000 }).autorise) {
    return { erreur: "Vous avez envoyé plusieurs signalements récemment. Réessayez dans une heure." };
  }
  const donnees = schema.safeParse({
    description: formData.get("description") ?? "",
    email: formData.get("email") ?? "",
    page: String(formData.get("page") ?? "/"),
    ecran: formData.get("ecran") || undefined,
  });
  if (!donnees.success) return { erreur: donnees.error.issues[0].message };

  const membre = await getMembreConnecte();
  const signalement = await prisma.signalementBug.create({
    data: {
      description: donnees.data.description,
      page: pageSansSecret(donnees.data.page),
      ecran: donnees.data.ecran,
      navigateur: (await headers()).get("user-agent")?.slice(0, 300) ?? null,
      email: membre ? membre.email : donnees.data.email,
      membreId: membre?.id ?? null,
    },
  });

  // Prévient l'association (adresse de contact du site). En développement, le courriel s'affiche dans le terminal.
  const { "site.email": contact } = await getContenus(["site.email"]);
  const lien = `${await urlDuSite()}/admin/signalements`;
  await envoyerEmail({
    a: contact,
    sujet: `Bug signalé sur ${signalement.page}`,
    texte: `Un bug a été signalé sur le site.\n\nPage : ${signalement.page}\nPar : ${signalement.email ?? "visiteur anonyme"}\n\n${signalement.description}\n\nTous les signalements : ${lien}`,
  }).catch((e) => console.error("Courriel de signalement non envoyé :", e.message));

  return { ok: "Merci, votre signalement a bien été envoyé." };
}

const STATUTS = ["NOUVEAU", "EN_COURS", "RESOLU", "IGNORE"];

export async function traiterSignalement(formData) {
  const admin = await exigerAdmin();
  const id = String(formData.get("id"));
  const statut = String(formData.get("statut"));
  if (!STATUTS.includes(statut)) return;
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000) || null;
  await prisma.signalementBug.update({ where: { id }, data: { statut, note } });
  await journaliser({ acteurId: admin.id, action: "signalement.traite", cibleType: "SignalementBug", cibleId: id, details: { statut } });
  revalidatePath("/admin/signalements");
}
