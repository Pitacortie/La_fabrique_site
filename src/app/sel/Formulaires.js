"use client";

import { useActionState, useEffect, useRef } from "react";
import { signalerSel } from "@/app/sel/actions/annonces";
import { contacter } from "@/app/sel/actions/messagerie";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";
import { libellesMotifSignalement } from "@/lib/sel/regles";

const AVERTISSEMENT = "Ne donnez ni nom, ni adresse, ni numéro de téléphone avant la levée d'anonymat.";

// Premier message depuis une annonce : crée la conversation (MSG-2)
export function FormulaireContacter({ annonceId, code }) {
  const [etat, action] = useActionState(contacter, null);
  return (
    <form action={action} className="formulaire" style={{ maxWidth: "none" }}>
      <input type="hidden" name="annonceId" value={annonceId} />
      <Retour etat={etat} />
      <div className="champ">
        <label htmlFor="texte-contact">Écrire à {code}</label>
        <textarea id="texte-contact" name="texte" required minLength={2} maxLength={2000} rows={4} placeholder="Bonjour, votre annonce m'intéresse…" />
        <span className="aide">{AVERTISSEMENT}</span>
      </div>
      <div className="actions">
        <BoutonEnvoi enCours="Envoi…">Envoyer</BoutonEnvoi>
      </div>
    </form>
  );
}

// MSG-7, NEU-4 : signaler une annonce ou un message à la modération
// MSG-7, NEU-4 : signaler une annonce ou un message. Un petit bouton ouvre une fenêtre avec le motif.
export function FormulaireSignalement({ annonceId, messageId, libelle = "Signaler" }) {
  const [etat, action] = useActionState(signalerSel, null);
  const fenetre = useRef(null);
  const discret = !!messageId;
  return (
    <>
      <button
        type="button"
        className={discret ? "sel-signaler-icone" : "lien-action sel-signaler"}
        onClick={() => fenetre.current?.showModal()}
        aria-haspopup="dialog"
        aria-label={discret ? "Signaler ce message" : undefined}
        title={discret ? "Signaler ce message" : undefined}
      >
        {discret ? <span aria-hidden="true">⚑</span> : libelle}
      </button>
      <dialog ref={fenetre} className="dialogue-bug sel-dialogue-signalement" aria-label={discret ? "Signaler ce message" : libelle}>
        <h2>{discret ? "Signaler ce message" : libelle}</h2>
        {etat?.ok ? (
          <>
            <p className="message-info" role="status">{etat.ok}</p>
            <div className="actions">
              <button type="button" className="bouton" onClick={() => fenetre.current?.close()}>Fermer</button>
            </div>
          </>
        ) : (
          <form action={action} className="formulaire-bug">
            {annonceId && <input type="hidden" name="annonceId" value={annonceId} />}
            {messageId && <input type="hidden" name="messageId" value={messageId} />}
            <Retour etat={etat} />
            <p className="meta">Votre signalement est transmis à la modération, sans que l'autre personne le sache.</p>
            <div className="champ">
              <label htmlFor={`motif-${messageId ?? annonceId}`}>Motif</label>
              <select id={`motif-${messageId ?? annonceId}`} name="motif" required defaultValue="">
                <option value="" disabled>Choisissez…</option>
                {Object.entries(libellesMotifSignalement).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="champ">
              <label htmlFor={`details-${messageId ?? annonceId}`}>Précisions (facultatif)</label>
              <textarea id={`details-${messageId ?? annonceId}`} name="details" maxLength={1000} rows={3} />
            </div>
            <div className="actions">
              <BoutonEnvoi className="bouton" enCours="Envoi…">Envoyer le signalement</BoutonEnvoi>
              <button type="button" className="bouton bouton-secondaire" onClick={() => fenetre.current?.close()}>Annuler</button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}

// Formulaire générique d'une étape (rendez-vous, déclaration…) : affiche le retour, se vide après succès
export function FormulaireEtape({ action: actionServeur, children, className = "formulaire", reinitialiser = false }) {
  const [etat, action] = useActionState(actionServeur, null);
  const ref = useRef(null);
  useEffect(() => {
    if (etat?.ok && reinitialiser) ref.current?.reset();
  }, [etat, reinitialiser]);
  return (
    <form ref={ref} action={action} className={className} style={{ maxWidth: "none" }}>
      <Retour etat={etat} />
      {children}
    </form>
  );
}
