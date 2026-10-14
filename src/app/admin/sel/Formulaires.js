"use client";

import { useActionState } from "react";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";
import { aiderAvecSolidarite, enregistrerRubrique, trancherLitige } from "./actions";

export function AideSolidarite() {
  const [etat, action] = useActionState(aiderAvecSolidarite, null);
  return (
    <form action={action} className="formulaire" style={{ maxWidth: "none" }}>
      <Retour etat={etat} />
      <div className="champs">
        <div className="champ">
          <label htmlFor="code">Code du membre aidé</label>
          <input id="code" name="code" type="text" required maxLength={20} placeholder="FAB-…" autoComplete="off" />
        </div>
        <div className="champ">
          <label htmlFor="montant">Briques</label>
          <input id="montant" name="montant" type="number" min={1} step={1} required />
        </div>
      </div>
      <div className="champ" style={{ marginTop: "1rem" }}>
        <label htmlFor="motif">Motif (conservé au journal)</label>
        <input id="motif" name="motif" type="text" required minLength={5} maxLength={300} />
      </div>
      <div className="actions">
        <BoutonEnvoi className="bouton">Verser l'aide</BoutonEnvoi>
      </div>
    </form>
  );
}

export function DecisionLitige({ id }) {
  const [etat, action] = useActionState(trancherLitige, null);
  if (etat?.ok) return <Retour etat={etat} />;
  return (
    <form action={action} className="formulaire" style={{ maxWidth: "none" }}>
      <input type="hidden" name="id" value={id} />
      <Retour etat={etat} />
      <div className="champ">
        <label htmlFor={`note-${id}`}>Décision après médiation</label>
        <input id={`note-${id}`} name="note" type="text" required minLength={5} maxLength={1000} placeholder="Ex. : après échange avec les deux parties, 45 min retenues" />
      </div>
      <div className="actions">
        <BoutonEnvoi name="decision" value="valider" className="bouton bouton-vert">Valider la déclaration</BoutonEnvoi>
        <BoutonEnvoi name="decision" value="annuler" className="bouton bouton-secondaire">Annuler l'échange</BoutonEnvoi>
      </div>
    </form>
  );
}

export function FormulaireRubrique({ rubrique }) {
  const [etat, action] = useActionState(enregistrerRubrique, null);
  const r = rubrique ?? { libelle: "", exemples: "", rappel: "", ordre: 99, actif: true };
  const p = rubrique?.id ?? "nouvelle";
  return (
    <form action={action} className="carte bloc-edition formulaire" style={{ maxWidth: "none" }}>
      {rubrique && <input type="hidden" name="id" value={rubrique.id} />}
      <Retour etat={etat} />
      <div className="champs">
        <div className="champ">
          <label htmlFor={`${p}-libelle`}>Libellé</label>
          <input id={`${p}-libelle`} name="libelle" type="text" required maxLength={60} defaultValue={r.libelle} />
        </div>
        <div className="champ">
          <label htmlFor={`${p}-ordre`}>Ordre</label>
          <input id={`${p}-ordre`} name="ordre" type="number" min="0" max="999" defaultValue={r.ordre} />
        </div>
      </div>
      <div className="champ">
        <label htmlFor={`${p}-exemples`}>Exemples (simples suggestions)</label>
        <input id={`${p}-exemples`} name="exemples" type="text" maxLength={500} defaultValue={r.exemples ?? ""} />
      </div>
      <div className="champ">
        <label htmlFor={`${p}-rappel`}>Rappel de prudence affiché dans la rubrique</label>
        <input id={`${p}-rappel`} name="rappel" type="text" maxLength={500} defaultValue={r.rappel ?? ""} />
      </div>
      <div className="actions">
        <label className="case" style={{ marginTop: 0 }}>
          <input type="checkbox" name="actif" defaultChecked={r.actif} /> <span>Active</span>
        </label>
        <BoutonEnvoi>{rubrique ? "Enregistrer" : "Ajouter la rubrique"}</BoutonEnvoi>
      </div>
    </form>
  );
}
