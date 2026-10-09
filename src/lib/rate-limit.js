// Limitation de débit en mémoire (CON-2, section 11.1). Suffisant pour une seule instance ;
// à remplacer par un stockage partagé si le site tourne un jour sur plusieurs serveurs.
const compteurs = new Map();

function lire(cle) {
  const entree = compteurs.get(cle);
  if (entree && entree.reinitLe < Date.now()) {
    compteurs.delete(cle);
    return null;
  }
  return entree ?? null;
}

// Compte une tentative et indique si elle est autorisée (formulaires : chaque envoi compte).
export function limiter(cle, { max, fenetreMs }) {
  const entree = lire(cle);
  if (!entree) {
    compteurs.set(cle, { nombre: 1, reinitLe: Date.now() + fenetreMs });
    return { autorise: true };
  }
  entree.nombre += 1;
  return { autorise: entree.nombre <= max, reinitLe: entree.reinitLe };
}

// Pour la connexion : on vérifie d'abord si la clé est bloquée, puis on ne compte que les échecs.
// Ainsi, se connecter souvent avec le bon mot de passe ne bloque jamais personne.
export function estBloque(cle, { max }) {
  const entree = lire(cle);
  return !!entree && entree.nombre >= max;
}

export function compterEchec(cle, { fenetreMs }) {
  const entree = lire(cle);
  if (entree) entree.nombre += 1;
  else compteurs.set(cle, { nombre: 1, reinitLe: Date.now() + fenetreMs });
}

export function reinitialiser(cle) {
  compteurs.delete(cle);
}
