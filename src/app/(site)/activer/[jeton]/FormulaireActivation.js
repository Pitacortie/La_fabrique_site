"use client";

import { useActionState } from "react";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";
import { activerCompte } from "./actions";

export default function FormulaireActivation({ jeton, email }) {
  const [etat, action] = useActionState(activerCompte, null);
  return (
    <form action={action} className="formulaire">
      <Retour etat={etat} />
      <input type="hidden" name="jeton" value={jeton} />
      <input type="hidden" name="username" autoComplete="username" value={email} readOnly />
      <fieldset>
        <legend>Mon mot de passe</legend>
        <p className="refs">Votre identifiant de connexion : <strong>{email}</strong></p>
        <div className="champ">
          <label htmlFor="nouveau">Mot de passe</label>
          <input id="nouveau" name="nouveau" type="password" required minLength={10} maxLength={200} autoComplete="new-password" aria-describedby="aide-mdp" />
          <span id="aide-mdp" className="aide">10 caractères minimum. Une phrase de plusieurs mots est facile à retenir et solide.</span>
        </div>
        <div className="champ" style={{ marginTop: "1rem" }}>
          <label htmlFor="confirmation">Encore une fois</label>
          <input id="confirmation" name="confirmation" type="password" required minLength={10} maxLength={200} autoComplete="new-password" />
        </div>
      </fieldset>
      <div className="actions">
        <BoutonEnvoi>Activer mon compte</BoutonEnvoi>
      </div>
    </form>
  );
}
