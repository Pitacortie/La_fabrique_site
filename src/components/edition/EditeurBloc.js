"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { enregistrerContenu, retablirContenu } from "@/app/actions/contenus";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";

// Texte modifiable sur place : le crayon ouvre la zone d'édition à l'endroit du texte.
// `children` est l'affichage normal (rendu par le serveur), `texte` la valeur brute à éditer.
export default function EditeurBloc({ cle, texte, libelle, ligne, modifie, children }) {
  const [ouvert, setOuvert] = useState(false);
  const [etat, enregistrer] = useActionState(enregistrerContenu, null);
  const [etatRetablir, retablir] = useActionState(retablirContenu, null);
  const formRef = useRef(null);
  const id = `edition-${cle}`;

  // Après un enregistrement réussi, la page est rafraîchie par le serveur : on referme l'éditeur.
  useEffect(() => {
    if (etat?.ok || etatRetablir?.ok) setOuvert(false);
  }, [etat, etatRetablir]);

  function annuler() {
    formRef.current?.reset();
    setOuvert(false);
  }

  return (
    <div className={`editable${ligne ? " editable-ligne" : ""}${ouvert ? " editable-ouvert" : ""}`}>
      <div hidden={ouvert}>
        {children}
        <button type="button" className="crayon" onClick={() => setOuvert(true)} aria-label={`Modifier : ${libelle}`} title={`Modifier : ${libelle}`}>
          ✏️
        </button>
      </div>

      <div hidden={!ouvert} className="editable-panneau">
        <form ref={formRef} action={enregistrer}>
          <input type="hidden" name="cle" value={cle} />
          <label htmlFor={id} className="editable-libelle">{libelle}</label>
          {ligne ? (
            <input id={id} name="contenu" type="text" defaultValue={texte} required maxLength={300} />
          ) : (
            <textarea id={id} name="contenu" defaultValue={texte} required maxLength={5000} rows={Math.min(14, Math.max(4, texte.split("\n").length + 2))} />
          )}
          {!ligne && <span className="aide">Une ligne vide sépare deux paragraphes.</span>}
          <div className="actions">
            <BoutonEnvoi>Enregistrer</BoutonEnvoi>
            <button type="button" className="bouton bouton-secondaire" onClick={annuler}>Annuler</button>
            {modifie && <span className="meta">{modifie}</span>}
          </div>
          <Retour etat={etat?.erreur ? etat : null} />
        </form>
        {modifie && (
          <form action={retablir} className="editable-retablir">
            <input type="hidden" name="cle" value={cle} />
            <BoutonEnvoi className="lien-action" enCours="…">Revenir au texte d'origine</BoutonEnvoi>
          </form>
        )}
      </div>
    </div>
  );
}
