"use client";

import ChampMotDePasse from "@/components/ChampMotDePasse";
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
          <ChampMotDePasse id="motDePasse" name="motDePasse" required autoComplete="current-password" />
        </div>
        <label className="case">
          <input type="checkbox" name="resterConnecte" />
          <span>Rester connecté</span>
        </label>
      </fieldset>
      <div className="actions">
        <button type="submit" className="bouton" disabled={enCours}>
          {enCours ? "Connexion…" : "Se connecter"}
        </button>
        <Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
      </div>
    </form>
  );
}
