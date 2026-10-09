"use client";

import { useActionState } from "react";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";
import { demanderChangementEmail } from "./actions";

export default function FormulaireEmail({ email }) {
  const [etat, action] = useActionState(demanderChangementEmail, null);
  if (etat?.ok) return <Retour etat={etat} />;
  return (
    <form action={action} className="formulaire" style={{ maxWidth: "32rem" }}>
      <Retour etat={etat} />
      <fieldset>
        <legend>Nouvelle adresse e-mail</legend>
        <p className="refs">Adresse actuelle : <strong>{email}</strong></p>
        <div className="champ">
          <label htmlFor="nouvelEmail">Nouvelle adresse</label>
          <input id="nouvelEmail" name="nouvelEmail" type="email" required maxLength={200} autoComplete="email" />
        </div>
        <div className="champ" style={{ marginTop: "1rem" }}>
          <label htmlFor="motDePasse">Mot de passe actuel</label>
          <input id="motDePasse" name="motDePasse" type="password" required autoComplete="current-password" />
          <span className="aide">Par sécurité, votre mot de passe est demandé.</span>
        </div>
      </fieldset>
      <div className="actions">
        <BoutonEnvoi enCours="Envoi…">Recevoir le lien de confirmation</BoutonEnvoi>
      </div>
    </form>
  );
}
