"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Sur téléphone : barre de navigation fixée en bas de l'écran, comme dans une application.
const trait = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
const ICONES = {
  annonces: <><rect x="3" y="4" width="18" height="16" rx="2" {...trait} /><path d="M7 9h10M7 13h10M7 17h6" {...trait} /></>,
  publier: <><circle cx="12" cy="12" r="9" {...trait} /><path d="M12 8v8M8 12h8" {...trait} /></>,
  messages: <path d="M4 5h16v11H9l-5 4z" {...trait} />,
  echanges: <><path d="M4 8h13l-3-3M20 16H7l3 3" {...trait} /></>,
  briques: <><rect x="3" y="5" width="18" height="6" rx="1" {...trait} /><rect x="3" y="13" width="18" height="6" rx="1" {...trait} /><path d="M12 5v6M8 13v6M16 13v6" {...trait} /></>,
};

const ELEMENTS = [
  { href: "/sel", label: "Annonces", icone: "annonces", actif: (p) => p === "/sel" || p.startsWith("/sel/demandes") || (p.startsWith("/sel/annonces/") && !p.endsWith("/nouvelle")) },
  { href: "/sel/messages", label: "Messages", icone: "messages", compteur: "nonLus" },
  { href: "/sel/annonces/nouvelle", label: "Publier", icone: "publier", principal: true },
  { href: "/sel/echanges", label: "Échanges", icone: "echanges", compteur: "actions" },
  { href: "/sel/briques", label: "Briques", icone: "briques" },
];

export default function BarreBasSel({ compteurs }) {
  const pathname = usePathname();
  return (
    <nav className="sel-barre-bas" aria-label="Navigation du SEL">
      {ELEMENTS.map((e) => {
        const actif = e.actif ? e.actif(pathname) : pathname.startsWith(e.href);
        const n = e.compteur ? compteurs?.[e.compteur] : 0;
        return (
          <Link key={e.href} href={e.href} className={e.principal ? "sel-barre-bas-principal" : undefined} aria-current={actif ? "page" : undefined}>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">{ICONES[e.icone]}</svg>
            <span>{e.label}</span>
            {n > 0 && <span className="pastille sel-barre-bas-pastille" aria-label={`${n} en attente`}>{n > 99 ? "99+" : n}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
