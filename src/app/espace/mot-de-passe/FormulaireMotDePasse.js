"use client";

import ChampMotDePasse from "@/components/ChampMotDePasse";
import { useActionState, useEffect, useRef } from "react";
import { changerMotDePasse } from "@/app/espace/actions";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";

export default function FormulaireMotDePasse({ email }) {
  const formRef = useRef(null);
  const [etat, action] = useActionState(changerMotDePasse, null);
  useEffect(() => {
    if (etat?.reinitialiser) formRef.current?.reset();
  }, [etat]);

  return (
    <form ref={formRef} action={action} className="formulaire" style={{ maxWidth: "32rem" }}>
      <Retour etat={etat} />
      {/* Aide les gestionnaires de mots de passe à associer le nouveau mot de passe au bon compte */}
      <input type="hidden" name="username" autoComplete="username" value={email} readOnly />
      <fieldset>
        <legend>Changer mon mot de passe</legend>
        <div className="champ">
          <label htmlFor="actuel">Mot de passe actuel</label>
          <ChampMotDePasse id="actuel" name="actuel" required autoComplete="current-password" />
        </div>
        <div className="champ" style={{ marginTop: "1rem" }}>
          <label htmlFor="nouveau">Nouveau mot de passe</label>
          <ChampMotDePasse id="nouveau" name="nouveau" required minLength={10} maxLength={200} autoComplete="new-password" aria-describedby="aide-mdp" />
          <span id="aide-mdp" className="aide">10 caractères minimum. Une phrase de plusieurs mots est facile à retenir et solide.</span>
        </div>
        <div className="champ" style={{ marginTop: "1rem" }}>
          <label htmlFor="confirmation">Nouveau mot de passe, encore une fois</label>
          <ChampMotDePasse id="confirmation" name="confirmation" required minLength={10} maxLength={200} autoComplete="new-password" />
        </div>
      </fieldset>
      <div className="actions">
        <BoutonEnvoi>Changer le mot de passe</BoutonEnvoi>
      </div>
    </form>
  );
}
