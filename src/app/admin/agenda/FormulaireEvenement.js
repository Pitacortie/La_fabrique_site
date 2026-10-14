"use client";

import { useActionState } from "react";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import { ChampDate, ChampHeure } from "@/components/ChampsDate";
import Retour from "@/components/Retour";
import { enregistrerEvenement } from "./actions";

export default function FormulaireEvenement({ evenement }) {
  const [etat, action] = useActionState(enregistrerEvenement, null);
  const e = evenement ?? {};
  return (
    <form action={action} className="formulaire formulaire-large">
      {evenement && <input type="hidden" name="id" value={evenement.id} />}
      <Retour etat={etat} />
      <div className="champ">
        <label htmlFor="titre">Titre <span className="obligatoire">*</span></label>
        <input id="titre" name="titre" type="text" required maxLength={120} defaultValue={e.titre ?? ""} />
      </div>
      <div className="champs" style={{ marginTop: "1rem" }}>
        <div className="champ">
          <label htmlFor="jour">Date <span className="obligatoire">*</span></label>
          <ChampDate id="jour" name="jour" required defaultValue={e.jour ?? ""} />
        </div>
        <div className="champ">
          <label htmlFor="heure">Début <span className="obligatoire">*</span></label>
          <ChampHeure id="heure" name="heure" required defaultValue={e.heure ?? ""} />
        </div>
        <div className="champ">
          <label htmlFor="heureFin">Fin (facultatif)</label>
          <ChampHeure id="heureFin" name="heureFin" defaultValue={e.heureFin ?? ""} />
        </div>
      </div>
      <div className="champ" style={{ marginTop: "1rem" }}>
        <label htmlFor="lieu">Lieu <span className="obligatoire">*</span></label>
        <input id="lieu" name="lieu" type="text" required maxLength={200} defaultValue={e.lieu ?? ""} placeholder="Ex. : lieu Laser, 12 rue Simone Veil" />
      </div>
      <div className="champ" style={{ marginTop: "1rem" }}>
        <label htmlFor="description">Description (facultatif)</label>
        <textarea id="description" name="description" rows={4} maxLength={3000} defaultValue={e.description ?? ""} />
      </div>
      <div className="actions">
        <BoutonEnvoi>{evenement ? "Enregistrer" : "Ajouter à l'agenda"}</BoutonEnvoi>
      </div>
    </form>
  );
}
