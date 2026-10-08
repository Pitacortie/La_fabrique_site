"use client";

import Link from "next/link";
import { useActionState } from "react";
import { seConnecter } from "./actions";

export default function FormulaireConnexion({ suite }) {
  const [etat, action, enCours] = useActionState(seConnecter, null);

  return (
    <form className="formulaire" action={action}>
      <input type="hidden" name="suite" value={suite ?? ""} />
      {etat?.erreur && (
        <div className="message-erreur" role="alert">{etat.erreur}</div>
      )}
      <fieldset>
        <legend>Mes identifiants</legend>
        <div className="champ">
          <label htmlFor="email">Adresse e-mail</label>
          <input id="email" name="email" type="email" required autoComplete="username" />
        </div>
        <div className="champ" style={{ marginTop: "1rem" }}>
          <label htmlFor="motDePasse">Mot de passe</label>
          <input id="motDePasse" name="motDePasse" type="password" required autoComplete="current-password" />
        </div>
        <label className="case">
          <input type="checkbox" name="resterConnecte" />
          <span>Rester connecté pendant 30 jours</span>
        </label>
      </fieldset>
      <div className="actions">
        <button type="submit" className="bouton" disabled={enCours}>
          {enCours ? "Connexion…" : "Se connecter"}
        </button>
        <Link href="/contact">Mot de passe oublié ?</Link>
      </div>
    </form>
  );
}
