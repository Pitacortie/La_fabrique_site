import AdminListe from "@/components/AdminListe";

export default function Cotisations() {
  return (
    <AdminListe
      titre="Cotisations"
      description="Tableau des échéances. Sans renouvellement au 31 janvier, le compte est clôturé."
      colonnes={["Membre", "Montant", "Mode", "Reçue le", "Valide jusqu'au", "Saisie par"]}
      vide="Aucune cotisation enregistrée."
      refs="ADH-9, ADH-10, ADM-12, ADM-15"
    />
  );
}
