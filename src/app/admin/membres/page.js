import AdminListe from "@/components/AdminListe";

export default function Membres() {
  return (
    <AdminListe
      titre="Membres"
      description="Fiches des membres : catégorie, statut, rôle, droit à l'image. Toute consultation d'une identité est journalisée."
      colonnes={["Code", "Nom", "Catégorie", "Rôle", "Statut", "Cotisation jusqu'au", ""]}
      vide="Aucun membre pour l'instant."
      action="Exporter les membres votants"
    />
  );
}
