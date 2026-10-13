"use client";

import { useActionState } from "react";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";
import { libellesCategorie } from "@/lib/site";
import { changerStatutMembre, modifierMembre, supprimerMembreAction } from "../actions";

export function FormulaireRole({ membre }) {
  const [etat, action] = useActionState(modifierMembre, null);
  return (
    <form action={action} className="formulaire" style={{ maxWidth: "none" }}>
      <input type="hidden" name="id" value={membre.id} />
      <Retour etat={etat} />
      <div className="champs">
        <div className="champ">
          <label htmlFor="categorie">Catégorie</label>
          <select id="categorie" name="categorie" defaultValue={membre.categorie}>
            {Object.entries(libellesCategorie).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="champ">
          <label htmlFor="role">Rôle sur le site</label>
          <select id="role" name="role" defaultValue={membre.role}>
            <option value="ADHERENT">Adhérent</option>
            <option value="ADMINISTRATEUR">Administrateur (console)</option>
            <option value="BUREAU">Membre du Bureau (console + adhésions, cotisations, textes)</option>
          </select>
        </div>
      </div>
      <label className="case">
        <input type="checkbox" name="peutPublier" defaultChecked={membre.peutPublier} />
        <span>Mandaté pour publier des actualités au nom de l'association (toujours vrai pour le Bureau)</span>
      </label>
      <div className="actions">
        <BoutonEnvoi className="bouton bouton-secondaire">Enregistrer</BoutonEnvoi>
      </div>
    </form>
  );
}

export function FormulaireStatut({ membre }) {
  const [etat, action] = useActionState(changerStatutMembre, null);
  const suspendu = membre.statut === "SUSPENDU";
  return (
    <form action={action} className="formulaire" style={{ maxWidth: "none" }}>
      <input type="hidden" name="id" value={membre.id} />
      <Retour etat={etat} />
      {suspendu ? (
        <div className="actions">
          <span className="meta">Suspendu{membre.motifStatut ? ` : ${membre.motifStatut}` : ""}</span>
          <BoutonEnvoi name="action" value="reactiver" className="bouton bouton-secondaire">Réactiver le compte</BoutonEnvoi>
        </div>
      ) : (
        <div className="actions">
          <input type="text" name="motif" maxLength={500} placeholder="Motif (facultatif)" aria-label="Motif de la suspension" style={{ flex: "1 1 16rem", width: "auto" }} />
          <BoutonEnvoi name="action" value="suspendre" className="bouton bouton-secondaire">Suspendre le compte</BoutonEnvoi>
        </div>
      )}
    </form>
  );
}

export function FormulaireSuppression({ membre, anonymisation }) {
  const [etat, action] = useActionState(supprimerMembreAction, null);
  return (
    <form action={action} className="formulaire" style={{ maxWidth: "none" }}>
      <input type="hidden" name="id" value={membre.id} />
      <Retour etat={etat} />
      <p>
        {anonymisation
          ? "Ce membre a un historique d'échanges avec d'autres membres. Son identité (nom, e-mail, téléphone, adresse, date de naissance) sera effacée et son compte clôturé ; son solde de briques rejoindra le compte de solidarité. Seul son code restera dans l'historique des autres."
          : "Ce membre n'a aucun historique partagé : son compte et toutes ses données seront supprimés définitivement."}
      </p>
      <div className="champ">
        <label htmlFor="confirmation">Pour confirmer, recopiez son adresse e-mail : <strong>{membre.email}</strong></label>
        <input id="confirmation" name="confirmation" type="text" required autoComplete="off" />
      </div>
      <div className="actions">
        <BoutonEnvoi className="bouton bouton-danger" enCours="Suppression…">
          {anonymisation ? "Effacer l'identité et clôturer le compte" : "Supprimer définitivement"}
        </BoutonEnvoi>
      </div>
    </form>
  );
}
