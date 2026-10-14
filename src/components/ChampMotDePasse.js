"use client";

import { useState } from "react";

// Champ mot de passe avec un bouton « œil » pour l'afficher en clair.
export default function ChampMotDePasse(props) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="champ-mdp">
      <input {...props} type={visible ? "text" : "password"} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <button
        type="button"
        className="bouton-oeil"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
        title={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <line x1="3" y1="3" x2="21" y2="21" />}
        </svg>
      </button>
    </span>
  );
}
