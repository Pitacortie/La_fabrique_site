"use client";

import { useActionState, useState } from "react";
import { modifierAnnonce, publierAnnonce } from "@/app/sel/actions/annonces";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";
import { libellesNature } from "@/lib/sel/regles";

// Publication ou modification d'une annonce (SEL-5). Les champs utiles changent selon la nature.
export default function FormulaireAnnonce({ rubriques, annonce, zoneParDefaut = "" }) {
  const [etat, action] = useActionState(annonce ? modifierAnnonce : publierAnnonce, null);
  const [nature, setNature] = useState(annonce?.nature ?? "SERVICE");
  const [rubriqueId, setRubriqueId] = useState(annonce?.rubriqueId ?? "");
  const rubrique = rubriques.find((r) => r.id === rubriqueId);
  const h = annonce?.dureeEstimee ? Math.floor(annonce.dureeEstimee / 60) : "";
  const m = annonce?.dureeEstimee ? annonce.dureeEstimee % 60 : "";

  return (
    <form action={action} className="formulaire formulaire-large">
      {annonce && <input type="hidden" name="id" value={annonce.id} />}
      <Retour etat={etat} />

      <fieldset>
        <legend>Votre annonce</legend>
        <div className="sel-choix">
          <label className="sel-choix-option">
            <input type="radio" name="type" value="OFFRE" required defaultChecked={!annonce || annonce.type === "OFFRE"} />
            <span><strong>Je propose</strong> un service ou un objet</span>
          </label>
          <label className="sel-choix-option">
            <input type="radio" name="type" value="DEMANDE" defaultChecked={annonce?.type === "DEMANDE"} />
            <span><strong>Je demande</strong> un service ou un objet</span>
          </label>
        </div>

        <div className="champs" style={{ marginTop: "1rem" }}>
          <div className="champ">
            <label htmlFor="rubriqueId">Catégorie <span className="obligatoire">*</span></label>
            <select id="rubriqueId" name="rubriqueId" required value={rubriqueId} onChange={(e) => setRubriqueId(e.target.value)}>
              <option value="" disabled>Choisir…</option>
              {rubriques.map((r) => (
                <option key={r.id} value={r.id}>{r.libelle}</option>
              ))}
            </select>
            {rubrique?.exemples && <span className="aide">Exemples : {rubrique.exemples}</span>}
          </div>
          <div className="champ">
            <label htmlFor="nature">Nature <span className="obligatoire">*</span></label>
            <select id="nature" name="nature" required value={nature} onChange={(e) => setNature(e.target.value)}>
              {Object.entries(libellesNature).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>
        {rubrique?.rappel && <p className="encart" style={{ marginTop: "1rem" }}>⚠️ {rubrique.rappel}</p>}

        <div className="champ" style={{ marginTop: "1rem" }}>
          <label htmlFor="titre">Titre <span className="obligatoire">*</span></label>
          <input id="titre" name="titre" type="text" required minLength={5} maxLength={100} defaultValue={annonce?.titre} placeholder="Ex. : Aide pour monter un meuble" />
        </div>
        <div className="champ" style={{ marginTop: "1rem" }}>
          <label htmlFor="description">Description <span className="obligatoire">*</span></label>
          <textarea id="description" name="description" required minLength={20} maxLength={3000} rows={6} defaultValue={annonce?.description} />
          <span className="aide">N'indiquez ni votre nom, ni votre adresse, ni votre téléphone : votre annonce est publiée sous votre code.</span>
        </div>

        {nature === "SERVICE" && (
          <div className="champ" style={{ marginTop: "1rem" }}>
            <span className="champ-libelle">Durée estimée (facultatif)</span>
            <div className="sel-duree">
              <input name="dureeHeures" type="number" min="0" max="24" defaultValue={h} aria-label="Heures" /> h
              <input name="dureeMinutes" type="number" min="0" max="59" step="5" defaultValue={m} aria-label="Minutes" /> min
            </div>
            <span className="aide">1 minute = 1 brique. La durée réelle est convenue entre vous.</span>
          </div>
        )}
        {nature === "OBJET" && (
          <div className="champ" style={{ marginTop: "1rem" }}>
            <label htmlFor="valeurBriques">Valeur en briques <span className="obligatoire">*</span></label>
            <input id="valeurBriques" name="valeurBriques" type="number" min="0" max="1440" required defaultValue={annonce?.valeurBriques ?? ""} />
            <span className="aide">Fixée par celui qui propose l'objet, négociable dans la messagerie avant l'échange.</span>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>Où et quand ?</legend>
        <div className="champs">
          <div className="champ">
            <label htmlFor="zone">Commune ou secteur <span className="obligatoire">*</span></label>
            <input id="zone" name="zone" type="text" required minLength={2} maxLength={60} defaultValue={annonce?.zone ?? zoneParDefaut} />
            <span className="aide">Jamais d'adresse précise.</span>
          </div>
          <div className="champ">
            <label htmlFor="modalite">Modalité <span className="obligatoire">*</span></label>
            <select id="modalite" name="modalite" required defaultValue={annonce?.modalite ?? "PRESENTIEL"}>
              <option value="PRESENTIEL">En personne</option>
              <option value="DISTANCE">À distance possible (visio, téléphone…)</option>
            </select>
          </div>
        </div>
        <div className="champs" style={{ marginTop: "1rem" }}>
          <div className="champ">
            <label htmlFor="disponibilites">Disponibilités (facultatif)</label>
            <input id="disponibilites" name="disponibilites" type="text" maxLength={300} defaultValue={annonce?.disponibilites ?? ""} placeholder="Ex. : le samedi matin" />
          </div>
          <div className="champ">
            <label htmlFor="dateFin">Annonce valable jusqu'au (facultatif)</label>
            <input id="dateFin" name="dateFin" type="date" defaultValue={annonce?.dateFin ? new Date(annonce.dateFin).toISOString().slice(0, 10) : ""} />
          </div>
        </div>
        <div className="champ" style={{ marginTop: "1rem" }}>
          <label htmlFor="motsCles">Mots-clés (facultatif)</label>
          <input id="motsCles" name="motsCles" type="text" maxLength={200} defaultValue={annonce?.motsCles ?? ""} placeholder="Ex. : perceuse, étagère" />
        </div>
      </fieldset>

      <div className="actions">
        <BoutonEnvoi enCours="Publication…">{annonce ? "Enregistrer les modifications" : "Publier l'annonce"}</BoutonEnvoi>
      </div>
    </form>
  );
}
