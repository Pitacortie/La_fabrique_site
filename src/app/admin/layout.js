import Shell from "@/components/Shell";
import { exigerAdmin } from "@/lib/auth";

export const metadata = { title: "Console d'administration", robots: { index: false, follow: false } };

const items = [
  { href: "/admin", label: "Tableau de bord" },
  { groupe: "Adhésions" },
  { href: "/admin/demandes", label: "Demandes d'adhésion" },
  { href: "/admin/membres", label: "Membres" },
  { href: "/admin/cotisations", label: "Cotisations" },
  { groupe: "Contenus" },
  { href: "/", label: "Modifier le site ✏️" },
  { href: "/admin/articles", label: "Actualités" },
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/gazette", label: "La gazette" },
  { href: "/admin/textes", label: "Statuts, règlement, charte" },
  { groupe: "SEL" },
  { href: "/admin/sel", label: "Tableau du SEL" },
  { href: "/admin/sel/inscriptions", label: "Inscriptions et assurances" },
  { href: "/admin/sel/solidarite", label: "Compte de solidarité" },
  { href: "/admin/sel/annonces", label: "Annonces" },
  { href: "/admin/sel/signalements", label: "Signalements du SEL" },
  { href: "/admin/sel/rubriques", label: "Rubriques" },
  { groupe: "Suivi" },
  { href: "/admin/messages", label: "Messages reçus" },
  { href: "/admin/signalements", label: "Bugs signalés" },
  { href: "/admin/journal", label: "Journal d'audit" },
  { href: "/admin/alertes", label: "Alertes par e-mail" },
  { groupe: "Mon compte" },
  { href: "/espace", label: "Mon espace adhérent" },
];

// Réservé aux rôles ADMINISTRATEUR et BUREAU. Chaque page qui lit des données
// appelle aussi exigerAdmin() : un layout seul ne protège pas toutes les requêtes.
export default async function AdminLayout({ children }) {
  const membre = await exigerAdmin();
  return (
    <Shell sousTitre="Administration" items={items} racine="/admin" membre={membre}>
      {children}
    </Shell>
  );
}
