"use client";

import { useState } from "react";
import { libellesModeReglement } from "@/lib/site";

// Formulaire repris du bulletin d'adhésion 2026 (annexe G), dans le même ordre.
// Squelette : l'enregistrement (DemandeAdhesion + Acceptation) sera branché à l'étape « Adhérer ».

function age(dateNaissance) {
  if (!dateNaissance) return null;
  const naissance = new Date(dateNaissance);
  const auj = new Date();
  let a = auj.getFullYear() - naissance.getFullYear();
  const m = auj.getMonth() - naissance.getMonth();
  if (m < 0 || (m === 0 && auj.getDate() < naissance.getDate())) a--;
  return a;
}

// Textes affichés au-dessus de chaque case (ADH-2). Le contenu complet vient de TexteJuridique ;
// le résumé ne s'affiche que si le texte n'a pas encore été saisi dans la console.
const CASES = [
  {
    type: "CHARTE_NEUTRALITE",
    nom: "accepteCharte",
    titre: "Charte de neutralité et de participation",
    extrait:
      "Huit principes : neutralité et indépendance, respect et bienveillance, participation et esprit collectif, transparence, inclusion et non-discrimination, communication responsable, représentation de l'Association, gestion des conflits.",
    libelle: "Je reconnais avoir pris connaissance de la charte et m'engage à la respecter.",
  },
  {
    type: "STATUTS",
    nom: "accepteStatuts",
    titre: "Statuts de l'association",
    extrait:
      "Statuts signés le 31/01/2026 : objet, neutralité et indépendance (art. 3), membres, admission, droit de vote, gouvernance, outils numériques. En adhérant, je m'engage à ne pas utiliser l'association comme support de promotion politique.",
    libelle: "Je reconnais avoir pris connaissance des statuts de l'association et les accepter.",
  },
  {
    type: "REGLEMENT_INTERIEUR",
    nom: "accepteReglement",
    titre: "Règlement intérieur",
    extrait:
      "Quinze articles : adhésion, cotisation, instances, matériel, discipline, communication et confidentialité, ateliers des bâtisseurs, initiatives habitantes, consultations citoyennes.",
    libelle: "Je reconnais avoir pris connaissance du règlement intérieur et m'engage à le respecter.",
  },
];

export default function FormulaireAdhesion({ textes = {} }) {
  const [dateNaissance, setDateNaissance] = useState("");
  const [cases, setCases] = useState({});
  const [envoye, setEnvoye] = useState(false);

  const mineur = (age(dateNaissance) ?? 99) < 18;
  const coche = (nom) => (e) => setCases((c) => ({ ...c, [nom]: e.target.checked }));
  const obligatoires = ["accepteCharte", "accepteStatuts", "accepteReglement", "consentementAnonymat", "certifie", "rgpd"];
  const pret = obligatoires.every((n) => cases[n]);

  function onSubmit(e) {
    e.preventDefault();
    setEnvoye(true);
  }

  if (envoye) {
    return (
      <div className="message-info" role="status">
        <strong>Aperçu uniquement.</strong> L'envoi des demandes n'est pas encore branché sur la base de données.
      </div>
    );
  }

  return (
    <form className="formulaire" onSubmit={onSubmit} noValidate={false}>
      {/* Champ piège anti-spam (ADH-8) : invisible pour les humains */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}>
        <label htmlFor="site_web">Ne pas remplir</label>
        <input id="site_web" name="site_web" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset>
        <legend>Coordonnées du membre</legend>
        <div className="champs">
          <div className="champ">
            <label htmlFor="nom">Nom <span className="obligatoire">*</span></label>
            <input id="nom" name="nom" type="text" required autoComplete="family-name" />
          </div>
          <div className="champ">
            <label htmlFor="prenom">Prénom <span className="obligatoire">*</span></label>
            <input id="prenom" name="prenom" type="text" required autoComplete="given-name" />
          </div>
          <div className="champ">
            <label htmlFor="email">Adresse e-mail <span className="obligatoire">*</span></label>
            <input id="email" name="email" type="email" required autoComplete="email" />
            <span className="aide">Elle servira d'identifiant de connexion.</span>
          </div>
          <div className="champ">
            <label htmlFor="telephone">Téléphone <span className="obligatoire">*</span></label>
            <input id="telephone" name="telephone" type="tel" required autoComplete="tel" pattern="[0-9 +().-]{10,}" />
          </div>
          <div className="champ">
            <label htmlFor="dateNaissance">Date de naissance <span className="obligatoire">*</span></label>
            <input
              id="dateNaissance"
              name="dateNaissance"
              type="date"
              required
              value={dateNaissance}
              onChange={(e) => setDateNaissance(e.target.value)}
            />
          </div>
        </div>
        <div className="champs" style={{ marginTop: "1rem" }}>
          <div className="champ" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="adresse">Adresse <span className="obligatoire">*</span></label>
            <input id="adresse" name="adresse" type="text" required autoComplete="street-address" />
          </div>
          <div className="champ">
            <label htmlFor="codePostal">Code postal <span className="obligatoire">*</span></label>
            <input id="codePostal" name="codePostal" type="text" required inputMode="numeric" pattern="[0-9]{5}" autoComplete="postal-code" />
          </div>
          <div className="champ">
            <label htmlFor="commune">Commune <span className="obligatoire">*</span></label>
            <input id="commune" name="commune" type="text" required autoComplete="address-level2" />
          </div>
        </div>
      </fieldset>

      {/* ADH-16 : bloc affiché et obligatoire uniquement pour un postulant mineur */}
      {mineur && (
        <fieldset>
          <legend>Pour les mineurs</legend>
          <p className="refs">La demande d'un mineur est validée par son représentant légal.</p>
          <div className="champs">
            <div className="champ">
              <label htmlFor="responsableNom">Nom du responsable légal <span className="obligatoire">*</span></label>
              <input id="responsableNom" name="responsableNom" type="text" required />
            </div>
            <div className="champ">
              <label htmlFor="responsableLien">Lien de parenté <span className="obligatoire">*</span></label>
              <select id="responsableLien" name="responsableLien" required defaultValue="">
                <option value="" disabled>Choisir…</option>
                <option>Mère</option>
                <option>Père</option>
                <option>Tuteur ou tutrice</option>
                <option>Autre</option>
              </select>
            </div>
            <div className="champ">
              <label htmlFor="responsableTelephone">Téléphone du responsable <span className="obligatoire">*</span></label>
              <input id="responsableTelephone" name="responsableTelephone" type="tel" required />
            </div>
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend>Droit à l'image</legend>
        <label className="case">
          <input type="radio" name="droitImage" value="oui" required />
          <span>J'autorise l'utilisation de mon image (journal, site, réseaux sociaux de l'association).</span>
        </label>
        <label className="case">
          <input type="radio" name="droitImage" value="non" />
          <span>Je n'autorise pas l'utilisation de mon image.</span>
        </label>
      </fieldset>

      <fieldset>
        <legend>Cotisation</legend>
        <p>
          Adhésion annuelle : <strong>1 € minimum</strong> par personne et par année civile. Le règlement se fait hors
          du site ; un membre du Bureau enregistre la cotisation reçue.
        </p>
        <div className="champs">
          <div className="champ">
            <label htmlFor="montant">Montant donné (€) <span className="obligatoire">*</span></label>
            <input id="montant" name="montant" type="number" min="1" step="0.5" defaultValue="1" required />
          </div>
          <div className="champ">
            <label htmlFor="modeReglement">Mode de règlement <span className="obligatoire">*</span></label>
            <select id="modeReglement" name="modeReglement" required defaultValue="">
              <option value="" disabled>Choisir…</option>
              {Object.entries(libellesModeReglement).map(([valeur, libelle]) => (
                <option key={valeur} value={valeur}>{libelle}</option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {/* ADH-2 : trois cases distinctes, non précochées, enregistrées avec la version du texte */}
      {CASES.map((t) => (
        <fieldset key={t.nom}>
          <legend>{t.titre}</legend>
          <div className="texte-legal" tabIndex={0}>
            {textes[t.type] ? (
              <>
                <p className="refs">Version {textes[t.type].version}</p>
                <pre className="texte-complet">{textes[t.type].contenu}</pre>
              </>
            ) : (
              <p>{t.extrait}</p>
            )}
          </div>
          {textes[t.type] && <input type="hidden" name={`${t.nom}Version`} value={textes[t.type].id} />}
          <label className="case">
            <input type="checkbox" name={t.nom} required checked={!!cases[t.nom]} onChange={coche(t.nom)} />
            <span>{t.libelle} <span className="obligatoire">*</span></span>
          </label>
        </fieldset>
      ))}

      {/* ADH-3 : consentement à la levée d'anonymat (section 6.4), texte définitif à rédiger */}
      <fieldset>
        <legend>Anonymat dans les services</legend>
        <div className="texte-legal" tabIndex={0}>
          <p>
            Dans les services de l'association (comme le SEL), vous apparaissez sous un code personnel. Votre identité
            n'est révélée qu'à l'autre personne d'un échange, et seulement si vous êtes d'accord tous les deux. Une
            information révélée ne peut pas être reprise. En cas de litige, un administrateur habilité peut accéder à
            votre identité ; chaque accès est enregistré. Vous pouvez retirer ce consentement pour l'avenir.
          </p>
        </div>
        <label className="case">
          <input type="checkbox" name="consentementAnonymat" required checked={!!cases.consentementAnonymat} onChange={coche("consentementAnonymat")} />
          <span>J'ai compris et j'accepte ces règles de levée d'anonymat. <span className="obligatoire">*</span></span>
        </label>
      </fieldset>

      <fieldset>
        <legend>Finalisation</legend>
        {mineur && <p className="refs">Pour un mineur, ces cases sont cochées par le représentant légal.</p>}
        <label className="case">
          <input type="checkbox" name="certifie" required checked={!!cases.certifie} onChange={coche("certifie")} />
          <span>
            Je certifie l'exactitude des informations fournies et je valide mon adhésion. Cette action vaut signature
            électronique et acceptation du règlement intérieur de l'association. <span className="obligatoire">*</span>
          </span>
        </label>
        <label className="case">
          <input type="checkbox" name="rgpd" required checked={!!cases.rgpd} onChange={coche("rgpd")} />
          <span>
            J'autorise l'association à conserver mes données pour la gestion interne (RGPD).{" "}
            <a href="/confidentialite">En savoir plus</a> <span className="obligatoire">*</span>
          </span>
        </label>
      </fieldset>

      <div className="actions">
        <button type="submit" className="bouton" disabled={!pret}>Envoyer ma demande d'adhésion</button>
        {!pret && <span className="refs">Toutes les cases obligatoires doivent être cochées.</span>}
      </div>
    </form>
  );
}
