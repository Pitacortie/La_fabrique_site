"use client";

import { useFormStatus } from "react-dom";

// Bouton de formulaire qui se désactive pendant l'envoi. `name`/`value` permettent plusieurs actions par formulaire.
// Quand React envoie le formulaire, il n'y joint pas toujours la valeur du bouton cliqué : on la recopie donc
// dans un champ caché juste avant l'envoi (sans JavaScript, le navigateur l'envoie lui-même).
export default function BoutonEnvoi({ children, enCours = "Enregistrement…", className = "bouton", onClick, ...props }) {
  const { pending } = useFormStatus();
  const { name, value } = props;
  const noterChoix = (e) => {
    const form = e.currentTarget.form;
    if (name && form) {
      let cache = form.querySelector(`input[type="hidden"][data-bouton="${name}"]`);
      if (!cache) {
        cache = document.createElement("input");
        cache.type = "hidden";
        cache.name = name;
        cache.dataset.bouton = name;
        form.appendChild(cache);
      }
      cache.value = value ?? "";
    }
    onClick?.(e);
  };
  return (
    <button type="submit" className={className} disabled={pending} onClick={noterChoix} {...props}>
      {pending ? enCours : children}
    </button>
  );
}
