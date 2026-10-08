import TexteSimple from "@/components/TexteSimple";
import { peutEditerSite } from "@/lib/auth";
import { BLOCS, getInfosModification } from "@/lib/contenus";
import EditeurBloc from "./EditeurBloc";

// Affiche un bloc de texte du site. Pour un administrateur connecté, ajoute le crayon ✏️ d'édition sur place.
// `texte` vient de getContenus() ; `ligne` pour une valeur courte (téléphone, e-mail).
export default async function BlocEditable({ cle, texte, className, ligne = false }) {
  const affichage = ligne ? <span className={className}>{texte}</span> : <TexteSimple texte={texte} className={className} />;
  if (!(await peutEditerSite())) return affichage;

  const bloc = BLOCS.find((b) => b.cle === cle);
  const modifie = await getInfosModification(cle);
  return (
    <EditeurBloc cle={cle} texte={texte} libelle={bloc?.libelle ?? cle} ligne={ligne} modifie={modifie}>
      {affichage}
    </EditeurBloc>
  );
}
