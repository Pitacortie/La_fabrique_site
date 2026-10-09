"use client";

import { useActionState } from "react";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";
import { demanderReinitialisation } from "./actions";

export default function FormulaireDemande() {
  const [etat, action] = useActionState(demanderReinitialisation, null);
  if (etat?.ok) return <Retour etat={etat} />;

  return (
    <form action={action} className="formulaire">
      <Retour etat={etat} />
      <fieldset>
        <legend>Mon adresse e-mail</legend>
        <div className="champ">
          <label htmlFor="email">Adresse e-mail de mon compte</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
      </fieldset>
      <div className="actions">
        <BoutonEnvoi enCours="Envoi…">Recevoir un lien</BoutonEnvoi>
      </div>
    </form>
  );
}
