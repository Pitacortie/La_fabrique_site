"use client";

import { useActionState } from "react";
import { modifierCoordonnees } from "@/app/espace/actions";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";

export default function FormulaireCoordonnees({ membre }) {
  const [etat, action] = useActionState(modifierCoordonnees, null);

  return (
    <form action={action} className="formulaire">
      <Retour etat={etat} />
      <fieldset>
        <legend>Mes coordonnées</legend>
        <div className="champs">
          <div className="champ">
            <label htmlFor="telephone">Téléphone <span className="obligatoire">*</span></label>
            <input id="telephone" name="telephone" type="tel" required autoComplete="tel" defaultValue={membre.telephone ?? ""} pattern="[0-9 +().-]{10,20}" />
          </div>
        </div>
        <div className="champs" style={{ marginTop: "1rem" }}>
          <div className="champ" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="adresse">Adresse <span className="obligatoire">*</span></label>
            <input id="adresse" name="adresse" type="text" required autoComplete="street-address" defaultValue={membre.adresse ?? ""} maxLength={200} />
          </div>
          <div className="champ">
            <label htmlFor="codePostal">Code postal <span className="obligatoire">*</span></label>
            <input id="codePostal" name="codePostal" type="text" required inputMode="numeric" pattern="[0-9]{5}" autoComplete="postal-code" defaultValue={membre.codePostal ?? ""} />
          </div>
          <div className="champ">
            <label htmlFor="commune">Commune <span className="obligatoire">*</span></label>
            <input id="commune" name="commune" type="text" required autoComplete="address-level2" defaultValue={membre.commune ?? ""} maxLength={100} />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Droit à l'image</legend>
        <label className="case">
          <input type="radio" name="droitImage" value="oui" required defaultChecked={membre.droitImage} />
          <span>J'autorise l'utilisation de mon image (journal, site, réseaux sociaux de l'association).</span>
        </label>
        <label className="case">
          <input type="radio" name="droitImage" value="non" defaultChecked={!membre.droitImage} />
          <span>Je n'autorise pas l'utilisation de mon image.</span>
        </label>
        <p className="refs" style={{ marginTop: "0.75rem" }}>
          Pour faire retirer une photo déjà publiée, écrivez-nous via la page Contacts.
        </p>
      </fieldset>

      <div className="actions">
        <BoutonEnvoi>Enregistrer</BoutonEnvoi>
      </div>
    </form>
  );
}
