"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
export function FormulaireSignalement({ annonceId, messageId, libelle = "Signaler" }) {
  const [etat, action] = useActionState(signalerSel, null);
  const [ouvert, setOuvert] = useState(false);
  if (etat?.ok) return <span className="meta" role="status">{etat.ok}</span>;
  return (
    <>
      <button type="button" className="lien-action sel-signaler" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert}>
        {libelle}
      </button>
      <form action={action} hidden={!ouvert} className="sel-signalement">
        {annonceId && <input type="hidden" name="annonceId" value={annonceId} />}
        {messageId && <input type="hidden" name="messageId" value={messageId} />}
        <Retour etat={etat} />
        <select name="motif" required defaultValue="" aria-label="Motif du signalement">
          <option value="" disabled>Motif…</option>
          {Object.entries(libellesMotifSignalement).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input type="text" name="details" maxLength={1000} placeholder="Précisions (facultatif)" aria-label="Précisions" />
        <BoutonEnvoi className="bouton bouton-secondaire" enCours="…">Envoyer le signalement</BoutonEnvoi>
      </form>
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
