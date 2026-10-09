import Shell from "@/components/Shell";
import { textesEnAttente } from "@/lib/acceptation";
import { ROLES_ADMIN, exigerMembre } from "@/lib/auth";
import AccepterTextes from "./acceptation/AccepterTextes";

export const metadata = { title: "Mon espace", robots: { index: false, follow: false } };

const items = [
  { href: "/espace", label: "Mon profil" },
  { href: "/espace/fabrications", label: "Nos « Fabrications »" },
  { href: "/espace/textes", label: "Mes textes acceptés" },
  { groupe: "Mon compte" },
  { href: "/espace/coordonnees", label: "Mes coordonnées" },
  { href: "/espace/email", label: "Adresse e-mail" },
  { href: "/espace/mot-de-passe", label: "Mot de passe" },
];

// FAB-1 : accès réservé aux adhérents connectés.
// Section 6.7 : si un texte a changé de version, son acceptation est demandée avant d'ouvrir l'espace.
// (La console d'administration n'est pas bloquée : c'est là qu'on corrige les textes.)
export default async function EspaceLayout({ children }) {
  const membre = await exigerMembre();
  const enAttente = await textesEnAttente(membre.id);
  const menu = ROLES_ADMIN.includes(membre.role)
    ? [...items, { groupe: "Administration" }, { href: "/admin", label: "Console d'administration" }]
    : items;

  return (
    <Shell sousTitre="Mon espace" items={menu} racine="/espace" membre={membre}>
      {enAttente.length ? <AccepterTextes textes={enAttente} /> : children}
    </Shell>
  );
}
