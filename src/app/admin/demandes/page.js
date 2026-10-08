import AdminListe from "@/components/AdminListe";

export default function Demandes() {
  return (
    <AdminListe
      titre="Demandes d'adhésion"
      description="Valider une demande enregistre la cotisation reçue et crée le compte, le code et le lien d'activation en une seule opération. Un refus envoie le motif au postulant."
      colonnes={["Reçue le", "Nom", "Commune", "Mineur", "Montant annoncé", "Mode", "Statut", ""]}
      vide="Aucune demande en attente."
      refs="ADH-4, ADH-5, ADH-13, ADM-1, ADM-12, RG-27"
    />
  );
}
