"use client";

import { useActionState } from "react";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";
import { libellesModeReglement } from "@/lib/site";
import { enregistrerCotisation, lancerRappels } from "./actions";

export function FormulaireCotisation({ membres, aujourdhui, finAnnee }) {
  const [etat, action] = useActionState(enregistrerCotisation, null);
  return (
    <form action={action} className="formulaire formulaire-large">
      <Retour etat={etat} />
      <fieldset>
        <legend>Enregistrer une cotisation reçue</legend>
        <div className="champs">
          <div className="champ" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="membreId">Membre</label>
            <select id="membreId" name="membreId" required defaultValue="">
              <option value="" disabled>Choisir…</option>
              {membres.map((m) => (
                <option key={m.id} value={m.id}>{m.nom} {m.prenom} ({m.code})</option>
              ))}
            </select>
          </div>
          <div className="champ">
            <label htmlFor="montant">Montant (€)</label>
            <input id="montant" name="montant" type="number" min="1" max="10000" step="0.5" defaultValue="1" required />
          </div>
          <div className="champ">
            <label htmlFor="modeReglement">Mode de règlement</label>
            <select id="modeReglement" name="modeReglement" required defaultValue="">
              <option value="" disabled>Choisir…</option>
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
          </div>
        </div>
      </fieldset>
      <div className="actions">
        <BoutonEnvoi>Enregistrer la cotisation</BoutonEnvoi>
      </div>
    </form>
  );
}

export function BoutonRappels({ periode }) {
  const [etat, action] = useActionState(lancerRappels, null);
  return (
    <form action={action} className="actions">
      <BoutonEnvoi className="bouton bouton-secondaire" enCours="Envoi…" disabled={!periode}>
        Envoyer les rappels maintenant
      </BoutonEnvoi>
      <Retour etat={etat} />
    </form>
  );
}
