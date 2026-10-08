import { prisma } from "@/lib/db";

// Articles visibles par le public : publiés uniquement, avec leurs photos autorisées (ACT-8).
const inclureMedias = {
  medias: { where: { autorisationPublication: true }, orderBy: { ordre: "asc" } },
};

export function getArticlesPublies({ take, categorie } = {}) {
  return prisma.article
    .findMany({
      where: { statut: "PUBLIE", ...(categorie ? { categorie } : {}) },
      orderBy: { publieLe: "desc" },
      include: inclureMedias,
      take,
    })
    .catch(() => []);
}

export function getArticlePublie(slug) {
  return prisma.article.findFirst({ where: { slug, statut: "PUBLIE" }, include: inclureMedias }).catch(() => null);
}

export async function getCategoriesPubliees() {
  const lignes = await prisma.article
    .findMany({ where: { statut: "PUBLIE" }, select: { categorie: true }, distinct: ["categorie"], orderBy: { categorie: "asc" } })
    .catch(() => []);
  return lignes.map((l) => l.categorie);
}

export function getFabricationsVisibles() {
  return prisma.fabrication.findMany({ where: { visible: true }, orderBy: [{ ordre: "asc" }, { nom: "asc" }] }).catch(() => []);
}

// Mode édition : tous les services, y compris masqués.
export function getToutesFabrications() {
  return prisma.fabrication.findMany({ orderBy: [{ ordre: "asc" }, { nom: "asc" }] }).catch(() => []);
}
