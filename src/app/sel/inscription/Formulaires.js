"use client";

import { useActionState } from "react";
import { accepterTextesSel, deposerAttestation, inscrireSel } from "@/app/sel/actions/inscription";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";
import { ChampDate } from "@/components/ChampsDate";

function Textes({ textes }) {
  return textes.map((t) => (
    <fieldset key={t.type}>
      <legend>{t.titre}</legend>
      <p className="refs">Version {t.version}</p>
      <div className="texte-legal" tabIndex={0}>
        <pre className="texte-complet">{t.contenu}</pre>
      </div>
      <input type="hidden" name={`version-${t.type}`} value={t.id} />
      <label className="case">
        <input type="checkbox" name={`accepte-${t.type}`} required />
        <span>
          {t.type === "CHARTE_SEL"
            ? "J'ai pris connaissance de la Charte des membres du SEL et je m'engage à la respecter."
            : "J'ai pris connaissance du Règlement intérieur du SEL et je l'accepte."}{" "}
          <span className="obligatoire">*</span>
        </span>
      </label>
    </fieldset>
  ));
}

function Attestation({ demain }) {
  return (
    <fieldset>
      <legend>Attestation d'assurance responsabilité civile</legend>
      <p className="meta">
        Elle est exigée pour échanger dans le SEL (Règlement du SEL). Un membre du Bureau la vérifie, note sa date de
        validité, puis <strong>supprime le fichier</strong>.
      </p>
      <div className="champs">
        <div className="champ">
          <label htmlFor="assureur">Assureur <span className="obligatoire">*</span></label>
          <input id="assureur" name="assureur" type="text" required maxLength={100} placeholder="Ex. : MAIF, Groupama…" />
        </div>
        <div className="champ">
          <label htmlFor="valideJusquau">Valable jusqu'au <span className="obligatoire">*</span></label>
          <ChampDate id="valideJusquau" name="valideJusquau" required min={demain} />
        </div>
      </div>
      <div className="champ" style={{ marginTop: "1rem" }}>
        <label htmlFor="fichier">Attestation (PDF, JPEG ou PNG, 5 Mo maximum) <span className="obligatoire">*</span></label>
        <input id="fichier" name="fichier" type="file" required accept="application/pdf,image/jpeg,image/png" />
        <span className="aide">Souvent incluse dans l'assurance habitation : demandez-la à votre assureur.</span>
      </div>
      <label className="case">
        <input type="checkbox" name="certifie" required />
        <span>Je certifie que cette attestation est à mon nom et en cours de validité. <span className="obligatoire">*</span></span>
      </label>
    </fieldset>
  );
}

export function FormulaireInscription({ textes, demain }) {
  const [etat, action] = useActionState(inscrireSel, null);
  return (
    <form action={action} className="formulaire formulaire-large">
      <Retour etat={etat} />
      <Textes textes={textes} />
      <Attestation demain={demain} />
      <div className="actions">
        <BoutonEnvoi enCours="Envoi…">M'inscrire au SEL</BoutonEnvoi>
      </div>
    </form>
  );
}

export function FormulaireAttestation({ demain }) {
  const [etat, action] = useActionState(deposerAttestation, null);
  return (
    <form action={action} className="formulaire formulaire-large">
      <Retour etat={etat} />
      <Attestation demain={demain} />
      <div className="actions">
        <BoutonEnvoi enCours="Envoi…">Envoyer mon attestation</BoutonEnvoi>
      </div>
    </form>
  );
}

export function FormulaireTextesSel({ textes }) {
  const [etat, action] = useActionState(accepterTextesSel, null);
  return (
    <form action={action} className="formulaire formulaire-large">
      <Retour etat={etat} />
      <Textes textes={textes} />
      <div className="actions">
        <BoutonEnvoi>Accepter et entrer dans le SEL</BoutonEnvoi>
      </div>
    </form>
  );
}
