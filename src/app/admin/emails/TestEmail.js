"use client";

import { useActionState } from "react";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import { testerEmail } from "./actions";

export default function TestEmail({ email }) {
  const [r, action] = useActionState(testerEmail, null);
  return (
    <>
      <form action={action} className="actions">
        <label htmlFor="test-email-a" className="sr-only">Adresse de test</label>
        <input id="test-email-a" name="a" type="email" required defaultValue={email} style={{ flex: "1 1 16rem", width: "auto" }} />
        <BoutonEnvoi enCours="Test en cours (jusqu'à 30 s)…">Envoyer un e-mail de test</BoutonEnvoi>
      </form>
      {r && (
        <div className={r.ok ? "message-info" : "message-erreur"} role={r.ok ? "status" : "alert"} style={{ marginTop: "1rem" }}>
          {r.ok ? (
            <>✓ E-mail de test envoyé à {r.a}. Vérifiez la boîte de réception (et les indésirables).</>
          ) : (
            <>
              <strong>Échec {r.etape ? `à l'étape « ${r.etape} »` : ""} :</strong> {r.message}
              {r.piste && <><br />👉 {r.piste}</>}
            </>
          )}
        </div>
      )}
      {r?.config && (
        <dl className="liste-def meta" style={{ marginTop: "0.75rem" }}>
          <dt>Serveur</dt><dd>{r.config.serveur}</dd>
          <dt>Port</dt><dd>{r.config.port}</dd>
          <dt>Identifiant</dt><dd>{r.config.identifiant}</dd>
          <dt>Clé</dt><dd>{r.config.motDePasse}</dd>
          <dt>Expéditeur</dt><dd>{r.config.expediteur}</dd>
          {r.reponse && (<><dt>Réponse</dt><dd>{r.reponse}</dd></>)}
        </dl>
      )}
    </>
  );
}
