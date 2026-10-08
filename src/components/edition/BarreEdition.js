"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CLE = "fabrique-crayons-masques";

// Barre visible des seuls administrateurs sur les pages publiques.
// « Aperçu visiteur » masque les crayons pour voir la page comme le public (préférence gardée dans ce navigateur).
export default function BarreEdition() {
  const [apercu, setApercu] = useState(false);

  useEffect(() => {
    try {
      setApercu(localStorage.getItem(CLE) === "1");
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("apercu-visiteur", apercu);
    try {
      localStorage.setItem(CLE, apercu ? "1" : "0");
    } catch {}
  }, [apercu]);

  return (
    <div className="barre-edition" role="region" aria-label="Mode édition">
      <span>
        <strong>Mode édition</strong>
        <span className="barre-edition-aide"> · cliquez sur ✏️ pour modifier un texte</span>
      </span>
      <span className="actions">
        <button type="button" className="bouton bouton-secondaire" aria-pressed={apercu} onClick={() => setApercu((a) => !a)}>
          {apercu ? "Afficher les crayons" : "Aperçu visiteur"}
        </button>
        <Link href="/admin" className="bouton">Console</Link>
      </span>
    </div>
  );
}
