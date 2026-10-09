// Les rendez-vous sont saisis en heure de Ménesplet, quel que soit le fuseau du serveur (Render tourne en UTC).
const FUSEAU = "Europe/Paris";

// Décalage (en minutes) de l'heure de Paris par rapport à UTC à un instant donné (60 en hiver, 120 en été).
function decalageParis(date) {
  const texte = date.toLocaleString("en-US", { timeZone: FUSEAU, timeZoneName: "shortOffset" });
  const m = /GMT([+-]\d{1,2})(?::(\d{2}))?/.exec(texte);
  if (!m) return 0;
  const heures = Number(m[1]);
  return heures * 60 + Math.sign(heures) * Number(m[2] ?? 0);
}

// « 2026-11-14 » + « 14:30 » (heure de Paris) -> instant UTC correspondant
export function dateHeureParis(jour, heure) {
  const commeUtc = new Date(`${jour}T${heure}:00Z`);
  if (Number.isNaN(commeUtc.getTime())) return null;
  return new Date(commeUtc.getTime() - decalageParis(commeUtc) * 60_000);
}

const formateur = new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
export const formatCreneau = (date) => formateur.format(new Date(date));

const court = new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU, dateStyle: "short", timeStyle: "short" });
export const formatHorodatage = (date) => court.format(new Date(date));
