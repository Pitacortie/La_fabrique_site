"use client";

import { useActionState, useEffect, useRef } from "react";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";
import { corrigerVersion, publierVersion } from "./actions";
import { ChampDate } from "@/components/ChampsDate";

// Sans `texte` : nouvelle version. Avec `texte` : correction d'une version jamais acceptée.
export default function FormulaireTexte({ types, texte, enVigueurLe, typeParDefaut }) {
  const formRef = useRef(null);
  const [etat, action] = useActionState(texte ? corrigerVersion : publierVersion, null);
  useEffect(() => {
    if (etat?.reinitialiser) formRef.current?.reset();
  }, [etat]);
  const p = texte?.id ?? "nouveau";

  return (
    <form ref={formRef} action={action} className="formulaire formulaire-large">
      {texte && <input type="hidden" name="id" value={texte.id} />}
      <div className="champs">
        {!texte && (
          <div className="champ">
            <label htmlFor={`${p}-type`}>Texte</label>
            <select id={`${p}-type`} name="type" defaultValue={typeParDefaut}>
              {Object.entries(types).map(([valeur, libelle]) => (
                <option key={valeur} value={valeur}>{libelle}</option>
              ))}
            </select>
          </div>
        )}
        <div className="champ">
          <label htmlFor={`${p}-version`}>Version</label>
          <input id={`${p}-version`} name="version" type="text" required maxLength={30} defaultValue={texte?.version} placeholder="ex. 2" />
        </div>
        <div className="champ">
          <label htmlFor={`${p}-enVigueurLe`}>En vigueur le</label>
          <ChampDate id={`${p}-enVigueurLe`} name="enVigueurLe" required defaultValue={enVigueurLe} />
        </div>
      </div>
      <div className="champ">
        <label htmlFor={`${p}-titre`}>Titre</label>
        <input id={`${p}-titre`} name="titre" type="text" required maxLength={150} defaultValue={texte?.titre} />
      </div>
      <div className="champ">
        <label htmlFor={`${p}-contenu`}>Texte complet</label>
        <textarea id={`${p}-contenu`} name="contenu" required rows={14} defaultValue={texte?.contenu} />
        <span className="aide">Affiché en entier au-dessus de la case à cocher du bulletin d'adhésion, et sur la page « Nos textes ».</span>
      </div>
      <div className="actions">
        <BoutonEnvoi>{texte ? "Enregistrer la correction" : "Publier cette version"}</BoutonEnvoi>
      </div>
      <Retour etat={etat} />
    </form>
  );
}
