"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useActionState, useEffect, useRef, useState } from "react";
import { signalerBug } from "@/app/actions/signalements";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";
import { pageSansSecret } from "@/lib/signalements";

// Bouton « Signaler un bug » présent sur toutes les pages (période de test).
function Formulaire({ connecte, fermer }) {
  const pathname = usePathname();
  const recherche = useSearchParams().toString();
  const [etat, action] = useActionState(signalerBug, null);
  const [ecran, setEcran] = useState("");
  useEffect(() => setEcran(`${window.innerWidth}×${window.innerHeight}`), []);

  if (etat?.ok) {
    return (
      <>
        <Retour etat={etat} />
        <div className="actions" style={{ marginTop: "1rem" }}>
          <button type="button" className="bouton" onClick={fermer}>Fermer</button>
        </div>
      </>
    );
  }

  return (
    <form action={action} className="formulaire-bug">
      <input type="hidden" name="page" value={pageSansSecret(recherche ? `${pathname}?${recherche}` : pathname)} />
      <input type="hidden" name="ecran" value={ecran} />
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}>
        <label htmlFor="bug-site-web">Ne pas remplir</label>
        <input id="bug-site-web" name="site_web" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <Retour etat={etat} />
      <div className="champ">
        <label htmlFor="bug-description">Qu'est-ce qui ne va pas ?</label>
        <textarea
          id="bug-description"
          name="description"
          required
          minLength={10}
          maxLength={3000}
          rows={5}
          placeholder="Ex. : sur téléphone, le bouton « Envoyer » ne fait rien quand je…"
        />
      </div>
      {!connecte && (
        <div className="champ">
          <label htmlFor="bug-email">Votre e-mail (facultatif, pour vous répondre)</label>
          <input id="bug-email" name="email" type="email" autoComplete="email" maxLength={200} />
        </div>
      )}
      <p className="refs">La page et le type de navigateur sont joints automatiquement.</p>
      <div className="actions">
        <BoutonEnvoi enCours="Envoi…">Envoyer</BoutonEnvoi>
        <button type="button" className="bouton bouton-secondaire" onClick={fermer}>Annuler</button>
      </div>
    </form>
  );
}

export default function BoutonSignalement({ connecte }) {
  const dialogRef = useRef(null);
  const [cle, setCle] = useState(0); // remet le formulaire à zéro à chaque ouverture

  function ouvrir() {
    setCle((c) => c + 1);
    dialogRef.current?.showModal();
  }
  const fermer = () => dialogRef.current?.close();

  return (
    <>
      <button type="button" className="bouton-bug" onClick={ouvrir} aria-haspopup="dialog">
        <span aria-hidden="true">🐞</span> Signaler un bug
      </button>
      <dialog ref={dialogRef} className="dialogue-bug" aria-labelledby="titre-bug">
        <h2 id="titre-bug">Signaler un bug</h2>
        <Suspense>
          <Formulaire key={cle} connecte={connecte} fermer={fermer} />
        </Suspense>
      </dialog>
    </>
  );
}
