import { TEXTES_ADHESION } from "@/lib/adhesion";
import { formatDate } from "@/lib/format";
import { textesAAccepter } from "@/lib/textes";

// Textes à faire accepter au membre avant de lui ouvrir son espace ou la console (section 6.7),
// sous une forme transmissible à un composant client.
export async function textesEnAttente(membreId) {
  const manquants = await textesAAccepter(membreId, TEXTES_ADHESION);
  return manquants.map((t) => ({ id: t.id, titre: t.titre, version: t.version, contenu: t.contenu, enVigueurLe: formatDate(t.enVigueurLe) }));
}
