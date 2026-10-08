"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { journaliser } from "@/lib/audit";
import { exigerAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const TYPES = ["STATUTS", "REGLEMENT_INTERIEUR", "CHARTE_NEUTRALITE", "BULLETIN_ADHESION", "CHARTE_SEL", "REGLEMENT_SEL"];

const schema = z.object({
  type: z.enum(TYPES),
  titre: z.string().trim().min(3, "Le titre est obligatoire.").max(150),
  version: z.string().trim().min(1, "Le numéro de version est obligatoire.").max(30),
  enVigueurLe: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La date d'entrée en vigueur est obligatoire.")
    .transform((v) => new Date(`${v}T00:00:00`)),
  contenu: z.string().trim().min(20, "Collez le texte complet (20 caractères minimum).").max(100000),
});

// Statuts, règlement et chartes : modification sensible réservée au Bureau (statuts, art. 19 ; ADM-17).
async function exigerBureau() {
  const admin = await exigerAdmin();
  if (admin.role !== "BUREAU") return { admin, refus: "Seul un membre du Bureau peut modifier les textes officiels." };
  return { admin };
}

function lire(formData) {
  return schema.safeParse({
    type: formData.get("type"),
    titre: formData.get("titre") ?? "",
    version: formData.get("version") ?? "",
    enVigueurLe: formData.get("enVigueurLe") ?? "",
    contenu: String(formData.get("contenu") ?? "").replace(/\r\n/g, "\n"),
  });
}

// ADM-11 : chaque nouvelle version est conservée ; les acceptations restent liées à leur version.
export async function publierVersion(_etat, formData) {
  const { admin, refus } = await exigerBureau();
  if (refus) return { erreur: refus };
  const donnees = lire(formData);
  if (!donnees.success) return { erreur: donnees.error.issues[0].message };

  const doublon = await prisma.texteJuridique.findUnique({
    where: { type_version: { type: donnees.data.type, version: donnees.data.version } },
  });
  if (doublon) return { erreur: `La version « ${donnees.data.version} » existe déjà pour ce texte.` };

  const texte = await prisma.texteJuridique.create({ data: donnees.data });
  await journaliser({
    acteurId: admin.id,
    action: "texte.version_publiee",
    cibleType: "TexteJuridique",
    cibleId: texte.id,
    details: { type: texte.type, version: texte.version },
  });
  revalidatePath("/", "layout");
  return { ok: `Version ${texte.version} publiée.`, reinitialiser: true };
}

// Correction d'une version que personne n'a encore acceptée (ex. remplacer le texte provisoire).
export async function corrigerVersion(_etat, formData) {
  const { admin, refus } = await exigerBureau();
  if (refus) return { erreur: refus };
  const id = String(formData.get("id"));
  const texte = await prisma.texteJuridique.findUnique({ where: { id }, include: { _count: { select: { acceptations: true } } } });
  if (!texte) return { erreur: "Texte introuvable." };
  if (texte._count.acceptations > 0) {
    return { erreur: "Cette version a déjà été acceptée par des membres : publiez une nouvelle version." };
  }
  const donnees = lire({ get: (k) => (k === "type" ? texte.type : formData.get(k)) });
  if (!donnees.success) return { erreur: donnees.error.issues[0].message };

  await prisma.texteJuridique.update({ where: { id }, data: donnees.data });
  await journaliser({
    acteurId: admin.id,
    action: "texte.version_corrigee",
    cibleType: "TexteJuridique",
    cibleId: id,
    details: { type: texte.type, version: donnees.data.version },
  });
  revalidatePath("/", "layout");
  return { ok: "Version corrigée." };
}
