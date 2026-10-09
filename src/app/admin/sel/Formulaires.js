"use client";

import { useActionState } from "react";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";
import { enregistrerRubrique, refuserAttestation, trancherLitige, validerAttestation } from "./actions";

export function VerificationAttestation({ id, dateDeclaree, demain }) {
  const [etatV, valider] = useActionState(validerAttestation, null);
  const [etatR, refuser] = useActionState(refuserAttestation, null);
  if (etatV?.ok || etatR?.ok) return <Retour etat={etatV?.ok ? etatV : etatR} />;
  return (
    <div className="actions" style={{ alignItems: "flex-end" }}>
      <form action={valider} className="actions">
        <input type="hidden" name="id" value={id} />
        <Retour etat={etatV} />
        <label className="champ">
          <span className="champ-libelle">Valable jusqu'au (lu sur l'attestation)</span>
          <input type="date" name="valideJusquau" required min={demain} defaultValue={dateDeclaree} />
        </label>
        <BoutonEnvoi className="bouton bouton-vert">Valider</BoutonEnvoi>
      </form>
      <details>
        <summary className="lien-danger">Refuser</summary>
        <form action={refuser} className="actions" style={{ marginTop: "0.5rem" }}>
          <input type="hidden" name="id" value={id} />
          <Retour etat={etatR} />
          <input type="text" name="motif" maxLength={500} placeholder="Motif (envoyé au membre)" aria-label="Motif du refus" />
          <BoutonEnvoi className="bouton bouton-danger">Refuser</BoutonEnvoi>
        </form>
      </details>
    </div>
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
