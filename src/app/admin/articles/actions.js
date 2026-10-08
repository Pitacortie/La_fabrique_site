"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { journaliser } from "@/lib/audit";
import { exigerPublication } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugifier } from "@/lib/format";
import { enregistrerImage, supprimerImage } from "@/lib/medias";

const schemaArticle = z.object({
  titre: z.string().trim().min(3, "Le titre est obligatoire (3 caractères minimum).").max(150),
  categorie: z.string().trim().min(1, "La catégorie est obligatoire.").max(40),
  dateActivite: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La date de l'activité est obligatoire.")
    .transform((v) => new Date(`${v}T12:00:00`)),
  extrait: z.string().trim().max(300).transform((v) => v || null),
  contenu: z.string().trim().min(1, "Le texte de l'article est obligatoire.").max(20000),
});

async function slugUnique(titre, idActuel) {
  const base = slugifier(titre) || "article";
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const existant = await prisma.article.findUnique({ where: { slug } });
    if (!existant || existant.id === idActuel) return slug;
  }
}

// ACT-6 : brouillon, publication, retrait. Le bouton cliqué est transmis dans « intention ».
export async function enregistrerArticle(_etat, formData) {
  const admin = await exigerPublication();
  const donnees = schemaArticle.safeParse({
    titre: formData.get("titre") ?? "",
    categorie: formData.get("categorie") ?? "",
    dateActivite: formData.get("dateActivite") ?? "",
    extrait: formData.get("extrait") ?? "",
    contenu: String(formData.get("contenu") ?? "").replace(/\r\n/g, "\n"),
  });
  if (!donnees.success) return { erreur: donnees.error.issues[0].message };

  const id = formData.get("id") ? String(formData.get("id")) : null;
  const intention = String(formData.get("intention") ?? "brouillon");
  const existant = id ? await prisma.article.findUnique({ where: { id }, include: { medias: true } }) : null;
  if (id && !existant) return { erreur: "Article introuvable." };

  let statut = existant?.statut ?? "BROUILLON";
  if (intention === "publier") {
    // ACT-8 : pas de publication tant qu'une photo n'a pas l'autorisation de droit à l'image
    const sansAccord = existant?.medias.filter((m) => !m.autorisationPublication).length ?? 0;
    if (sansAccord) return { erreur: `${sansAccord} photo(s) sans autorisation de publication : cochez l'accord ou retirez-les.` };
    statut = "PUBLIE";
  } else if (intention === "retirer") {
    statut = "RETIRE";
  } else if (intention === "brouillon" && !existant) {
    statut = "BROUILLON";
  }

  const data = {
    ...donnees.data,
    slug: await slugUnique(donnees.data.titre, id),
    statut,
    publieLe: statut === "PUBLIE" ? (existant?.publieLe ?? new Date()) : existant?.publieLe ?? null,
  };

  const article = existant
    ? await prisma.article.update({ where: { id }, data })
    : await prisma.article.create({ data: { ...data, auteurId: admin.id } });

  const action = { publier: "article.publie", retirer: "article.retire" }[intention] ?? (existant ? "article.modifie" : "article.cree");
  await journaliser({ acteurId: admin.id, action, cibleType: "Article", cibleId: article.id, details: { titre: article.titre } });
  revalidatePath("/", "layout");

  if (!existant) redirect(`/admin/articles/${article.id}?cree=1`);
  return {
    ok: { publier: "Article publié : il est visible sur le site.", retirer: "Article retiré du site." }[intention] ?? "Modifications enregistrées.",
  };
}

export async function supprimerArticle(formData) {
  const admin = await exigerPublication();
  const id = String(formData.get("id"));
  const article = await prisma.article.findUnique({ where: { id }, include: { medias: true } });
  if (!article || article.statut === "PUBLIE") return; // un article publié se retire d'abord
  for (const m of article.medias) await supprimerImage(m.url);
  await prisma.media.deleteMany({ where: { articleId: id } });
  await prisma.article.delete({ where: { id } });
  await journaliser({ acteurId: admin.id, action: "article.supprime", cibleType: "Article", cibleId: id, details: { titre: article.titre } });
  revalidatePath("/", "layout");
  redirect("/admin/articles");
}

// ACT-5, ACT-8, ACT-9 : photo redimensionnée, texte alternatif obligatoire, accord de droit à l'image.
export async function ajouterPhoto(_etat, formData) {
  const admin = await exigerPublication();
  const articleId = String(formData.get("articleId"));
  const fichier = formData.get("fichier");
  const texteAlternatif = String(formData.get("texteAlternatif") ?? "").trim();

  if (!(fichier instanceof File) || fichier.size === 0) return { erreur: "Choisissez une image." };
  if (texteAlternatif.length < 5) return { erreur: "Le texte alternatif est obligatoire : décrivez la photo en quelques mots." };
  const article = await prisma.article.findUnique({ where: { id: articleId }, include: { _count: { select: { medias: true } } } });
  if (!article) return { erreur: "Article introuvable." };

  let url;
  try {
    url = await enregistrerImage(fichier, `articles/${articleId}`);
  } catch (e) {
    return { erreur: e.message || "Image illisible." };
  }

  const media = await prisma.media.create({
    data: {
      url,
      articleId,
      texteAlternatif: texteAlternatif.slice(0, 300),
      legende: String(formData.get("legende") ?? "").trim().slice(0, 300) || null,
      credit: String(formData.get("credit") ?? "").trim().slice(0, 100) || null,
      autorisationPublication: formData.get("autorisation") === "on",
      ordre: article._count.medias,
    },
  });
  await journaliser({ acteurId: admin.id, action: "media.ajoute", cibleType: "Media", cibleId: media.id, details: { articleId } });
  revalidatePath("/", "layout");
  return { ok: "Photo ajoutée." };
}

export async function basculerAutorisation(formData) {
  const admin = await exigerPublication();
  const id = String(formData.get("id"));
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return;
  await prisma.media.update({ where: { id }, data: { autorisationPublication: !media.autorisationPublication } });
  await journaliser({
    acteurId: admin.id,
    action: media.autorisationPublication ? "media.autorisation_retiree" : "media.autorisation_confirmee",
    cibleType: "Media",
    cibleId: id,
  });
  revalidatePath("/", "layout");
}

export async function supprimerPhoto(formData) {
  const admin = await exigerPublication();
  const id = String(formData.get("id"));
  const media = await prisma.media.delete({ where: { id } }).catch(() => null);
  if (!media) return;
  await supprimerImage(media.url);
  await journaliser({ acteurId: admin.id, action: "media.supprime", cibleType: "Media", cibleId: id, details: { articleId: media.articleId } });
  revalidatePath("/", "layout");
}
