"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { seDeconnecter } from "@/app/(site)/connexion/actions";
import Logo from "@/components/Logo";
import { navigation } from "@/lib/site";

function estActif(pathname, href) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function Header({ connecte = false }) {
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);

  return (
    <header className="entete">
      <div className="conteneur entete-barre">
        <Link href="/" className="marque" onClick={() => setOuvert(false)}>
          <Logo />
          <span>
            La Fabrique
            <small>de Ménesplet</small>
          </span>
        </Link>

        <button
          type="button"
          className="burger"
          aria-expanded={ouvert}
          aria-controls="menu-principal"
          onClick={() => setOuvert((o) => !o)}
        >
          Menu
        </button>

        <nav id="menu-principal" className={`nav${ouvert ? " ouvert" : ""}`} aria-label="Menu principal">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={estActif(pathname, item.href) ? "page" : undefined}
              onClick={() => setOuvert(false)}
            >
              {item.label}
            </Link>
          ))}
          {connecte ? (
            <>
              <Link href="/espace" className="bouton" onClick={() => setOuvert(false)}>
                Mon espace
              </Link>
              {/* ACC-4 : « Sortir » déconnecte et ramène à l'accueil */}
              <form action={seDeconnecter}>
                <button type="submit" className="lien-sortir">Sortir</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/connexion" className="lien-connexion" onClick={() => setOuvert(false)}>
                Connexion
              </Link>
              <Link href="/adherer" className="bouton" onClick={() => setOuvert(false)}>
                Adhérer
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
