import AdminListe from "@/components/AdminListe";

export default function Messages() {
  return (
    <AdminListe
      titre="Messages reçus"
      description="Messages envoyés depuis la page Contacts, y compris les propositions « Vos attentes, vos projets »."
      colonnes={["Reçu le", "Expéditeur", "Objet", "Statut"]}
      vide="Aucun message."
      refs="CTC-1, CTC-5, ADM-4"
    />
  );
}
