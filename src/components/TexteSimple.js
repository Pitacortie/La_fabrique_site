// Affiche un texte saisi dans la console : une ligne vide = nouveau paragraphe, un retour à la ligne = <br>.
// Aucun HTML n'est interprété (protection XSS, section 11.1).
export default function TexteSimple({ texte, className }) {
  const paragraphes = (texte ?? "").split(/\n\s*\n/).filter((p) => p.trim());
  return paragraphes.map((p, i) => (
    <p key={i} className={className}>
      {p.split("\n").map((ligne, j) => (
        <span key={j}>
          {j > 0 && <br />}
          {ligne}
        </span>
      ))}
    </p>
  ));
}
