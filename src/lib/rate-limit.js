// Limitation de débit en mémoire (CON-2, section 11.1). Suffisant pour une seule instance ;
// à remplacer par un stockage partagé si le site tourne un jour sur plusieurs serveurs.
const tentatives = new Map();

export function limiter(cle, { max, fenetreMs }) {
  const maintenant = Date.now();
  const entree = tentatives.get(cle);
  if (!entree || entree.reinitLe < maintenant) {
    tentatives.set(cle, { nombre: 1, reinitLe: maintenant + fenetreMs });
    return { autorise: true };
  }
  entree.nombre += 1;
  return { autorise: entree.nombre <= max, reinitLe: entree.reinitLe };
}

export function reinitialiser(cle) {
  tentatives.delete(cle);
}
