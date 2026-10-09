import { prisma } from "@/lib/db";

const aujourdhui = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// SEL-19 : les annonces d'un membre dont la cotisation ou l'attestation a expiré sont masquées automatiquement.
export function filtreAuteurEnRegle() {
  const jour = aujourdhui();
  return {
    membre: {
      statut: "ACTIF",
      inscriptionSel: { statut: "ACTIVE" },
      cotisations: { some: { valideJusquau: { gte: jour } } },
      attestationsRc: { some: { statut: "VALIDEE", valideJusquau: { gte: jour } } },
    },
  };
}

// Annonces visibles dans les bibliothèques (SEL-3, SEL-4, SEL-6) : publiées, non expirées, auteur en règle.
export function filtreAnnoncesVisibles() {
  return {
    statut: "PUBLIEE",
    OR: [{ dateFin: null }, { dateFin: { gte: aujourdhui() } }],
    auteur: filtreAuteurEnRegle(),
  };
}

// Seuls les champs publics : le code de l'auteur, jamais son identité (RG-3).
export const selectAnnonce = {
  id: true,
  type: true,
  nature: true,
  titre: true,
  description: true,
  dureeEstimee: true,
  valeurBriques: true,
  zone: true,
  modalite: true,
  disponibilites: true,
  dateFin: true,
  motsCles: true,
  statut: true,
  createdAt: true,
  auteurId: true,
  auteur: { select: { code: true } },
  rubrique: { select: { id: true, code: true, libelle: true, rappel: true } },
};

export function listerAnnonces({ type, q, rubrique, nature, modalite, zone }) {
  const recherche = q?.trim().slice(0, 100);
  const et = [filtreAnnoncesVisibles(), { type }];
  if (rubrique) et.push({ rubrique: { code: rubrique } });
  if (nature) et.push({ nature });
  if (modalite) et.push({ modalite });
  if (zone?.trim()) et.push({ zone: { contains: zone.trim().slice(0, 60), mode: "insensitive" } });
  if (recherche) {
    // Chaque mot doit apparaître dans le titre, la description, les mots-clés, la zone ou la rubrique
    for (const mot of recherche.split(/\s+/).slice(0, 6)) {
      et.push({
        OR: [
          { titre: { contains: mot, mode: "insensitive" } },
          { description: { contains: mot, mode: "insensitive" } },
          { motsCles: { contains: mot, mode: "insensitive" } },
          { zone: { contains: mot, mode: "insensitive" } },
          { rubrique: { libelle: { contains: mot, mode: "insensitive" } } },
        ],
      });
    }
  }
  return prisma.annonce.findMany({ where: { AND: et }, select: selectAnnonce, orderBy: { createdAt: "desc" }, take: 60 });
}

export const rubriquesActives = () => prisma.rubriqueSel.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } });

// Conversations dont l'alias fait partie (MSG-11 : seuls les deux alias y accèdent)
export const filtreMesConversations = (aliasId) => ({ OR: [{ auteurId: aliasId }, { interlocuteurId: aliasId }] });

// Pastilles de la navigation : messages non lus, échanges qui attendent mon action
export async function compteursSel(aliasId) {
  const [nonLus, aConfirmer, aDeclarer, aValider] = await Promise.all([
    prisma.message.count({ where: { luLe: null, emetteurId: { not: aliasId }, conversation: filtreMesConversations(aliasId) } }),
    prisma.echange.count({ where: { statut: "PROPOSE", prestataireId: aliasId } }),
    prisma.echange.count({ where: { statut: "CONFIRME", prestataireId: aliasId, creneau: { lte: new Date() } } }),
    prisma.echange.count({ where: { statut: "DECLARE", beneficiaireId: aliasId } }),
  ]);
  return { nonLus, actions: aConfirmer + aDeclarer + aValider };
}
