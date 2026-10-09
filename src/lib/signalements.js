// Les liens à usage unique (réinitialisation, activation…) contiennent un jeton secret dans l'adresse :
// on ne l'enregistre jamais dans un signalement.
const CHEMINS_SECRETS = [/^\/reinitialiser\/[^/?#]+/, /^\/activer\/[^/?#]+/, /^\/confirmer-email\/[^/?#]+/];

export function pageSansSecret(page) {
  let chemin = String(page || "/").split("#")[0];
  if (!chemin.startsWith("/")) chemin = "/";
  for (const motif of CHEMINS_SECRETS) {
    chemin = chemin.replace(motif, (m) => `${m.slice(0, m.indexOf("/", 1))}/[jeton]`);
  }
  return chemin.slice(0, 300);
}
