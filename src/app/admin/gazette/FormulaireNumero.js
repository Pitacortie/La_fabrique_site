"use client";

import { useActionState, useEffect, useRef } from "react";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import { ChampDate } from "@/components/ChampsDate";
import Retour from "@/components/Retour";
import { publierNumero } from "./actions";

export default function FormulaireNumero({ prochainNumero }) {
  const formRef = useRef(null);
  const [etat, action] = useActionState(publierNumero, null);
  useEffect(() => {
    if (etat?.ok) formRef.current?.reset();
  }, [etat]);

  return (
    <form ref={formRef} action={action} className="formulaire formulaire-large">
      <Retour etat={etat} />
      <div className="champs">
        <div className="champ">
          <label htmlFor="titre">Titre <span className="obligatoire">*</span></label>
          <input id="titre" name="titre" type="text" required maxLength={150} placeholder="Ex. : La gazette de l'automne" />
        </div>
        <div className="champ">
          <label htmlFor="numero">Numéro</label>
          <input id="numero" name="numero" type="number" min={1} max={9999} defaultValue={prochainNumero} />
        </div>
        <div className="champ">
          <label htmlFor="parution">Date de parution <span className="obligatoire">*</span></label>
          <ChampDate id="parution" name="parution" required />
        </div>
      </div>
      <div className="champ" style={{ marginTop: "1rem" }}>
        <label htmlFor="resume">Sommaire ou résumé (facultatif)</label>
        <textarea id="resume" name="resume" rows={3} maxLength={2000} />
      </div>
      <div className="champ" style={{ marginTop: "1rem" }}>
        <label htmlFor="fichier">Numéro au format PDF (20 Mo maximum) <span className="obligatoire">*</span></label>
        <input id="fichier" name="fichier" type="file" accept="application/pdf" required />
      </div>
      <div className="actions">
        <BoutonEnvoi enCours="Envoi…">Publier le numéro</BoutonEnvoi>
      </div>
    </form>
  );
}
