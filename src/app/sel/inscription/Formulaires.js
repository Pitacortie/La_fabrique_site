"use client";

import { useActionState } from "react";
import { accepterTextesSel, declarerAssurance, inscrireSel } from "@/app/sel/actions/inscription";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";

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

// SEL-2, SEL-21 : déclaration sur l'honneur, sans document à fournir
function Assurance({ valeurs }) {
  return (
    <fieldset>
      <legend>Assurance responsabilité civile</legend>
      <p className="meta">
        Elle est obligatoire pour échanger dans le SEL. Elle est souvent comprise dans l'assurance habitation : le numéro de
        contrat figure sur votre avis d'échéance. Aucun document n'est demandé.
      </p>
      <label className="case">
        <input type="checkbox" name="possedeRc" required defaultChecked={!!valeurs} />
        <span>Je possède une assurance responsabilité civile en cours de validité. <span className="obligatoire">*</span></span>
      </label>
      <div className="champs" style={{ marginTop: "1rem" }}>
        <div className="champ">
          <label htmlFor="numeroPolice">Numéro de police (contrat) <span className="obligatoire">*</span></label>
          <input id="numeroPolice" name="numeroPolice" type="text" required maxLength={60} defaultValue={valeurs?.numeroPolice ?? ""} />
        </div>
        <div className="champ">
          <label htmlFor="compagnie">Compagnie d'assurance <span className="obligatoire">*</span></label>
          <input id="compagnie" name="compagnie" type="text" required maxLength={100} placeholder="Ex. : MAIF, Groupama…" defaultValue={valeurs?.compagnie ?? ""} />
        </div>
      </div>
      <div className="champ" style={{ marginTop: "1rem" }}>
        <label htmlFor="adresseCompagnie">Adresse de la compagnie <span className="obligatoire">*</span></label>
        <input id="adresseCompagnie" name="adresseCompagnie" type="text" required maxLength={200} defaultValue={valeurs?.adresseCompagnie ?? ""} />
      </div>
    </fieldset>
  );
}

export function FormulaireInscription({ textes }) {
  const [etat, action] = useActionState(inscrireSel, null);
  return (
    <form action={action} className="formulaire formulaire-large">
      <Retour etat={etat} />
      <Textes textes={textes} />
      <Assurance />
      <div className="actions">
        <BoutonEnvoi enCours="Envoi…">M'inscrire au SEL</BoutonEnvoi>
      </div>
    </form>
  );
}

export function FormulaireAssurance({ valeurs }) {
  const [etat, action] = useActionState(declarerAssurance, null);
  return (
    <form action={action} className="formulaire formulaire-large">
      <Retour etat={etat} />
      <Assurance valeurs={valeurs} />
      <div className="actions">
        <BoutonEnvoi>Enregistrer mon assurance</BoutonEnvoi>
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
