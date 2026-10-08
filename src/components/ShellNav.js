"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// La racine de section (« /admin ») n'est active que sur sa propre page ; un lien vers le site public jamais.
function estActif(pathname, href, racine) {
  if (href === racine) return pathname === racine;
  return href !== "/" && pathname.startsWith(href);
}

// Menu latéral de l'espace adhérent et de la console. items : [{ groupe } | { href, label }]
export default function ShellNav({ items, racine }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu de section">
      {items.map((item) =>
        item.groupe ? (
          <div key={item.groupe} className="groupe">{item.groupe}</div>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            aria-current={estActif(pathname, item.href, racine) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ),
      )}
    </nav>
  );
}
