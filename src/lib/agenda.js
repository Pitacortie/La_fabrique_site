import { prisma } from "@/lib/db";
import { dateHeureParis, partiesParis } from "@/lib/heure-paris";

// Un événement reste « à venir » jusqu'à sa fin (ou jusqu'à la fin de son jour s'il n'a pas d'heure de fin)
function filtreAVenir(maintenant = new Date()) {
  const debutDuJour = dateHeureParis(partiesParis(maintenant).jour, "00:00");
  return { OR: [{ fin: { gte: maintenant } }, { fin: null, debut: { gte: debutDuJour } }] };
}

// AGE-2 : liste chronologique des événements à venir
export const evenementsAVenir = () => prisma.evenement.findMany({ where: filtreAVenir(), orderBy: { debut: "asc" }, take: 200 });

// AGE-3 : vue calendrier d'un mois (« 2026-11 »)
export function evenementsDuMois(mois) {
  const [a, m] = mois.split("-").map(Number);
  const suivant = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
  return prisma.evenement.findMany({
    where: { debut: { gte: dateHeureParis(`${mois}-01`, "00:00"), lt: dateHeureParis(`${suivant}-01`, "00:00") } },
    orderBy: { debut: "asc" },
  });
}

export const moisValide = (v) => (/^\d{4}-(0[1-9]|1[0-2])$/.test(v ?? "") ? v : null);
export const moisCourant = () => partiesParis(new Date()).jour.slice(0, 7);

export function decalerMois(mois, n) {
  const [a, m] = mois.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Semaines du mois (lundi en premier) : tableaux de 7 jours « aaaa-mm-jj », null hors du mois
export function semainesDuMois(mois) {
  const [a, m] = mois.split("-").map(Number);
  const premier = new Date(Date.UTC(a, m - 1, 1));
  const nbJours = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const decalage = (premier.getUTCDay() + 6) % 7;
  const cases = [...Array(decalage).fill(null), ...Array.from({ length: nbJours }, (_, i) => `${mois}-${String(i + 1).padStart(2, "0")}`)];
  while (cases.length % 7) cases.push(null);
  return Array.from({ length: cases.length / 7 }, (_, i) => cases.slice(i * 7, i * 7 + 7));
}

export const nomDuMois = (mois) =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${mois}-01T12:00:00Z`));
