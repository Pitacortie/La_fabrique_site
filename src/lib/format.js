const dateLongue = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function formatDate(date) {
  return dateLongue.format(new Date(date));
}

// ACT-4 : une activité à venir passe en « passée » le lendemain de sa date, sans intervention.
export function estAVenir(dateActivite, maintenant = new Date()) {
  if (dateActivite == null) return false;
  const debutDuJour = new Date(maintenant);
  debutDuJour.setHours(0, 0, 0, 0);
  return new Date(dateActivite) >= debutDuJour;
}

// « Fête du jardin 2026 ! » -> « fete-du-jardin-2026 »
export function slugifier(texte) {
  return texte
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Valeur pour un <input type="date"> (AAAA-MM-JJ)
export function versChampDate(date) {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}
