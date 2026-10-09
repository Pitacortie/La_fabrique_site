"use client";

import { useActionState } from "react";
import { confirmerChangementEmail } from "@/app/espace/email/actions";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";

export default function FormulaireConfirmation({ jeton }) {
  const [etat, action] = useActionState(confirmerChangementEmail, null);
  return (
    <form action={action} className="formulaire">
      <input type="hidden" name="jeton" value={jeton} />
      <Retour etat={etat} />
      <div className="actions">
        <BoutonEnvoi>Confirmer cette adresse</BoutonEnvoi>
      </div>
    </form>
  );
}
