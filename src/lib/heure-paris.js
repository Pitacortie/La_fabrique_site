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

// Instant -> { jour: « 2026-11-14 », heure: « 14:30 » } en heure de Ménesplet (champs de formulaire, calendrier)
const parties = new Intl.DateTimeFormat("en-CA", { timeZone: FUSEAU, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export function partiesParis(date) {
  const p = Object.fromEntries(parties.formatToParts(new Date(date)).map((x) => [x.type, x.value]));
  return { jour: `${p.year}-${p.month}-${p.day}`, heure: `${p.hour}:${p.minute}` };
}

const heureSeule = new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU, hour: "2-digit", minute: "2-digit" });
export const formatHeure = (date) => heureSeule.format(new Date(date));
