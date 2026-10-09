// Saisie des dates et heures au format français (jj/mm/aaaa, hh:mm), indépendamment de la langue du navigateur.
// Le serveur continue de recevoir le format technique (aaaa-mm-jj, hh:mm).

// Ajoute les « / » pendant la frappe : « 14051990 » -> « 14/05/1990 »
export function formaterSaisieDate(texte) {
  const chiffres = String(texte).replace(/\D/g, "").slice(0, 8);
  return [chiffres.slice(0, 2), chiffres.slice(2, 4), chiffres.slice(4, 8)].filter(Boolean).join("/");
}

// « 14/05/1990 » -> « 1990-05-14 », ou null si la date n'existe pas (31/02, 00/13…)
export function frVersIso(texte) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texte ?? "");
  if (!m) return null;
  const [, j, mo, a] = m.map(Number);
  const d = new Date(Date.UTC(a, mo - 1, j));
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== j || a < 1900) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// « 1990-05-14 » -> « 14/05/1990 »
export function isoVersFr(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

// Ajoute les « : » pendant la frappe : « 1430 » -> « 14:30 » (si la personne tape « 9:30 », on garde ses « : »)
export function formaterSaisieHeure(texte) {
  if (String(texte).includes(":")) return String(texte).replace(/[^\d:]/g, "").slice(0, 5);
  const chiffres = String(texte).replace(/\D/g, "").slice(0, 4);
  return chiffres.length > 2 ? `${chiffres.slice(0, 2)}:${chiffres.slice(2)}` : chiffres;
}

// « 9:05 » ou « 09:05 » -> « 09:05 », ou null si l'heure n'existe pas
export function heureValide(texte) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(texte ?? "");
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}
