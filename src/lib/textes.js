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

// Textes en vigueur que le membre n'a pas encore acceptés dans leur version actuelle (section 6.7 :
// « si le texte change, le consentement est redemandé à la connexion suivante »).
export async function textesAAccepter(membreId, types) {
  const enVigueur = Object.values(await getTextesEnVigueur(types));
  if (!enVigueur.length) return [];
  const acceptes = await prisma.acceptation.findMany({
    where: { membreId, texteId: { in: enVigueur.map((t) => t.id) } },
    select: { texteId: true },
  });
  const ids = new Set(acceptes.map((a) => a.texteId));
  return enVigueur.filter((t) => !ids.has(t.id));
}
