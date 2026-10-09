"use client";

import { useActionState } from "react";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";
import { repondreMessage } from "./actions";

export default function FormulaireReponse({ id, nom }) {
  const [etat, action] = useActionState(repondreMessage, null);
  if (etat?.ok) return <Retour etat={etat} />;
  return (
    <form action={action} className="formulaire" style={{ maxWidth: "none", marginTop: "0.75rem" }}>
      <input type="hidden" name="id" value={id} />
      <Retour etat={etat} />
      <div className="champ">
        <label htmlFor={`reponse-${id}`}>Répondre à {nom}</label>
        <textarea id={`reponse-${id}`} name="reponse" rows={5} required maxLength={5000} />
        <span className="aide">Envoyée au nom de l'association, avec votre message d'origine et un lien vers la page Adhérer.</span>
      </div>
      <div className="actions">
        <BoutonEnvoi enCours="Envoi…">Envoyer la réponse</BoutonEnvoi>
      </div>
    </form>
  );
}
