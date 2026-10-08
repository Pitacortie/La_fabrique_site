import Shell from "@/components/Shell";
import { ROLES_ADMIN, exigerMembre } from "@/lib/auth";

export const metadata = { title: "Mon espace", robots: { index: false, follow: false } };

const items = [
  { href: "/espace", label: "Mon profil" },
  { href: "/espace/fabrications", label: "Nos « Fabrications »" },
  { href: "/espace/textes", label: "Mes textes acceptés" },
  { groupe: "Mon compte" },
  { href: "/espace/coordonnees", label: "Mes coordonnées" },
  { href: "/espace/mot-de-passe", label: "Mot de passe" },
];

// FAB-1 : accès réservé aux adhérents connectés.
export default async function EspaceLayout({ children }) {
  const membre = await exigerMembre();
  const menu = ROLES_ADMIN.includes(membre.role)
    ? [...items, { groupe: "Administration" }, { href: "/admin", label: "Console d'administration" }]
    : items;

  return (
    <Shell sousTitre="Mon espace" items={menu} racine="/espace" membre={membre}>
      {children}
    </Shell>
  );
}
