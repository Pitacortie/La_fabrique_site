"use client";

import { useRef, useState } from "react";

// ACT-5 : grille de vignettes, agrandissement au clic, légende et crédit.
export default function Galerie({ medias }) {
  const dialogRef = useRef(null);
  const [index, setIndex] = useState(0);
  const m = medias[index];

  function ouvrir(i) {
    setIndex(i);
    dialogRef.current?.showModal();
  }
  const suivant = (pas) => setIndex((i) => (i + pas + medias.length) % medias.length);

  return (
    <>
      <div className="galerie">
        {medias.map((media, i) => (
          <button key={media.id} type="button" className="galerie-vignette" onClick={() => ouvrir(i)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={media.url} alt={media.texteAlternatif} loading="lazy" />
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        className="visionneuse"
        aria-label="Photo agrandie"
        onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") suivant(1);
          if (e.key === "ArrowLeft") suivant(-1);
        }}
      >
        {m && (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.url} alt={m.texteAlternatif} />
            {(m.legende || m.credit) && (
              <figcaption>
                {m.legende}
                {m.credit && <span className="meta"> © {m.credit}</span>}
              </figcaption>
            )}
          </figure>
        )}
        <div className="actions visionneuse-actions">
          {medias.length > 1 && (
            <>
              <button type="button" className="bouton bouton-secondaire" onClick={() => suivant(-1)}>← Précédente</button>
              <button type="button" className="bouton bouton-secondaire" onClick={() => suivant(1)}>Suivante →</button>
            </>
          )}
          <button type="button" className="bouton" onClick={() => dialogRef.current?.close()}>Fermer</button>
        </div>
      </dialog>
    </>
  );
}
