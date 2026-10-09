"use client";

import { useActionState } from "react";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";
import { SUJETS_CONTACT } from "@/lib/site";
import { envoyerMessage } from "./actions";

export default function FormulaireContact({ nom = "", email = "", sujet = "question" }) {
  const [etat, action] = useActionState(envoyerMessage, null);
  if (etat?.ok) return <Retour etat={etat} />;

  return (
    <form action={action} className="formulaire">
      <Retour etat={etat} />
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}>
        <label htmlFor="contact-site-web">Ne pas remplir</label>
        <input id="contact-site-web" name="site_web" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <fieldset>
        <legend>Votre message</legend>
        <div className="champs">
          <div className="champ">
            <label htmlFor="nom">Nom et prénom <span className="obligatoire">*</span></label>
            <input id="nom" name="nom" type="text" required maxLength={100} autoComplete="name" defaultValue={nom} />
          </div>
          <div className="champ">
            <label htmlFor="email">Adresse e-mail <span className="obligatoire">*</span></label>
            <input id="email" name="email" type="email" required maxLength={200} autoComplete="email" defaultValue={email} />
          </div>
        </div>
        <div className="champ" style={{ marginTop: "1rem" }}>
          <label htmlFor="sujet">Objet</label>
          <select id="sujet" name="sujet" defaultValue={sujet}>
            {Object.entries(SUJETS_CONTACT).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div className="champ" style={{ marginTop: "1rem" }}>
          <label htmlFor="texte">Message <span className="obligatoire">*</span></label>
          <textarea id="texte" name="texte" required minLength={10} maxLength={5000} />
        </div>
      </fieldset>
      <div className="actions">
        <BoutonEnvoi enCours="Envoi…">Envoyer</BoutonEnvoi>
      </div>
    </form>
  );
}
