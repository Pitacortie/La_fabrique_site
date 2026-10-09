"use client";

import { useActionState } from "react";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";
import { accepterNouveauxTextes } from "./actions";

// Affiché à la place de l'espace (ou de la console) tant que les nouvelles versions ne sont pas acceptées.
export default function AccepterTextes({ textes }) {
  const [etat, action] = useActionState(accepterNouveauxTextes, null);
  return (
    <>
      <div className="coque-entete">
        <h1>{textes.length > 1 ? "Nouvelles versions de nos textes" : "Nouvelle version d'un de nos textes"}</h1>
      </div>
      <p className="chapo">
        L'association a mis à jour {textes.length > 1 ? "des textes" : "un texte"} que vous avez acceptés lors de votre
        adhésion. Merci de {textes.length > 1 ? "les" : "le"} lire et de confirmer votre accord pour continuer.
      </p>
      <form action={action} className="formulaire formulaire-large">
        <Retour etat={etat} />
        {textes.map((t) => (
          <fieldset key={t.id}>
            <legend>{t.titre}</legend>
            <p className="refs">Version {t.version}, en vigueur depuis le {t.enVigueurLe}</p>
            <div className="texte-legal" tabIndex={0}>
              <pre className="texte-complet">{t.contenu}</pre>
            </div>
            <label className="case">
              <input type="checkbox" name={`accepte-${t.id}`} required />
              <span>J'ai pris connaissance de cette nouvelle version et je l'accepte. <span className="obligatoire">*</span></span>
            </label>
          </fieldset>
        ))}
        <div className="actions">
          <BoutonEnvoi>Accepter et continuer</BoutonEnvoi>
          <span className="refs">Une question ? Écrivez-nous depuis la page Contacts.</span>
        </div>
      </form>
    </>
  );
}
