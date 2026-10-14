"use client";

import { useActionState, useEffect, useRef } from "react";
import BoutonEnvoi from "@/components/BoutonEnvoi";
import Retour from "@/components/Retour";
import { ajouterPhoto, supprimerPhoto } from "./actions";

export default function Photos({ articleId, medias }) {
  const formRef = useRef(null);
  const [etat, action] = useActionState(ajouterPhoto, null);
  useEffect(() => {
    if (etat?.ok) formRef.current?.reset();
  }, [etat]);

  return (
    <section className="section-admin">
      <h2>Galerie photo ({medias.length})</h2>

      {medias.length > 0 && (
        <div className="galerie-admin">
          {medias.map((m) => (
            <figure key={m.id} className="carte">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={m.texteAlternatif ?? ""} />
              <figcaption>
                {m.texteAlternatif && <p className="meta">{m.texteAlternatif}</p>}
                {m.legende && <p>{m.legende}</p>}
                {m.credit && <p className="meta">© {m.credit}</p>}
                <div className="actions">
                  <form action={supprimerPhoto}>
                    <input type="hidden" name="id" value={m.id} />
                    <BoutonEnvoi className="lien-danger" enCours="Suppression…">Supprimer</BoutonEnvoi>
                  </form>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <form ref={formRef} action={action} className="formulaire formulaire-large">
        <input type="hidden" name="articleId" value={articleId} />
        <fieldset>
          <legend>Ajouter une photo</legend>
          <div className="champ">
            <label htmlFor="fichier">Image (JPEG, PNG ou WebP, 10 Mo max) <span className="obligatoire">*</span></label>
            <input id="fichier" name="fichier" type="file" accept="image/jpeg,image/png,image/webp" required />
            <span className="aide">Elle est redimensionnée et compressée automatiquement.</span>
          </div>
          <div className="champ" style={{ marginTop: "1rem" }}>
            <label htmlFor="texteAlternatif">Texte alternatif (facultatif)</label>
            <input id="texteAlternatif" name="texteAlternatif" type="text" maxLength={300}
              placeholder="Ex. : Des habitants plantent des salades au jardin partagé" />
            <span className="aide">Décrit la photo pour les personnes qui ne la voient pas (accessibilité).</span>
          </div>
          <div className="champs" style={{ marginTop: "1rem" }}>
            <div className="champ">
              <label htmlFor="legende">Légende</label>
              <input id="legende" name="legende" type="text" maxLength={300} />
            </div>
            <div className="champ">
              <label htmlFor="credit">Crédit photo</label>
              <input id="credit" name="credit" type="text" maxLength={100} />
            </div>
          </div>
          <p className="meta">
            Avant la prise de vue, demandez l'accord des personnes photographiées. Le choix de droit à l'image de chaque
            membre figure dans sa fiche ; une photo peut être retirée à tout moment sur demande.
          </p>
        </fieldset>
        <div className="actions">
          <BoutonEnvoi enCours="Import en cours…">Ajouter la photo</BoutonEnvoi>
        </div>
        <Retour etat={etat} />
      </form>
    </section>
  );
}
