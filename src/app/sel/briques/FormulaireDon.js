"use client";

import { useActionState } from "react";
import { donnerBriques } from "@/app/sel/actions/briques";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";

export default function FormulaireDon({ solde }) {
  const [etat, action] = useActionState(donnerBriques, null);
  return (
    <form action={action} className="formulaire" style={{ maxWidth: "none" }}>
      <Retour etat={etat} />
      <div className="actions">
        <label htmlFor="montant" className="sr-only">Nombre de briques à donner</label>
        <input id="montant" name="montant" type="number" min={1} max={Math.max(solde, 1)} step={1} required style={{ width: "8rem" }} placeholder="Briques" />
        <BoutonEnvoi className="bouton bouton-secondaire" disabled={solde < 1}>Donner au compte de solidarité</BoutonEnvoi>
      </div>
    </form>
  );
}
