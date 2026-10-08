import { prisma } from "@/lib/db";

// Version en vigueur de chaque texte : la plus récente dont la date d'entrée en vigueur est passée.
export async function getTextesEnVigueur(types) {
  const textes = await prisma.texteJuridique
    .findMany({
      where: { type: { in: types }, enVigueurLe: { lte: new Date() } },
      orderBy: [{ enVigueurLe: "desc" }, { createdAt: "desc" }],
    })
    .catch(() => []);
  const resultat = {};
  for (const t of textes) resultat[t.type] ??= t;
  return resultat;
}
