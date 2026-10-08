"use client";

import { useFormStatus } from "react-dom";

// Bouton de formulaire qui se désactive pendant l'envoi. `name`/`value` permettent plusieurs actions par formulaire.
export default function BoutonEnvoi({ children, enCours = "Enregistrement…", className = "bouton", ...props }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} {...props}>
      {pending ? enCours : children}
    </button>
  );
}
