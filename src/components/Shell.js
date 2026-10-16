import Link from "next/link";
import { seDeconnecter } from "@/app/(site)/connexion/actions";
import Logo from "@/components/Logo";
import ShellNav from "@/components/ShellNav";
import TiroirCoque from "@/components/TiroirCoque";

// Coque commune à l'espace adhérent et à la console d'administration : menu latéral + contenu.
// Sur téléphone, le menu se replie derrière un bouton « Menu ».
export default function Shell({ sousTitre, items, racine, membre, children }) {
  const marque = (
    <Link href="/" className="marque">
      <Logo taille={32} />
      <span>
        La Fabrique
        <small>{sousTitre}</small>
      </span>
    </Link>
  );
  return (
    <div className="coque">
      <aside className="coque-menu">
        <TiroirCoque marque={marque}>
          <ShellNav items={items} racine={racine} />
          <div className="groupe">Session</div>
          <p className="coque-session">
            {membre.prenom} {membre.nom}
            <br />
            <span>{membre.alias?.code}</span>
          </p>
          {/* ACC-4 / CON-5 : « Sortir » déconnecte et ramène à l'accueil */}
          <form action={seDeconnecter}>
            <button type="submit" className="coque-sortir">Sortir</button>
          </form>
        </TiroirCoque>
      </aside>
      <main id="contenu" className="coque-contenu">{children}</main>
    </div>
  );
}
