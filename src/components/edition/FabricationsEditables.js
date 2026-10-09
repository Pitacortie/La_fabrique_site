"use client";

import { useState } from "react";
import FabricationCard from "@/components/FabricationCard";
import FormulaireFabrication from "./FormulaireFabrication";

// Cartes « Nos Fabrications » en mode édition : crayon sur chaque carte, carte « Ajouter un service ».
// Les formulaires sont rendus dès le départ (masqués) : le crayon ne fait que les afficher.
export default function FabricationsEditables({ fabrications }) {
  const [enEdition, setEnEdition] = useState(null); // id du service, « nouveau » ou null
  const fermer = () => setEnEdition(null);

  return (
    <div className="grille">
      {fabrications.map((f) => (
        <div key={f.id}>
          <div hidden={enEdition === f.id} className={`editable${f.visible ? "" : " editable-masque"}`}>
            <FabricationCard fabrication={f} />
            {!f.visible && <span className="badge badge-terracotta editable-etiquette">Masqué : invisible au public</span>}
            <button type="button" className="crayon" onClick={() => setEnEdition(f.id)} aria-label={`Modifier le service ${f.nom}`} title="Modifier ce service">
              ✏️
            </button>
          </div>
          <div hidden={enEdition !== f.id}>
            <FormulaireFabrication fabrication={f} onTermine={fermer} />
          </div>
        </div>
      ))}
      <div>
        <button type="button" hidden={enEdition === "nouveau"} className="carte carte-ajout crayon-seul" onClick={() => setEnEdition("nouveau")}>
          ＋ Ajouter un service
        </button>
        <div hidden={enEdition !== "nouveau"}>
          <FormulaireFabrication onTermine={fermer} />
        </div>
      </div>
    </div>
  );
}
