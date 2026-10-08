"use client";

import { useState } from "react";
import FabricationCard from "@/components/FabricationCard";
import FormulaireFabrication from "./FormulaireFabrication";

// Cartes « Nos Fabrications » en mode édition : crayon sur chaque carte, carte « Ajouter un service ».
export default function FabricationsEditables({ fabrications }) {
  const [enEdition, setEnEdition] = useState(null); // id du service, « nouveau » ou null

  return (
    <div className="grille">
      {fabrications.map((f) =>
        enEdition === f.id ? (
          <FormulaireFabrication key={f.id} fabrication={f} onTermine={() => setEnEdition(null)} />
        ) : (
          <div key={f.id} className={`editable${f.visible ? "" : " editable-masque"}`}>
            <FabricationCard fabrication={f} />
            {!f.visible && <span className="badge badge-terracotta editable-etiquette">Masqué : invisible au public</span>}
            <button type="button" className="crayon" onClick={() => setEnEdition(f.id)} aria-label={`Modifier le service ${f.nom}`} title="Modifier ce service">
              ✏️
            </button>
          </div>
        ),
      )}
      {enEdition === "nouveau" ? (
        <FormulaireFabrication onTermine={() => setEnEdition(null)} />
      ) : (
        <button type="button" className="carte carte-ajout crayon-seul" onClick={() => setEnEdition("nouveau")}>
          ＋ Ajouter un service
        </button>
      )}
    </div>
  );
}
