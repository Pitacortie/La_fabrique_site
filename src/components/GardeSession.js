"use client";

import { useEffect, useRef, useState } from "react";

// ACC-4 : déconnexion automatique après plus de 5 minutes d'inactivité.
// Tant que la personne se sert de la page (clavier, souris, défilement), un signal prolonge la session côté serveur.
// L'activité est partagée entre les onglets ouverts, pour qu'un onglet oublié ne déconnecte pas celui qu'on utilise.
const INACTIVITE_MS = 5 * 60 * 1000;
const AVERTISSEMENT_MS = 4 * 60 * 1000;
const SIGNAL_MS = 60 * 1000;
const CLE = "fabrique_activite";

const lirePartage = () => {
  try {
    return Number(localStorage.getItem(CLE)) || 0;
  } catch {
    return 0;
  }
};
const ecrirePartage = (t) => {
  try {
    localStorage.setItem(CLE, String(t));
  } catch {
    // stockage indisponible (navigation privée) : chaque onglet compte pour lui-même
  }
};

export default function GardeSession() {
  const activite = useRef(Date.now());
  const dernierSignal = useRef(Date.now());
  const [avertir, setAvertir] = useState(false);

  useEffect(() => {
    let fini = false;
    const noter = () => {
      const t = Date.now();
      if (t - activite.current > 2000) ecrirePartage(t);
      activite.current = t;
    };
    const sortir = async () => {
      if (fini) return;
      fini = true;
      await fetch("/api/session", { method: "DELETE" }).catch(() => {});
      window.location.assign(`/connexion?expire=1&suite=${encodeURIComponent(window.location.pathname)}`);
    };
    const signaler = async () => {
      dernierSignal.current = Date.now();
      const r = await fetch("/api/session", { method: "POST" }).catch(() => null);
      if (r?.status === 401) sortir();
    };
    const verifier = () => {
      const derniere = Math.max(activite.current, lirePartage());
      const inactif = Date.now() - derniere;
      if (inactif >= INACTIVITE_MS) return sortir();
      setAvertir(inactif >= AVERTISSEMENT_MS);
      if (derniere > dernierSignal.current && Date.now() - dernierSignal.current >= SIGNAL_MS) signaler();
    };

    ecrirePartage(Date.now());
    const evenements = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove", "focus"];
    evenements.forEach((e) => window.addEventListener(e, noter, { passive: true }));
    const minuterie = setInterval(verifier, 10_000);
    // Retour sur un onglet après une mise en veille : on vérifie tout de suite
    const visibilite = () => document.visibilityState === "visible" && verifier();
    document.addEventListener("visibilitychange", visibilite);
    return () => {
      evenements.forEach((e) => window.removeEventListener(e, noter));
      clearInterval(minuterie);
      document.removeEventListener("visibilitychange", visibilite);
    };
  }, []);

  if (!avertir) return null;
  return (
    <div className="garde-session" role="alertdialog" aria-live="assertive" aria-label="Déconnexion imminente">
      <p>Sans activité de votre part, vous serez déconnecté dans moins d'une minute.</p>
      <button type="button" className="bouton" onClick={() => { activite.current = Date.now(); ecrirePartage(activite.current); setAvertir(false); }}>
        Je suis toujours là
      </button>
    </div>
  );
}
