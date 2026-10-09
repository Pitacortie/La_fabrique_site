"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";
import TexteSimple from "@/components/TexteSimple";
import { libellesModeReglement } from "@/lib/site";
import { deposerDemande } from "./actions";
import { ChampDate } from "@/components/ChampsDate";

// Formulaire repris du bulletin d'adhésion 2026 (annexe G), dans le même ordre.
// Deux étapes (ADH-16) : saisie, puis récapitulatif avant envoi. Les champs restent dans la page
// pendant le récapitulatif (masqués) : c'est le même formulaire qui est envoyé.

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
      "Statuts signés le 31/01/2026 : objet, neutralité et indépendance, membres, admission, droit de vote, gouvernance, outils numériques. En adhérant, je m'engage à ne pas utiliser l'association comme support de promotion politique.",
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

const OBLIGATOIRES = ["accepteCharte", "accepteStatuts", "accepteReglement", "consentementAnonymat", "certifie", "rgpd"];

const dateFr = (v) => (v ? new Date(`${v}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");

// Lignes du récapitulatif, lues dans le formulaire au moment de passer à l'étape 2
function recapitulatif(form, mineur) {
  // Valeur envoyée sous ce nom (pour une date : le champ caché aaaa-mm-jj, pas la case jj/mm/aaaa)
  const v = (n) => (form.querySelector(`[name="${n}"]`)?.value ?? "").trim();
  const lignes = [
    ["Nom", `${v("prenom")} ${v("nom")}`],
    ["Adresse e-mail (identifiant)", v("email")],
    ["Téléphone", v("telephone")],
    ["Date de naissance", dateFr(v("dateNaissance"))],
    ["Adresse", `${v("adresse")}, ${v("codePostal")} ${v("commune")}`],
  ];
  if (mineur) lignes.push(["Responsable légal", `${v("responsableNom")} (${v("responsableLien")}), ${v("responsableTelephone")}`]);
  lignes.push(
    ["Droit à l'image", form.elements.droitImage.value === "oui" ? "J'autorise l'utilisation de mon image" : "Je n'autorise pas l'utilisation de mon image"],
    ["Cotisation", `${v("montant")} €, ${libellesModeReglement[v("modeReglement")]?.toLowerCase() ?? ""}`],
    ["Textes acceptés", "Charte de neutralité, statuts, règlement intérieur"],
  );
  return lignes;
}

export default function FormulaireAdhesion({ textes = {} }) {
  const formRef = useRef(null);
  const [etat, action] = useActionState(deposerDemande, null);
  const [dateNaissance, setDateNaissance] = useState("");
  const [cases, setCases] = useState({});
  const [recap, setRecap] = useState(null); // null = étape 1 (saisie), sinon lignes du récapitulatif

  const mineur = (age(dateNaissance) ?? 99) < 18;
  const coche = (nom) => (e) => setCases((c) => ({ ...c, [nom]: e.target.checked }));
  const pret = OBLIGATOIRES.every((n) => cases[n]);

  // Erreur renvoyée par le serveur : retour à la saisie pour corriger
  useEffect(() => {
    if (etat?.erreur) {
      setRecap(null);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [etat]);

  function verifier() {
    const form = formRef.current;
    if (!form.reportValidity()) return;
    setRecap(recapitulatif(form, mineur));
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (etat?.ok) {
    return (
      <div className="carte carte-vert" role="status">
        <h2>Merci{etat.prenom ? ` ${etat.prenom}` : ""}, votre demande est envoyée !</h2>
        <p>Un e-mail de confirmation vient de vous être envoyé. Pensez à regarder dans les indésirables.</p>
        <h3>Prochaine étape : régler votre cotisation</h3>
        <TexteSimple texte={etat.paiement} />
        <p>
          Dès qu'un membre du Bureau aura reçu votre cotisation, il validera votre adhésion et vous recevrez un e-mail
          pour créer votre mot de passe.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="formulaire" noValidate={false}>
      <Retour etat={etat?.erreur ? etat : null} />

      {recap && (
        <section className="carte carte-bleu" aria-labelledby="titre-recap">
          <h2 id="titre-recap">Vérifiez votre demande</h2>
          <dl className="liste-def">
            {recap.map(([libelle, valeur]) => (
              <div key={libelle} style={{ display: "contents" }}>
                <dt>{libelle}</dt>
                <dd>{valeur}</dd>
              </div>
            ))}
          </dl>
          <div className="actions" style={{ marginTop: "1.25rem" }}>
            <BoutonEnvoi enCours="Envoi en cours…">Envoyer ma demande d'adhésion</BoutonEnvoi>
            <button type="button" className="bouton bouton-secondaire" onClick={() => setRecap(null)}>
              Modifier
            </button>
          </div>
        </section>
      )}

      {/* Étape 1 : la saisie. Masquée (mais toujours envoyée) pendant le récapitulatif. */}
      <div hidden={!!recap} className="formulaire">
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
              <input id="nom" name="nom" type="text" required maxLength={100} autoComplete="family-name" />
            </div>
            <div className="champ">
              <label htmlFor="prenom">Prénom <span className="obligatoire">*</span></label>
              <input id="prenom" name="prenom" type="text" required maxLength={100} autoComplete="given-name" />
            </div>
            <div className="champ">
              <label htmlFor="email">Adresse e-mail <span className="obligatoire">*</span></label>
              <input id="email" name="email" type="email" required maxLength={200} autoComplete="email" />
              <span className="aide">Elle servira d'identifiant de connexion.</span>
            </div>
            <div className="champ">
              <label htmlFor="telephone">Téléphone <span className="obligatoire">*</span></label>
              <input id="telephone" name="telephone" type="tel" required autoComplete="tel" pattern="[0-9 +().-]{10,20}" />
            </div>
            <div className="champ">
              <label htmlFor="dateNaissance">Date de naissance (jj/mm/aaaa) <span className="obligatoire">*</span></label>
              <ChampDate id="dateNaissance" name="dateNaissance" required naissance onChange={setDateNaissance} autoComplete="bday" />
            </div>
          </div>
          <div className="champs" style={{ marginTop: "1rem" }}>
            <div className="champ" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="adresse">Adresse <span className="obligatoire">*</span></label>
              <input id="adresse" name="adresse" type="text" required maxLength={200} autoComplete="street-address" />
            </div>
            <div className="champ">
              <label htmlFor="codePostal">Code postal <span className="obligatoire">*</span></label>
              <input id="codePostal" name="codePostal" type="text" required inputMode="numeric" pattern="[0-9]{5}" autoComplete="postal-code" />
            </div>
            <div className="champ">
              <label htmlFor="commune">Commune <span className="obligatoire">*</span></label>
              <input id="commune" name="commune" type="text" required maxLength={100} autoComplete="address-level2" />
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
                <input id="responsableNom" name="responsableNom" type="text" required maxLength={100} />
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
                <input id="responsableTelephone" name="responsableTelephone" type="tel" required pattern="[0-9 +().-]{10,20}" />
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
              <input id="montant" name="montant" type="number" min="1" max="10000" step="0.5" defaultValue="1" required />
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
          <button type="button" className="bouton" disabled={!pret} onClick={verifier}>
            Vérifier ma demande
          </button>
          {!pret && <span className="refs">Toutes les cases obligatoires doivent être cochées.</span>}
        </div>
      </div>
    </form>
  );
}
