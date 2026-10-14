import { prisma } from "@/lib/db";

// Compte d'urgence et de solidarité (SEL-25, RG-29) : en briques uniquement. Il n'a pas d'alias : dans le grand livre,
// un mouvement crédité à « null » l'alimente (dons, soldes des comptes clôturés), un mouvement débité de « null » le fait
// servir (aide décidée par un administrateur).
export async function soldeSolidarite(client = prisma) {
  const [entrees, sorties] = await Promise.all([
    client.transactionBriques.aggregate({ _sum: { montant: true }, where: { crediteId: null } }),
    client.transactionBriques.aggregate({ _sum: { montant: true }, where: { debiteId: null } }),
  ]);
  return (entrees._sum.montant ?? 0) - (sorties._sum.montant ?? 0);
}

export const mouvementsSolidarite = (take = 100) =>
  prisma.transactionBriques.findMany({
    where: { OR: [{ crediteId: null }, { debiteId: null }] },
    orderBy: { createdAt: "desc" },
    take,
    include: { debite: { select: { code: true } }, credite: { select: { code: true } } },
  });
