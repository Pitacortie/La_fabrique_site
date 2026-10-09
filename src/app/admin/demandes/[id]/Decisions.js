"use client";

import { useActionState, useState } from "react";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";
import { libellesCategorie, libellesModeReglement } from "@/lib/site";
import { classerDemande, refuserDemande, renvoyerActivation, validerDemande } from "../actions";

// ADH-13 : valider = enregistrer la cotisation reçue (montant, mode, date, fin de validité) et la catégorie.
export function FormulaireValidation({ demande, aujourdhui, finAnnee }) {
  const [etat, action] = useActionState(validerDemande, null);
  return (
    <form action={action} className="formulaire formulaire-large">
      <input type="hidden" name="id" value={demande.id} />
      <Retour etat={etat} />
      <fieldset>
        <legend>Valider : cotisation reçue</legend>
        <div className="champs">
          <div className="champ">
            <label htmlFor="montant">Montant reçu (€)</label>
            <input id="montant" name="montant" type="number" min="1" max="10000" step="0.5" required defaultValue={demande.montant} />
          </div>
          <div className="champ">
            <label htmlFor="modeReglement">Mode de règlement</label>
            <select id="modeReglement" name="modeReglement" required defaultValue={demande.modeReglement}>
              {Object.entries(libellesModeReglement).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="champ">
            <label htmlFor="recueLe">Reçue le</label>
            <input id="recueLe" name="recueLe" type="date" required defaultValue={aujourdhui} />
          </div>
          <div className="champ">
            <label htmlFor="valideJusquau">Valable jusqu'au</label>
            <input id="valideJusquau" name="valideJusquau" type="date" required defaultValue={finAnnee} />
            <span className="aide">Fin de l'année civile.</span>
          </div>
          <div className="champ">
            <label htmlFor="categorie">Catégorie de membre</label>
            <select id="categorie" name="categorie" required defaultValue="ADHERENT">
              {Object.entries(libellesCategorie).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <span className="aide">Membre actif : sur agrément du CA, délégué au Bureau.</span>
          </div>
        </div>
      </fieldset>
      <div className="actions">
        <BoutonEnvoi className="bouton bouton-vert" enCours="Validation…">Valider l'adhésion et envoyer le lien d'activation</BoutonEnvoi>
      </div>
    </form>
  );
}

// ADH-5 : refus avec motif facultatif ; ADH-14 : classement sans suite.
export function FormulaireRefus({ id }) {
  const [etat, action] = useActionState(refuserDemande, null);
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="carte carte-terracotta">
      <h2>Refuser ou classer</h2>
      <div hidden={ouvert} className="actions">
        <button type="button" className="bouton bouton-secondaire" onClick={() => setOuvert(true)}>Refuser la demande…</button>
        <form action={classerDemande}>
          <input type="hidden" name="id" value={id} />
          <BoutonEnvoi className="lien-action" enCours="…">Classer sans suite (cotisation jamais reçue)</BoutonEnvoi>
        </form>
      </div>
      <form action={action} hidden={!ouvert} className="formulaire">
        <input type="hidden" name="id" value={id} />
        <Retour etat={etat} />
        <div className="champ">
          <label htmlFor="motif">Motif (facultatif, envoyé au postulant)</label>
          <textarea id="motif" name="motif" rows={3} maxLength={1000} />
          <span className="aide">Les statuts n'imposent pas de motiver un refus. Un e-mail poli est envoyé dans tous les cas.</span>
        </div>
        <div className="actions">
          <BoutonEnvoi className="bouton bouton-danger" enCours="Envoi…">Refuser et prévenir le postulant</BoutonEnvoi>
          <button type="button" className="bouton bouton-secondaire" onClick={() => setOuvert(false)}>Annuler</button>
        </div>
      </form>
    </div>
  );
}

export function BoutonRenvoyer({ membreId }) {
  const [etat, action] = useActionState(renvoyerActivation, null);
  return (
    <form action={action} className="actions">
      <input type="hidden" name="membreId" value={membreId} />
      <BoutonEnvoi className="bouton bouton-secondaire" enCours="Envoi…">Renvoyer le lien d'activation</BoutonEnvoi>
      <Retour etat={etat} />
    </form>
  );
}
