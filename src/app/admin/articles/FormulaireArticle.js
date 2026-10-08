"use client";

import { useActionState } from "react";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";
import { enregistrerArticle } from "./actions";

const CATEGORIES = ["Événement", "Atelier", "Solidarité", "Vie associative"];

export default function FormulaireArticle({ article, dateActivite }) {
  const [etat, action] = useActionState(enregistrerArticle, null);
  const statut = article?.statut ?? "BROUILLON";

  return (
    <form action={action} className="formulaire formulaire-large">
      {article && <input type="hidden" name="id" value={article.id} />}
      <Retour etat={etat} />
      <fieldset>
        <legend>Article</legend>
        <div className="champ">
          <label htmlFor="titre">Titre <span className="obligatoire">*</span></label>
          <input id="titre" name="titre" type="text" defaultValue={article?.titre} required maxLength={150} />
        </div>
        <div className="champs" style={{ marginTop: "1rem" }}>
          <div className="champ">
            <label htmlFor="categorie">Catégorie <span className="obligatoire">*</span></label>
            <input id="categorie" name="categorie" type="text" list="categories-article" defaultValue={article?.categorie ?? "Événement"} required maxLength={40} />
            <datalist id="categories-article">
              {CATEGORIES.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="champ">
            <label htmlFor="dateActivite">Date de l'activité <span className="obligatoire">*</span></label>
            <input id="dateActivite" name="dateActivite" type="date" defaultValue={dateActivite} required />
            <span className="aide">Après cette date, l'activité passe automatiquement en « passée ».</span>
          </div>
        </div>
        <div className="champ" style={{ marginTop: "1rem" }}>
          <label htmlFor="extrait">Résumé (affiché sur les cartes)</label>
          <textarea id="extrait" name="extrait" defaultValue={article?.extrait ?? ""} maxLength={300} rows={2} />
        </div>
        <div className="champ" style={{ marginTop: "1rem" }}>
          <label htmlFor="contenu">Texte <span className="obligatoire">*</span></label>
          <textarea id="contenu" name="contenu" defaultValue={article?.contenu ?? ""} required maxLength={20000} rows={12} />
          <span className="aide">Une ligne vide sépare deux paragraphes. Contenu factuel et non partisan (charte, principe 6).</span>
        </div>
      </fieldset>

      <div className="actions">
        {statut === "PUBLIE" ? (
          <>
            <BoutonEnvoi name="intention" value="enregistrer">Enregistrer les modifications</BoutonEnvoi>
            <BoutonEnvoi name="intention" value="retirer" className="bouton bouton-secondaire" enCours="Retrait…">Retirer du site</BoutonEnvoi>
          </>
        ) : (
          <>
            <BoutonEnvoi name="intention" value="brouillon" className="bouton bouton-secondaire">
              {article ? "Enregistrer le brouillon" : "Créer le brouillon"}
            </BoutonEnvoi>
            {article && (
              <BoutonEnvoi name="intention" value="publier" className="bouton bouton-vert" enCours="Publication…">Publier</BoutonEnvoi>
            )}
          </>
        )}
      </div>
      {!article && <p className="refs">Les photos s'ajoutent une fois le brouillon créé.</p>}
    </form>
  );
}
