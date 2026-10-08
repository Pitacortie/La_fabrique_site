import Link from "next/link";
import { seDeconnecter } from "@/app/(site)/connexion/actions";
import Logo from "@/components/Logo";
import ShellNav from "@/components/ShellNav";

// Coque commune à l'espace adhérent et à la console d'administration : menu latéral + contenu.
export default function Shell({ sousTitre, items, racine, membre, children }) {
  return (
    <div className="coque">
      <aside className="coque-menu">
        <Link href="/" className="marque">
          <Logo taille={32} />
          <span>
            La Fabrique
            <small>{sousTitre}</small>
          </span>
        </Link>
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
      </aside>
      <main id="contenu" className="coque-contenu">{children}</main>
    </div>
  );
}
