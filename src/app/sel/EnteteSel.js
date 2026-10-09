"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { seDeconnecter } from "@/app/(site)/connexion/actions";
import Logo from "@/components/Logo";

const ONGLETS = [
  { href: "/sel", label: "Services proposés", actif: (p) => p === "/sel" },
  { href: "/sel/demandes", label: "Services demandés", actif: (p) => p.startsWith("/sel/demandes") },
];

function Pastille({ n, libelle }) {
  if (!n) return null;
  return (
    <span className="pastille" aria-label={`${n} ${libelle}`}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

export default function EnteteSel({ ouvert, compteurs, solde, code }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const courant = (href) => (pathname.startsWith(href) ? "page" : undefined);

  return (
    <header className="sel-entete">
      <div className="conteneur sel-barre">
        <Link href={ouvert ? "/sel" : "/"} className="marque">
          <Logo taille={36} />
          <span>
            Le SEL
            <small>La Fabrique de Ménesplet</small>
          </span>
        </Link>

        {ouvert && (
          <>
            <Link href="/sel/briques" className="sel-solde" title="Mon solde de briques" aria-current={courant("/sel/briques")}>
              <span aria-hidden="true">🧱</span> {solde} brique{Math.abs(solde) > 1 ? "s" : ""}
            </Link>
            <button type="button" className="burger" aria-expanded={menu} aria-controls="sel-menu" onClick={() => setMenu((m) => !m)}>
              Menu
            </button>
            <nav id="sel-menu" className={`sel-nav${menu ? " ouvert" : ""}`} aria-label="Menu du SEL" onClick={() => setMenu(false)}>
              <Link href="/sel/messages" aria-current={courant("/sel/messages")}>
                Messages <Pastille n={compteurs.nonLus} libelle="messages non lus" />
              </Link>
              <Link href="/sel/echanges" aria-current={courant("/sel/echanges")}>
                Mes échanges <Pastille n={compteurs.actions} libelle="échanges en attente de votre action" />
              </Link>
              <Link href="/sel/mes-annonces" aria-current={courant("/sel/mes-annonces")}>Mes annonces</Link>
              <span className="sel-code" title="Votre code dans le SEL : votre nom n'est jamais affiché">{code}</span>
              <Link href="/espace">Mon espace</Link>
              <form action={seDeconnecter}>
                <button type="submit" className="lien-sortir">Sortir</button>
              </form>
            </nav>
          </>
        )}
        {!ouvert && (
          <nav className="sel-nav ouvert-toujours" aria-label="Retour">
            <Link href="/">← Site de l'association</Link>
          </nav>
        )}
      </div>

      {ouvert && (
        <div className="conteneur sel-onglets-barre">
          <nav className="sel-onglets" aria-label="Annonces">
            {ONGLETS.map((o) => (
              <Link key={o.href} href={o.href} className="sel-onglet" aria-current={o.actif(pathname) ? "page" : undefined}>
                {o.label}
              </Link>
            ))}
          </nav>
          <Link href="/sel/annonces/nouvelle" className="bouton">+ Publier une annonce</Link>
        </div>
      )}
    </header>
  );
}
