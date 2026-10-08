"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";
import { enregistrerFabrication, supprimerFabrication } from "@/app/actions/fabrications";

const COULEURS = [
  { valeur: "bleu", libelle: "Bleu rivière" },
  { valeur: "terracotta", libelle: "Terracotta" },
  { valeur: "vert", libelle: "Vert forêt" },
  { valeur: "ocre", libelle: "Ocre doré" },
];

// Formulaire d'un service, ouvert depuis le crayon d'une carte (ou « Ajouter un service ») sur l'accueil.
export default function FormulaireFabrication({ fabrication, onTermine }) {
  const formRef = useRef(null);
  const [etat, action] = useActionState(enregistrerFabrication, null);
  useEffect(() => {
    if (!etat?.ok) return;
    if (etat.cree) formRef.current?.reset();
    onTermine?.();
  }, [etat]); // eslint-disable-line react-hooks/exhaustive-deps
  const [confirmer, setConfirmer] = useState(false);
  const f = fabrication ?? { nom: "", description: "", etat: "À venir", couleur: "bleu", lien: "", ordre: 0, visible: true };
  const p = fabrication ? fabrication.id : "nouveau";

  return (
    <div className={`carte carte-${f.couleur} bloc-edition`}>
      <form ref={formRef} action={action}>
        {fabrication && <input type="hidden" name="id" value={fabrication.id} />}
        <div className="champs">
          <div className="champ">
            <label htmlFor={`${p}-nom`}>Nom du service</label>
            <input id={`${p}-nom`} name="nom" type="text" defaultValue={f.nom} required maxLength={80} />
          </div>
          <div className="champ">
            <label htmlFor={`${p}-etat`}>État affiché</label>
            <input id={`${p}-etat`} name="etat" type="text" defaultValue={f.etat} required maxLength={40} list={`${p}-etats`} />
            <datalist id={`${p}-etats`}>
              {["Ouvert", "Ouverture prochaine", "À venir", "Idée"].map((e) => <option key={e} value={e} />)}
            </datalist>
          </div>
          <div className="champ">
            <label htmlFor={`${p}-couleur`}>Couleur</label>
            <select id={`${p}-couleur`} name="couleur" defaultValue={f.couleur}>
              {COULEURS.map((c) => (
                <option key={c.valeur} value={c.valeur}>{c.libelle}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="champ" style={{ marginTop: "1rem" }}>
          <label htmlFor={`${p}-description`}>Description</label>
          <textarea id={`${p}-description`} name="description" defaultValue={f.description} required maxLength={600} rows={3} />
        </div>
        <div className="champs" style={{ marginTop: "1rem" }}>
          <div className="champ">
            <label htmlFor={`${p}-lien`}>Lien (facultatif)</label>
            <input id={`${p}-lien`} name="lien" type="text" defaultValue={f.lien ?? ""} placeholder="/sel" maxLength={300} />
          </div>
          <div className="champ">
            <label htmlFor={`${p}-ordre`}>Ordre d'affichage</label>
            <input id={`${p}-ordre`} name="ordre" type="number" min="0" max="999" defaultValue={f.ordre} />
          </div>
        </div>
        <label className="case">
          <input type="checkbox" name="visible" defaultChecked={f.visible} />
          <span>Visible sur le site</span>
        </label>
        <div className="actions" style={{ marginTop: "1rem" }}>
          <BoutonEnvoi>{fabrication ? "Enregistrer" : "Ajouter le service"}</BoutonEnvoi>
          {onTermine && (
            <button type="button" className="bouton bouton-secondaire" onClick={() => { formRef.current?.reset(); onTermine(); }}>
              Annuler
            </button>
          )}
        </div>
        <Retour etat={etat?.erreur ? etat : null} />
      </form>

      {fabrication && (
        <form action={supprimerFabrication} className="actions" style={{ marginTop: "0.75rem" }}>
          <input type="hidden" name="id" value={fabrication.id} />
          {confirmer ? (
            <>
              <span className="meta">Supprimer définitivement « {f.nom} » ?</span>
              <BoutonEnvoi className="bouton bouton-danger" enCours="Suppression…">Oui, supprimer</BoutonEnvoi>
              <button type="button" className="bouton bouton-secondaire" onClick={() => setConfirmer(false)}>Annuler</button>
            </>
          ) : (
            <button type="button" className="lien-danger" onClick={() => setConfirmer(true)}>Supprimer ce service</button>
          )}
        </form>
      )}
    </div>
  );
}
