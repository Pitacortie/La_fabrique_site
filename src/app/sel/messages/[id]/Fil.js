"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { envoyerMessage } from "@/app/sel/actions/messagerie";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";

// MSG-13 : rafraîchissement régulier (toutes les 15 secondes, seulement si l'onglet est visible)
export function Rafraichir() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 15_000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}

// Fait défiler jusqu'au dernier message
export function DefilerEnBas({ cible }) {
  useEffect(() => {
    document.getElementById(cible)?.scrollIntoView({ block: "end" });
  }, [cible]);
  return null;
}

export function FormulaireMessage({ conversationId }) {
  const [etat, action] = useActionState(envoyerMessage, null);
  const ref = useRef(null);
  useEffect(() => {
    if (etat?.ok) ref.current?.reset();
  }, [etat]);
  return (
    <form ref={ref} action={action} className="sel-composer">
      <input type="hidden" name="conversationId" value={conversationId} />
      <Retour etat={etat?.erreur ? etat : null} />
      <label htmlFor="texte" className="sr-only">Votre message</label>
      <textarea
        id="texte"
        name="texte"
        required
        minLength={2}
        maxLength={2000}
        rows={3}
        placeholder="Votre message…"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.form.requestSubmit();
        }}
      />
      <div className="actions">
        <BoutonEnvoi enCours="Envoi…">Envoyer</BoutonEnvoi>
        <span className="aide">Ctrl + Entrée pour envoyer</span>
      </div>
    </form>
  );
}
