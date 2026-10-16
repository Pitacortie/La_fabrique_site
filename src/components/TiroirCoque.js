"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Sur téléphone, le menu latéral de l'espace adhérent et de la console devient un panneau qui s'ouvre avec « Menu ».
// Sur grand écran, le contenu est toujours affiché (le bouton est masqué en CSS).
export default function TiroirCoque({ marque, children }) {
  const [ouvert, setOuvert] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOuvert(false), [pathname]);

  return (
    <>
      <div className="coque-barre">
        {marque}
        <button type="button" className="coque-burger" aria-expanded={ouvert} aria-controls="coque-tiroir" onClick={() => setOuvert((o) => !o)}>
          {ouvert ? "Fermer" : "Menu"}
        </button>
      </div>
      <div id="coque-tiroir" className={`coque-tiroir${ouvert ? " ouvert" : ""}`}>
        {children}
      </div>
    </>
  );
}
